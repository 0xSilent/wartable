import {SumDice, BuildArray, SpliceOrPush} from "./random.js"

/*
  Unit 
  [symbol,name,hd,ac,move,[atks],img]
  move = [land,air,water]
  atk = [name,range,bonus,atk chain]
  atk chain = ndx+b/ndx+b/etc 

  Faction 
  "FactionId": {
    "name" : "",
    "colors": [],
    "units": {},
  },

  Force 
  {
    "name" : "",
    "units" : [],
    "cost" : 0
  }

  Force Units
  [id,#,[mods/gear]]
*/

const Factions = {
  "Archons": {
    "name": "Archons",
    "colors": [],
    "units": {
      "Lantern": ["l", "Lantern Archon", "1d4", 15, [0, 24, 0], [["Blast", 1, 0, "1d6/1d6"]]],
      "Hound": ["h", "Hound Archon", "6d8", 19, [15, 0, 0], [["Fist/Fist/Bite", 1, 5, "1d4/1d4/1d8"]],"https://www.completecompendium.com/img/spc/archhoun.gif"],
    }
  },
  "TanarRi": {
    "name": "Tanar'ri",
    "colors": [],
    "units": {
      "Dretch": ["d", "Dretch", "2d8", 16, [9, 0, 0], [["Claw/Claw/Bite", 1, 1, "1d4/1d4/1d4+1"]],"https://www.completecompendium.com/images/monsters/img/tanaladr.gif"],
    }
  },
}

const Forces = [{
  "name": "Archon Strike",
  "tags": ["Archon"],
  "units": [["Archons.Lantern", 3, []], ["Archons.Hound", 2, []], ],
  "cost": 10
}, {
  "name": "Tanar'ri Rabble",
  "tags": ["Tanar'ri"],
  "units": [["TanarRi.Dretch", 20, []]],
  "cost": 10
}, ]

/*
  AI Types 
*/
const AI = ["Player", "Aggressive", "Cautious", "Defensive", "Guardian", "Rampage", "Tactical", "Beast"]

class Unit {
  constructor(app, u, mods) {
    this.app = app 
    this.id = chance.hash()

    let[fid,uid] = u.split(".")
    this.uid = uid
    this.fid = fid

    //starting HP 
    this.hpMax = SumDice(this.data[2])
    this.hp = this.hpMax 

    //conditions 
    this.conditions = [] 

    //current action and action history 
    this._act = 0
    this.history = []
  }
  get name() {
    return this.data[1]
  }
  get symbol() {
    return this.data[0]
  }
  get display () {
    let {selected,ci,initiative} = this.app.state 
    return [...this.p, this.symbol, this.force.color, initiative[ci] == this.id ? "lightgreen" : selected == this.id ? "white" : null]
  }
  get faction() {
    return Factions[this.fid]
  }
  get data() {
    return this.faction.units[this.uid]
  }

  /*
    Combat State 
  */
  set state (s) {
    ["id","hp","conditions","p"].forEach((key,i) => this[key] = s[i])
  }
  //active state for save prior to attack to create rewind 
  get state () {
    return ["id","hp","conditions","p"].map(key => this[key])
  }

  /*
    Acions during combat 
  */
  get act () {
    return this.actions[this._act]
  }
  get actions () {
    //reduce actions to what, id, name, range
    let mv = this.data[4].map((m,i) => ["m",i,["Run","Fly","Swim"][i],m]).filter(m=> m[3] > 0)
    let atks = this.data[5].map((a,i) => ["a",i,a[0],a[1]]);
    
    return [...mv,...atks] 
  }
  
  /*
    Take Action 
  */
  _attack (target) {
    let [name,range,bonus,chain] = this.data[5][this.act[1]] 
    let thp = target.hp, tAC = target.data[3];

    let r = chain.split("/").map(_=>chance.d20())
    let dmg = chain.split("/").map((d,i) => r[i]+bonus > tAC ? SumDice(d) : 0) 

    //do damage 
    dmg.forEach(d => target.hp-=d)
    target.hp = target.hp < 0 ? 0 : target.hp

    //notify 
    let note = `${this.name} ${this.act[2]} Attack [+${bonus}]: ${r} vs ${target.name} AC ${tAC}; ${dmg} dmg`
    console.log(note) 
    this.app.notify(note)
  }
  
