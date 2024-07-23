import * as UnitData from "../data/main.js"

/*
  Unit IDs for UI 
*/ 
export const Units = {
  OPR : {}
}
Units.OPR.Objects = ["Objectives","Traps"]
for(let rules in UnitData){
  Units[rules] = Units[rules] || {}
  for(let faction in UnitData[rules]){
    Units[rules][faction] = UnitData[rules][faction].map(u => u.split("||")[0].split(" [")[0])
  }
}

/*
  Utility for processing OPR data 
*/
const rollCount = (nd,val) => chance.rpg(nd+"d6").filter(r=>r>=val).length
const rm = (str,r)=>str.replace(r, "")
const rmToNum = (str,r) => Number(rm(str,r))

const EQSPECIAL = ["AP","Blast","Deadly","Impact"] 
//determine all the attributes of the equipment 
const eqData = (arr) => {
  let res = {
    A : 1,
    range : 1,
    tags : [],
  }
  //look for tags and update attributes 
  arr.forEach(d => {
    if(d.includes('"')) {
      res.range = Number(d.slice(0,-1))
    }
    else if(d.includes('AP')){
      res.AP = Number(d.slice(3,-1))
    }
    else if(d.includes('Blast')){
      res.Blast = Number(d.slice(6,-1))
    }
    else if(d.includes('Deadly')){
      res.Deadly = Number(d.slice(7,-1))
    }
    else if (d.charAt(0) == "A") {
      res.A = Number(d.slice(1))
    }
    else {
      res.tags.push(d)
    }
  })
  return res
}
//set equipment object 
const setEq = (_eq,nu) => {
  return _eq.split("; ").map(e=> {
    let [_id,d] = e.split(" (")
    //look for multiple attacks 
    let [n,id] = _id.includes("x ") ? _id.split("x ") : [1,_id]
    //fill out attributes 
    let data = eqData(d.slice(0,-1).split(", "))
    data.n = Number(n)/nu
    data.sp = " ("+d
    //return 
    return [id,data]
  })
}

//looking for special rules with numbers 
const SPECIALNUMBERS = ["Caster","Tough","Fear","Transport","Explode","Surprise Attack"]

const SavedToUnitData = async (U,uid) =>{
  //pull from db - has most data 
  let unit = await U.app.db.Units.getItem(uid.split(".")[1])
  //formated saved into js objects 
  unit.eq = setEq(unit._eq,unit.n)
  let sp = unit.sp = unit._sp.split(", ")
  //set move and tough 
  unit.mv = sp.includes("Fast") ? 8 : sp.includes("Slow") ? 4 : 6
  unit.Tough = 1 

  //check for special rules with numbers
  sp.forEach(s => SPECIALNUMBERS.forEach(sn=> s.includes(sn+"(") ? unit[sn] = Number(s.slice(sn.length+1,-1)) : null))
  
  RawUnits[uid] = unit 
  U.setState()
}

const UnitStringToData = (str)=>{  
  let[_id,_q,_def,_eq,_sp,c] = str.split("||")
  let[id,_n] = _id.split(" [")
  let n = rmToNum(_n,"]")
  let eq = setEq(_eq,n)
  let sp = _sp.split(", ")
  let mv = sp.includes("Fast") ? 8 : sp.includes("Slow") ? 4 : 6

  let unit = {
    id,
    n,
    q: rmToNum(_q, "+"),
    def : rmToNum(_def, "+"),
    eq,
    _eq,
    _sp,
    sp,
    pts : rmToNum(c, "pts"),
    Tough : 1,
    mv
  }

  //check for special rules with numbers
  sp.forEach(s => SPECIALNUMBERS.forEach(sn=> s.includes(sn+"(") ? unit[sn] = Number(s.slice(sn.length+1,-1)) : null))
  
  return unit
}

const ObjectData = (uid) => {
  let [f,what] = uid.split(".")
  return {
    id:what,
    n: 5,
    Tough : 1,
    pts : 0
  }

}

//handles raw unit data of activated units 
const RawUnits = {}

