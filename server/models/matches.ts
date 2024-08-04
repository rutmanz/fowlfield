
import { MatchData, PartialMatch } from '~common/types';
import * as db from "./db";
import * as matchmanager from "../managers/matchmanager"


export class DBMatch {
    get id() {return this.data.id}
    
    get redScoreBreakdown() {return this.data.redScoreBreakdown}
    set redScoreBreakdown(value) {this.update({id:this.data.id, redScoreBreakdown:value})}

    get blueScoreBreakdown() {return this.data.blueScoreBreakdown}
    set blueScoreBreakdown(value) {this.update({id:this.data.id, blueScoreBreakdown:value})}
    
    get type() {return this.data.type}
    set type(value) {this.update({id:this.data.id, type:value})}
    get matchNumber() {return this.data.matchNumber}
    set matchNumber(value) {this.update({id:this.data.id, matchNumber:value})}
    get elimRound() {return this.data.elimRound}
    set elimRound(value) {this.update({id:this.data.id, elimRound:value})}
    get elimGroup() {return this.data.elimGroup}
    set elimGroup(value) {this.update({id:this.data.id, elimGroup:value})}
    get elimInstance() {return this.data.elimInstance}
    set elimInstance(value) {this.update({id:this.data.id, elimInstance:value})}
    
    
    get redAlliance() {return this.data.redAlliance}
    set redAlliance(value) {this.update({id:this.data.id, redAlliance:value})}
    get blueAlliance() {return this.data.blueAlliance}
    set blueAlliance(value) {this.update({id:this.data.id, blueAlliance:value})}

    get red1() {return this.data.red1}
    set red1(value) {this.update({id:this.data.id, red1:value})}
    get red2() {return this.data.red2}
    set red2(value) {this.update({id:this.data.id, red2:value})}
    get red3() {return this.data.red3}
    set red3(value) {this.update({id:this.data.id, red3:value})}
    get blue1() {return this.data.blue1}
    set blue1(value) {this.update({id:this.data.id, blue1:value})}
    get blue2() {return this.data.blue2}
    set blue2(value) {this.update({id:this.data.id, blue2:value})}
    get blue3() {return this.data.blue3}
    set blue3(value) {this.update({id:this.data.id, blue3:value})}

    get startTime() {return this.data.startTime}
    set startTime(value) {this.update({id:this.data.id, startTime:value})}

    get state() {return this.data.state}
    set state(value) {this.update({id:this.data.id, state:value})}

    get redCards() {return this.data.redCards}
    set redCards(value) {this.update({id:this.data.id, redCards:value})}
    get blueCards() {return this.data.blueCards}
    set blueCards(value) {this.update({id:this.data.id, blueCards:value})}

    constructor(private data:MatchData){}
    


    getData() {
        return this.data;
    }

    update(data:PartialMatch) {
        Object.assign(this.data, data)
        matchmanager.notifyMatchUpdated(this)
        db.updateMatch(data)
    }
}