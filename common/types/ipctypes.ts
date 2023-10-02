// Code generated by tygo. DO NOT EDIT.
import type {DriverStation} from "./types"
//////////
// source: alliancestationstatus.go

export interface AllianceStationStatus {
  dsConnected: boolean;
  radioConnected: boolean;
  robotConnected: boolean;
  enabled: boolean;
  isAuto: boolean;
  isTempStopped: boolean;
  tripTime: number /* int */;
  missedPackets: number /* int */;
  bypassed: boolean;
  battery: number /* float64 */;
  isEstopped: boolean;
  estopActive: boolean;
  assignedTeam: number /* int */;
}

//////////
// source: ipc_message.go

export interface IPCMessage {
  cmd: string;
  data: IPCData;
}
export interface IPCData {
  match?: Match;
  teamId?: number /* int */;
  usageReport?: string;
  alliancestation?: DriverStation;
  ds_status?: { [key in DriverStation]: AllianceStationStatus};
}

//////////
// source: match.go

export interface Match {
  id: string;
  matchNumber: number /* int */;
  elimRound: number /* int */;
  elimGroup: number /* int */;
  elimInstance: number /* int */;
  type: 'qualification'|'elimination';
  red1: number /* int */;
  red2: number /* int */;
  red3: number /* int */;
  blue1: number /* int */;
  blue2: number /* int */;
  blue3: number /* int */;
}

//////////
// source: team.go

export interface Team {
  id: number /* int */;
}
