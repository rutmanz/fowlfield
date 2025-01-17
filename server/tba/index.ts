import { MatchID } from '~common/types'
import { getMatchTitle } from '~common/utils'
import { calculatePointsBreakdown, getScores, sumBreakdownPoints } from '~common/utils/scores'
import axios from 'axios'
import crypto from 'crypto'
import { createLogger } from '~/logger'
import { getMatches } from '~/managers/matchmanager'
import { buildRankings, getTeams } from '~/managers/teammanager'
import config from '~common/config'
import { DisplayNumber, TbaAlliance, TbaEventInfo, TbaMatch, TbaPlayoffAlliances, TbaPlayoffType, TbaRanking, TbaRankings, TbaScoreBreakdown, TbaTeamNumber } from './types'
import prisma from '~/managers/db'
import { Match, Match_Results, Team } from '@prisma/client'

const logger = createLogger('tba')

const isEnabled = (config.tba.id ?? '') != '' && (config.tba.secret ?? '') != ''

const baseUrl = 'https://www.thebluealliance.com'

const http_client = axios.create({
    baseURL: baseUrl,
    headers: {
        'X-TBA-Auth-Id': config.tba.id
    }
})

function isTBATeamNumber(obj: unknown): obj is TbaTeamNumber {
    return typeof obj == 'string' && obj.startsWith('frc')
}
function getTBATeamNumber(teamNumber: DisplayNumber): TbaTeamNumber {
    return `frc${teamNumber}`
}

interface Endpoints {
    'info/update': TbaEventInfo
    'alliance_selections/update': TbaPlayoffAlliances
    'awards/update': never
    'matches/update': TbaMatch[]
    'matches/delete': MatchID[]
    'rankings/update': TbaRankings
    'team_list/update': TbaTeamNumber[]
    'media/add': never
}

async function post<E extends keyof Endpoints>(endpoint: E, body: Endpoints[E]): Promise<boolean> {
    const path = `/api/trusted/v1/event/${config.tba.event}/${endpoint}`
    const signature = crypto
        .createHash('md5')
        .update(config.tba.secret + path + JSON.stringify(body))
        .digest('hex')
    let response
    try {
        response = await http_client.post(path, body, {
            headers: {
                'X-TBA-Auth-Sig': signature
            }
        })
        logger.info(body, response.status, response.statusText, path)
        if (response.status == 200) {
            return true
        }
    } catch (e) {
        logger.error(e.response?.data, 'Request to', path, 'failed.')
    }
    return false
}

export async function updateEventInfo(teams: Team[] = Object.values(getTeams())) {
    const remap_teams = {}
    teams.forEach(({ id, display_number }) => {
        if (id.toString() != display_number && !display_number.endsWith('A')) {
            remap_teams[getTBATeamNumber(id)] = getTBATeamNumber(display_number as DisplayNumber)
        }
    })

    const body: TbaEventInfo = {
        first_code: null,
        webcasts: [
            // { url: "https://team1540.org/bunnybots" }
        ],
        playoff_type: TbaPlayoffType.DOUBLE_ELIM_4_TEAM,
        remap_teams
    }

    await post('info/update', body)
}

export async function updateEventTeams() {
    const teams = Object.values(getTeams())
    const body: TbaTeamNumber[] = teams.map(({ id }) => getTBATeamNumber(id))
    await post('team_list/update', body)
    await updateEventInfo(teams)
}

export async function updateAlliances(): Promise<boolean> {
    const alliances = await prisma.playoffAlliance.findMany({
        orderBy: { seed: 'asc' }
    })
    const body = alliances.map((alliance) => {
        const tbaAlliance = []
        alliance.captain && tbaAlliance.push(getTBATeamNumber(alliance.captain))
        alliance.first_pick && tbaAlliance.push(getTBATeamNumber(alliance.first_pick))
        alliance.second_pick && tbaAlliance.push(getTBATeamNumber(alliance.second_pick))
        alliance.third_pick && tbaAlliance.push(getTBATeamNumber(alliance.third_pick))
        return tbaAlliance
    })
    return await post('alliance_selections/update', body)
}

