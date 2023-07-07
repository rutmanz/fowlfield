export type TbaEventInfo = {
    first_code?:string|null
    playoff_type?:TbaPlayoffType
    webcasts?:{url:string}[]
    remap_teams: {[key:string]:string}
}
export type TbaTeamNumber = string;
export interface TbaMatch {
    comp_level: "qm"|"ef"|"qf"|"sf"|"f"
    set_number: number;
    match_number: number;
    alliances: { [key in "red" | "blue"]: TbaAlliance};
    score_breakdown?: { [key in "red"|"blue"]: { [key: string]: any}};
    time_string?: string;
    time_utc?: string;
    display_name?: string;
}
export class TbaAlliance {
    teams: TbaTeamNumber[] = [];
    surrogates: TbaTeamNumber[] = [];
    dqs: string[] = [];
    score?: number;
    
    constructor(team1:number,team2:number, team3:number, score?:number) {
        if (team1 != 0) {this.teams.push("frc"+team1)}
        if (team2 != 0) {this.teams.push("frc"+team2)}
        if (team3 != 0) {this.teams.push("frc"+team3)}
        this.score = score;
    }
}
export type TbaPlayoffAlliances = TbaTeamNumber[][]
export interface TbaRanking {
    team_key: TbaTeamNumber;
    rank: number;
    wins: number;
    losses: number;
    ties: number;
    dqs: number;
    played: number;
}

export interface TbaRankings {
    breakdowns: string[];
    rankings: TbaRanking[];
}



export enum TbaPlayoffType {
// Standard Brackets
BRACKET_16_TEAM = 1,
BRACKET_8_TEAM = 0,
BRACKET_4_TEAM = 2,
BRACKET_2_TEAM = 9,

// 2015 is special
AVG_SCORE_8_TEAM = 3,

// Round Robin
ROUND_ROBIN_6_TEAM = 4,

// Double Elimination Bracket
// The legacy style is just a basic internet bracket
// https://www.printyourbrackets.com/fillable-brackets/8-seeded-double-fillable.pdf
LEGACY_DOUBLE_ELIM_8_TEAM = 5,
// The "regular" style is the one that FIRST plans to trial for the 2023 season
// https://www.firstinspires.org/robotics/frc/blog/2022-timeout-and-playoff-tournament-updates
DOUBLE_ELIM_8_TEAM = 10,
// The bracket used for districts with four divisions
DOUBLE_ELIM_4_TEAM = 11,

// Festival of Champions
BO5_FINALS = 6,
BO3_FINALS = 7,

// Custom
CUSTOM = 8,
}