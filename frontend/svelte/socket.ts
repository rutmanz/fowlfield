
import { io, type Socket } from "socket.io-client";
import { getCookie, setCookie} from 'typescript-cookie';
import { backend_url } from "../consts.json";

import {  updateCurrentMatch, updateMatchStores } from './store';
import { ClientToServerEvents, ServerToClientEvents } from '../../types/ws_types';



export const socket:Socket<ServerToClientEvents, ClientToServerEvents> = io(backend_url || window.location.origin, {
    auth: {
        key: getCookie("auth")
    },
    autoConnect:false
})


socket.on("match", updateMatchStores)
socket.on("setMatch", updateCurrentMatch)
// socket.on("matchData", (data) => {
//     updateMatchData(data)
// })

// socket.on("matchStart", (data) => {
//     timer.startWithTime(data.matchStartTime)
// })
// socket.on("matchEnd", updateMatchData)

socket.on("disconnect", (reason) => {
    console.log(reason)
    if (reason == "io server disconnect") {
        setCookie("auth", prompt("Input your key"))
        window.location.reload()
    }
})


socket.connect()