export class ActiveUnit {
  constructor (app,f,i,color) {
    this.app = app 
    let _rules = app.state.rules
    
    this.what = "ActiveUnit"
    this.id = chance.hash()
    this.color = color
    
    app.activeState[this.id] = this

    //team number 
    let colors = new Set(Object.values(app.activeState).filter(o=> o.what =="ActiveUnit").map(u=>u.color))
    this.ti = this.team.length == 1 ? colors.size-1 : this.team[0].ti

    let uid = this.uid = [f,f=="Saved"?app.state.saved.Units[i]:Units[_rules][f][i]].join(".")
    RawUnits[uid] ? this.setState() : f!="Saved" ? this.setState(RawUnits[uid] = f=="Objects"?ObjectData(uid):UnitStringToData(UnitData[_rules][f][i])) : SavedToUnitData(this, uid) 
  }

  setState () {
    let {map} = this.app
    this.state = {
      char : this.raw.id.charAt(0),
      tough : _.fromN(this.raw.n,()=> this.raw.Tough),
      p : _.fromN(this.raw.n, i=> [-1,-1])
    }

    //handle actions 
    this.moved = _.fromN(this.n,i=>0)
    this.acted = false

    //place 
    map.placeUnits(this.state,this.ti)
    map.draw()
  }

  //static data return 
  static async unitData (f,i) {
    return f == "Saved" ? await App.db.Units.getItem(App.state.saved.Units[i]) : UnitStringToData(UnitData[f].units[i])  
  }

  get raw () {
    return RawUnits[this.uid]
  }
  
  get n () {
    return this.state.tough.filter(t=>t>0).length
  }

  get p () {
    return this.state.p
  }

  get pts () {
    let {pts,n} = this.raw
    return Math.round(this.p.length*pts/n)
  }
  
  get team () {
    return Object.values(this.app.activeState).filter(o=> o.what =="ActiveUnit" && o.color == this.color)
  }
  delete (i) {
    this.state.tough.splice(i,1)
    this.state.p.splice(i,1)
    this.app.map.draw()
  }

  /*
    Round Management 
  */
  newRound () {
    this.startP = this.p.slice()
    //handle actions 
    this.moved = _.fromN(this.n,i=>0)
    this.acted = false
  }

  /*
    Morale
  */
  morale () {
    let {_sp,q} = this.raw
    let roll = chance.d6()
    let res = roll>=q ? "Pass" : "Fail"
    
    let text = `<div class="tc mb1">Morale: ${roll}; ${res}</div>`
    this.app.notify(text)
  }
  
  /*
    Attack
  */
  attack ([tui,U]) {
    let {notify,state} = this.app 
    let [_id,_ui,ai] = state.selection.get("active-unit")
    let {id,eq,_eq,q,sp} = this.raw
    let [wname,wp] = eq[ai]
    let roll = chance.rpg((wp.A*this.n*wp.n)+"d6").sort((a,b)=>b-a)
    //rending
    let rending = roll.filter(r=> wp.tags.includes("Rending") && r==6).length
    //reliable & sniper 
    let rq = wp.tags.includes("Reliable") || (wp.tags.includes("Sniper") && wp.range > 1) ? 2 : q 
    //hit for every die at or above q 
    let hits = roll.filter(r=>r>=rq).length
    //furious 
    let furious = roll.filter(r=> wp.tags.includes("Furious") && r==6).length
    //blast multiplier 
    let m = wp.Blast ? U.n < wp.Blast ? U.n : wp.Blast : 1
    //ap modifier 
    let ap = wp.AP ? wp.AP : 0
    //defense for every hit 
    let defRoll = chance.rpg((m*hits)+"d6")
    //poison 
    defRoll.forEach((r,j)=> wp.tags.includes("Poison") && r == 6 ? defRoll[j] = chance.d6() : null)
    //wound for every failed defense - use rending 
    let wounds = defRoll.filter((r,j)=>(r-(j<rending?4:ap))<U.raw.def).length
    //check for deadly 
    let deadly = wp.Deadly ? wp.Deadly : 0
    //check for regen 
    let regenVal = U.raw.sp.includes("Regeneration") ? 5 : U.raw.sp.includes("Self-Repair") ? 6 : 7
    let regen = wounds > 0 ? rollCount(wounds*(deadly>0?deadly:1),regenVal) : 0
    //impact 
    let impact = this.raw.Impact ? rollCount(this.raw.Impact,2) : 0 
    let impactWounds = impact>0 ? chance.rpg(impact+"d6").filter(r=>(r-ap)<U.raw.def).length : 0 

    let text = `
    <div class="tc mb1">${_.capitalize(this.color)} ${id} attacking ${_.capitalize(U.color)} ${U.raw.id} with ${wname}.</div>
    <div>Attack: ${roll}</div>
    <div>Defense: ${defRoll}</div>
    <div>Wounds: ${wounds}${deadly>0?` Deadly(${deadly})`:""}${regen>0?` Regen ${regen}`:""}</div>
    `
    notify(text)
    this.acted = true
  }
  