  takeAction (what,data) {
    //history pushes the rewind to the history 
    if(what == "m"){
      // history from to 
      this.history.push(["m",this.p.slice()])
      this.p = data 
    }
    else if (what == "a"){
      // history from to 
      this.history.push(["a",data.state])
      this._attack(data)
    }
    else if (what == "u"){
      let max = this.history.length-1
      //what to undo 
      let last = this.history[max]
      //remove from history 
      this.history.splice(max,1)
      //act the undo 
      if(last[0] == "m"){
        this.p = last[1] 
      }
      else if(last[0] == "a"){
        this.app.units[last[1][0]].state = last[1]
      }
    }

    //redraw 
    this.app.refresh()
  }
  /*
    Ranges 
  */
  get withinActionRange () {
    return this.withinRange(this.act[3])
  }
  
  withinRange(r=10) {
    let {map} = this.app
    let {terrain} = map
    let range = []
    
    /* input callback */
    const mayMove = (x, y) => {
      return terrain.has([x,y].join()) ? false : true
    }
    //FOV function 
    var fov = new ROT.FOV.PreciseShadowcasting(mayMove);
    /* output callback */
    fov.compute(...this.p, r, (x, y, _r, mayGo) => range.push([x,y].join()))
    
    return range
  }
  /*
    UI 
  */
  get image () {
    let {html} = this.app 

    let ui = html`
    <div>
      <div class="fr f3 pointer" onClick=${()=>this.app.dialog = ""}>✖</div>
      <img src=${this.data[6]}></img>
    </div>
    `
    
    return this.data[6] && this.data[6] != "" ? ui : null 
  }
  draw(engine) {
    //update canvas 
    engine.draw(...this.display)
  }
  
  stats(app) {
    let {html} = app
    //OSR 
    let[symbol,name,hd,ac,_move,atks] = this.data
    let move = _move.map((n,i)=>n > 0 ? ["Mv", "Fl", "Sw"][i] + " " + n : "").filter(m=>m != "")

    const OSR = html`
    <div>HD ${hd} [${this.hpMax}hp], AC ${ac}, ${move.join(", ")}</div>
    ${atks.map(([aname,range,bonus,dice])=>html`<div class="pa1">${aname} [+${bonus}] ${dice}</div>`)}
    `

    return OSR
  }
}

class Force {
  constructor(app, f) {
    this.id = chance.hash()
    this.app = app

    Object.assign(this, f)

    this.AI = "Player"

    //assign units 
    this.units = []
    f.units.forEach(([u,n,mods])=>BuildArray(n, ()=>{
      let U = new Unit(app,u,mods)
      U.force = this
      this.units.push(U)
    }
    ))
  }
  setVs(i) {
    this.i = i
    //assign vs status 
    this.vs = this.app.state.active.map(_=>"Neutral")
  }
  /*
    UI for tabletop display 
  */
  get UI() {
    let {app, color, name, vs, units} = this
    let {html, map, engine, current} = app
    let {active, selected} = app.state

    const vsSelect = (what,i)=>html`
    <div class="dropdown">
      <div class="blue link pointer dim underline-hover hover-orange">${what}</div>
      <div class="dropdown-content w-100 bg-white ba bw1 pa1">
        ${["Allies", "Neutral", "Enemies"].map(w=>w == what ? "" : html`<div class="link pointer underline-hover hover-red" onClick=${()=>app.refresh(this.vs[i] = w)}>${w}</div>`)}
      </div>
    </div>
    `

    //
    const Unit = (u) => html`
    <div class="ba br2 mb1 pa1">
      <div style="height: 5px;background-color: red;width:100%"> 
        <div style="height: 5px;background-color: chartreuse;width: ${100*u.hp/u.hpMax}%;"></div>
      </div>
      <div class="flex justify-between">
        <span class="b pointer underline-hover" onClick=${()=>app.updateState("selected", u.id)}>
          ${app.current.id != u.id ? "" : html`<span class="green">➤</span>`}
          ${u.name} [${u.symbol}]
        </span>
        <div class="pointer underline-hover mh1 ${u.image ? "" : "hidden"}" onClick=${()=> app.dialog = ["units",u.id,"image"].join(".")}>ℹ</div>
      </div>
      ${selected == u.id ? u.stats(app) : ""}
    </div>
    `

    return html`
    <div class="flex items-center justify-between w5">
      <h3 class="flex items-center ma0">
        <div class="dib" style="height: 25px;width: 25px;background-color: ${color};"></div>
        <div class="mh1">${name}</div>
      </h3>
    </div>
    ${active.map((f,i)=>f[1].id == this.id ? "" : html`
    <div class="flex justify-between">${vsSelect(vs[i], i)} <div>vs</div> <div>${f[1].name}</div></div>
    `)}
    <div>${units.map(Unit)}
    </div>
    `
  }
}

export {Factions, Forces, Force}
