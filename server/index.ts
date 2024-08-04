import {
    DriverStation,
    DSStatuses,
    ExtendedDsStatus,
    ExtendedDsStatuses,
    RobotHitState,
    StackLightColor,
    StackLightState
} from '~common/types';
import * as http from 'http';
import rootLogger from '~/logger';
import {DBSettings} from '~/models/settings';
import {hitmanager, matchmanager, statusmanager, teammanager} from "~/managers";
import * as tba from "~/tba";
import * as db from "./models/db";
import startSockets from "./sockets";


function createStatus() {
    return  {dsConnected: true,
    radioConnected: true,
    robotConnected: true,
    enabled: true,
    isAuto: true,
    isTempStopped: false,
    tripTime: 0 /* int */,
    missedPackets: 0, /* int */
    bypassed: false,
    battery: 0 /* float64 */,
    isEstopped: false,
    estopActive: false,
    hardwareEstopPressed: false,
    hardwareEstopOnline: false,
    assignedTeam: 0 /* int */
    }
}
let driverStatuses:ExtendedDsStatuses = {
    "B1": createStatus(),
    B2: createStatus(),
    B3: createStatus(),
    R1: createStatus(),
    R2: createStatus(),
    R3: createStatus(),
}

const server = http.createServer()
export const isProduction = process.env.NODE_ENV === "production"




let socketCallbacks:{
    emitDsStatus:(data:DSStatuses) => void,
    setLight:(color:StackLightColor, state:StackLightState) => void,
    pollEstopHosts:() => Promise<void>
    emitHitStatus:(station: DriverStation, state: RobotHitState) => void
};

let registerDSStatus: (data:DSStatuses) => ExtendedDsStatuses
async function configure() {
    await db.connect()
    await DBSettings.getInstance()
    await matchmanager.loadMatches()
    await teammanager.loadTeams()
    
    
    socketCallbacks = await startSockets(server)
    registerDSStatus = statusmanager.configure(socketCallbacks.setLight, socketCallbacks.pollEstopHosts).registerDSStatus
    hitmanager.configureHitManager(socketCallbacks.emitHitStatus)
    // await tba.reset("match") // TODO: Remove this when teams are finalized
    await tba.updateEventTeams()
    await tba.updateAlliances()
    await tba.updateMatches()
    await tba.updateRankings()

}

function isNewStatus(a:ExtendedDsStatus, b:ExtendedDsStatus) {
    const properties:(keyof ExtendedDsStatus)[] = ["bypassed", "dsConnected", "enabled", "isAuto", "isEstopped", "radioConnected", "robotConnected", "hardwareEstopOnline", "estopActive", "hardwareEstopPressed"]
    return !properties.every((property) => a[property] == b[property])
}

function areNewStatuses(data:ExtendedDsStatuses) {
    if (driverStatuses == null) {return true}
    return Object.keys(data).some((key) => isNewStatus(data[key], driverStatuses[key]))
}



let lastSentTime = Date.now()
function handleDSStatus(data:DSStatuses) {
    const extendedData = registerDSStatus(data)
    const currentTime = Date.now()
    if (areNewStatuses(extendedData) || currentTime-lastSentTime > 2_000) {
        lastSentTime = currentTime;
        socketCallbacks.emitDsStatus(extendedData)
    }
    driverStatuses = extendedData
    
}

export function getDsStatus() {
    return driverStatuses
}


configure()



rootLogger.log("starting node")

server.listen(3000)