  /*
    Ranges 
  */
  get withinActionRange() {
    let [_id="",ui=0,ai=-1] = this.app.state.selection.get("active-unit") || []
    let r = ai==-1?this.raw.mv:this.raw.eq[ai][1].range
    return this.withinRange(ui,r,ai!=-1&&r>1)
  }

  withinRange(i,r=10,look=false) {
    let {map} = this.app
    let {terrain} = map
    let range = []

    const lookOver = ["swamp"]
    /* input callback */
    const mayMove = (x,y)=>{
      let t = terrain.get([x, y].join())
      let res = (look && lookOver.includes(t)) || t===undefined ? true : false
      return  res 
    }
    //FOV function 
    var fov = new ROT.FOV.PreciseShadowcasting(mayMove,{topology:map.layout=="hex"?6:4});
    /* output callback */
    fov.compute(...this.p[i], r, (x,y,_r,mayGo)=>range.push([x, y].join()))

    return range
  }
  /*
    Movement
  */
  moveTo (i=-1,x,y) {
    if(i==-1){
      return
    }
    let {p} = this.state
    //distance 
    let [dx,dy] = [p[i][0]-x,p[i][1]-y].map(Math.abs)
    let d = this.app.map.layout == "hex" ? dy+Math.max(0,(dx-dy)/2) : Math.sqrt(dx*dx+dy*dy)
    //update location 
    this.state.p[i] = [x,y]
    //check for initiative 
    if(App.state.initiative==this.color){
      this.moved[i] += d  
    }
    //draw 
    App.refresh(App.map.draw())
  }
  undoMove (i) {
    this.state.p[i] = this.startP[i].slice()
    this.moved[i] = 0
  }
  /*
    Map Character 
  */
  draw (engine) {
    let selection = this.app.state.selection
    let [_id="",ui=0,ai=-1] = selection.get("active-unit") || []

    //char, color, bg-color : "#", "#f00", "#009"
    let {char,p,tough} = this.state
    p.forEach(([x,y],i)=> {
      if(x > -1 && y > -1) {
        engine.draw(x, y, char, this.color, _id==this.id && ui==i? "#8fce00" : tough[i] == 0 ? "red" : "" )
      }
    })
  }
  /*
    UI 
  */
  get tableUI () {
    let _h = _.html
    let {selection} = App.state
    let [_id,ui=0,ai=-1] = selection.get("active-unit") || []
    let {id,eq,_sp,mv,q,def} = this.raw
    let {tough,char,p} = this.state
    let {moved,acted,pts} = this 
    let n = tough.length

    if(this.uid.includes("Objects")){
      return _h`
      <div class="w-100 flex items-center justify-between ba pa1 ml1 mb1">
        <div class="pointer dim underline-hover" onClick=${()=>App.refresh(selection.set("active-unit",[this.id,0,-1]))}><span class="f5 green">${this.id==_id?"➢":""}</span><b>${id}</b></div>
        <div class="flex mh2">
          <div class="b br1 bt bb bl bg-light-gray">#</div>
          <input class="w-100 tc" type="number" min="0" value=${this.raw.n} onInput=${(e)=>this.setState(this.raw.n=Number(e.target.value))}></input>
        </div>
        <div class="flex mh2">
          <span class="b br1 bt bb bl bg-light-gray">@</span>
          <input class="tc w-100" type="text" value=${char} oninput=${(e)=> this.state.char = e.target.value}></input>
        </div>
        <div class="dim pointer tc ba br2 pa1"><span class="red" onClick=${()=>this.app.deleteUnit(this.id)}>✘</span></div>
      </div>`
    }

    const toughSelect = (i) => _h`
    <div class="dropdown">
      <div class="lh-solid pointer tc b ba mr1 ph1 ${_id==this.id&&ui==i ? "b--green" : ""}">
        <span class="${tough[i]>0?_id==this.id&&ui==i?"green":"":"red"}">${tough[i]}</span>
        <span class="flex justify-center">
          <span class="circle-vs bg-blue ${moved[i]>0?"":"dn"}"></span>
        </span>
      </div>
      <div class="dropdown-content bg-white db ba bw1 pa1">
        ${_.fromN(this.raw.Tough+1,j=> _h`<div class="tc link pointer dim underline-hover hover-orange db br2 mb1" onClick=${()=>this.app.refresh(this.state.tough[i]=this.raw.Tough-j)}>Tough ${this.raw.Tough-j}</div>`)}
        <div class="tc ba mv1"></div>
        <div class="tc">Moved ${moved[i]}</div>
        <div class="tc link pointer dim underline-hover hover-green db br2 mv1 pa1" onClick=${()=>this.undoMove(i)}>Undo Move</div>
        <div class="tc ba mv1"></div>
        <div class="tc link pointer dim underline-hover hover-red db br2 mv1 pa1" onClick=${()=>App.refresh(this.delete(i))}>Delete Unit</div>
      </div>
    </div>`
    
    return _h`
    <div class="w-100 ba pa1 ml1 mb1">
      <div class="flex items-start justify-between" >
        <div>
          <div class="pointer dim underline-hover" onClick=${()=>App.refresh(selection.set("active-unit",[this.id,0,-1]))}><span class="f5 green">${this.id==_id?"➢":""}</span><b>${id}</b> <span class="f7">[${pts}pts]</span></div> 
          <div class="f7">Q${q}+/D${def}+ ${_sp}</div>
        </div>
        <div class="tc b green ${acted?"":"dn"}">Acted</div>
        <div class="dim pointer tc ba br2 pa1"><span class="red" onClick=${()=>this.app.deleteUnit(this.id)}>✘</span></div>
      </div>
      <div class="flex items-center">
        <span class="b f6 mr1">Tough</span>
        <span class="flex">${_.fromN(n,i=> toughSelect(i))}</span>
      </div>
      <div class="flex items-center justify-between ma1">
        <div>
          <div class="pointer underline-hover f6" onClick=${()=>App.refresh(selection.set("active-unit",[this.id,ui,-1]))}><span class="green">${ai==-1&&this.id==_id?"➢":""}</span>Move ${mv}"/${2*mv}"</div>
          ${eq.map(([atk,wp],i)=> _h`<div class="pointer underline-hover f6" onClick=${()=>App.refresh(selection.set("active-unit",[this.id,ui,i]))}><span class="green">${ai==i&&this.id==_id?"➢":""}</span>${this.n*wp.n}x ${atk} ${wp.sp}</div>`)}
        </div>
        <div class="w-20">
          <div class="pointer dim underline-hover bg-light-blue white b tc ba br1 mb1" onClick=${()=>this.morale()}>Morale</div>
          <div class="flex">
            <span class="b ba bg-light-gray">@</span>
            <input class="tc w-100" type="text" value=${char} oninput=${(e)=> this.state.char = e.target.value}></input>
          </div>
        </div>
      </div>
      <div class="w-100 flex items-center">
        
      </div>
    </div>
    `
  }
}