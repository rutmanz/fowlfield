import config from "~common/config"
import mongoDB from "mongodb"
import { DBMatch } from "./matches";
import { Card, ExtendedTeam, MatchData, PartialMatch, PartialTeam, TeamData } from '~common/types';
import { DBSettings, Settings } from "~/models/settings";
import { DBTeam, buildStats } from "~/models/teams";
import rootLogger from "~/logger";
import { UsageReportingOutput } from "~/usageReport";

const logger = rootLogger.getLogger("DB")
const mongoURL = `mongodb://${config.mongo.username}:${config.mongo.password}@127.0.0.1:27017/${config.mongo.database}`
const mongoClient = new mongoDB.MongoClient(mongoURL);

let teams: mongoDB.Collection<TeamData>;
let matches: mongoDB.Collection<MatchData>;
let settings: mongoDB.Collection<{ key: string, value: Settings[keyof Settings] }>;
let reporting: mongoDB.Collection<{ team: number, raw:string, report:UsageReportingOutput}>;

export async function connect() {
    await mongoClient.connect()
    teams = mongoClient.db().collection<TeamData>("teams");
    teams.createIndex({ id: 1 }, { unique: true })
    teams.createIndex({ alliance: 1 }, { unique: false })
    matches = mongoClient.db().collection<MatchData>("matches");
    matches.createIndex({ id: 1 }, { unique: true })
    settings = mongoClient.db().collection("settings");
    settings.createIndex({ key: 1 }, { unique: true })
    reporting = mongoClient.db().collection("reporting");
    reporting.createIndex({ team: 1 }, { unique: true })
}

export async function getMatches(): Promise<{ [key: string]: DBMatch }> {
    let result: { [key: string]: DBMatch } = {}
    for await (const match of matches.find()) {
        result[match.id] = new DBMatch(match as unknown as MatchData)
    }
    return result
}

export async function getTeamMatches(team: number): Promise<Pick<ExtendedTeam, "matchStats">> {
    
    let stats = {
        win: 0,
        loss: 0,
        tie: 0,
        rp: 0,
        avg_score:0
    }
    for await (const match of matches.find({ $or: [{ red1: team }, { red2: team }, { red3: team }, { blue1: team }, { blue2: team }, { blue3: team }] })) {
        let isRed = false;
        let card = Card.NONE;
        switch (team) {
            case match.red1: 
                isRed = true;
                card = match.redCards[0];
                break;
            case match.red2: 
                isRed = true;
                card = match.redCards[1];
                break;
            case match.red3: 
                isRed = true;
                card = match.redCards[2];
                break;
            case match.blue1: 
                isRed = false;
                card = match.blueCards[0];
                break;
            case match.blue2: 
                isRed = false;
                card = match.blueCards[1];
                break;
            case match.blue3: 
                isRed = false;
                card = match.blueCards[2];
                break;
        }
        buildStats(match, isRed, card == Card.RED, stats)
    }
    return {
        matchStats: stats
    }
}

export async function getTeams(): Promise<{ [key: string]: DBTeam }> {
    let result: { [key: string]: DBTeam } = {}
    for await (const team of teams.find()) {
        result[team.id] = new DBTeam(team as unknown as TeamData)
    }
    return result
}
export async function updateSetting<K extends keyof Settings, T extends Settings[K]>(key: K, value: T) {
    const resp = await settings.replaceOne({ key }, { key, value }, { upsert: true })
    if (!resp.acknowledged) {
        logger.warn("Could not store setting", key, value)
    }
}

export async function readSettings() {
    const result: Settings = {
        loadedMatch: "",
        preloadedMatch: "",
        atLunch:false,
        lunchReturnTime:0
    }
    for await (const setting of settings.find()) {
        result[setting.key] = setting.value
    }
    return result
}
export async function updateMatch(match: PartialMatch) {
    const resp = await matches.updateOne({ id: match.id }, { $set: match })
    if (!resp.acknowledged) {
        logger.warn("Could not update match", match.id)
    }
}

export async function setMatch(match: MatchData) {
    const resp = await matches.replaceOne({ id: match.id }, match, { upsert: true })
    if (!resp.acknowledged) {
        logger.warn("Could not store match", match.id)
    }
}


export async function updateTeam(team: PartialTeam) {
    const resp = await teams.updateOne({ id: team.id }, { $set: team })
    if (!resp.acknowledged) {
        logger.warn("Could not update team", team.id)
    }
}

export async function setTeam(team: TeamData) {
    const resp = await teams.replaceOne({ id: team.id }, team, {upsert:true})
    if (!resp.acknowledged) {
        logger.warn("Could not update team", team.id)
    }
}

export async function deleteTeam(id:number) {
    const resp = await teams.deleteOne({ id: id })
    if (!resp.acknowledged) {
        logger.warn("Could not delete team", id)
    }
}

export async function recordUsageReport(team:number, raw:string,report:UsageReportingOutput) {
    const resp = await reporting.replaceOne({ team }, { team, raw, report }, {upsert:true})
    if (!resp.acknowledged) {
        logger.warn("Could not record usage report", team)
    }
}