export async function reset(...fields: ('alliance' | 'team' | 'match' | 'ranking')[]) {
    if (fields.includes('alliance')) await post('alliance_selections/update', [])
    if (fields.includes('team')) await post('team_list/update', [])
    if (fields.includes('match'))
        await post(
            'matches/delete',
            Object.values(getMatches()).map((match) => match.id.toLowerCase() as any)
        )
    if (fields.includes('ranking')) await post('rankings/update', { breakdowns: [], rankings: [] })
}

export async function removeMatches(...ids: MatchID[]) {
    await post('matches/delete', ids)
}

export async function updateRankings() {
    const rankings = await buildRankings()
    const tba_rankings: TbaRanking[] = rankings.map((ranking, index) => ({
        'team_key': getTBATeamNumber(ranking.team),
        'rank': index + 1,
        'wins': ranking.match_stats.win,
        'losses': ranking.match_stats.loss,
        'ties': ranking.match_stats.tie,
        'played': ranking.match_stats.count,
        'qual_average': 0,
        'dqs': 0,
        'Ranking Score': ranking.match_stats.rp,
        'Avg Match': ranking.match_stats.avg_score
        // 'Avg Charge Station': -1,
        // 'Avg Auto': 0
    }))

    const body: TbaRankings = {
        breakdowns: ['Ranking Score', 'Avg Match', 'Avg Charge Station', 'Avg Auto'],
        rankings: tba_rankings
    }
    await post('rankings/update', body)
}
function matchToTBAMatch(match: Match): TbaMatch {
    const decodedMatchId = /(sf|qf|f)(\d+)m(\d+)/.exec(match.id)
    const { redScore, redRP, blueScore, blueRP } = getScores(match)
    const getTBAScoreBreakdown = ({ results, alliance, rp }: { results: Match_Results; alliance: 'red' | 'blue'; rp: number }): Partial<TbaScoreBreakdown> => {
        const points = calculatePointsBreakdown(results)[alliance]
        const totalPoints = sumBreakdownPoints(points)
        return {
            rp,
            teleopPoints: points.low_zone_balloon + points.low_zone_bunny + points.tote_balloons,
            coopertitionBonusAchieved: results.corral_empty,
            totalPoints: totalPoints,
            foulCount: results.fouls.filter((foul) => foul.isAgainstRed == (alliance == 'blue')).length,
            foulPoints: points.foul,
            adjustPoints: 0
        }
    }
    return {
        comp_level: match.type == 'qualification' ? 'qm' : (decodedMatchId[1] as any),
        set_number: match.type == 'qualification' ? 1 : parseInt(decodedMatchId[2]),
        match_number: match.type == 'qualification' ? match.stage_index : parseInt(decodedMatchId[3]),
        score_breakdown: {
            red: getTBAScoreBreakdown({
                results: match.scores,
                alliance: 'red',
                rp: redRP
            }),
            blue: getTBAScoreBreakdown({
                results: match.scores,
                alliance: 'blue',
                rp: blueRP
            })
        },
        alliances: {
            red: new TbaAlliance(match.red1, match.red2, match.red3, redScore),
            blue: new TbaAlliance(match.blue1, match.blue2, match.blue3, blueScore)
        },
        time_string: new Date(match.startTime).toLocaleTimeString('en-us', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'America/Los_Angeles'
        }),
        // time_utc: new Date(match.matchStartTime).toISOString(),
        // time_utc:"2008-01-02T10:30:00.000Z",
        display_name: getMatchTitle(match)
    }
}
export async function updateMatches() {
    const matches = await prisma.match.findMany({ where: { state: 'posted' } })
    console.log(matches)
    const data: TbaMatch[] = matches.map(matchToTBAMatch)
    // resetMatches(matches)
    console.log(data)
    await post('matches/update', data)
    await updateRankings()
}
export async function resetRankings() {
    const body: TbaRankings = {
        breakdowns: [],
        rankings: []
    }
    await post('rankings/update', body)
}
