
/*
  Unit 
  d : [symbol,name,hd,ac,move]
  sp : []
  atk : [[name,range,bonus,ndx+b/ndx+b/etc,special]]
    atk special : "i,name,what+data"
  img : link string 
  tags : []

  attack special "what"
  afflict, save, death/condition 

  conditions
  - immobile = no move, AC = 10 
  - slowness = half move, AC penalty 
  - bane = atk penalty 
  - weakness = half damage
  - clumsy = DEX penalty 
  - confusion = WIL penalty    
  - fatigue = STR penalty 
  
  Force 
  {
    "name" : "",
    "units" : [],
    tags : [],
  }

  Force Units
  [id,#,[mods/gear]]
*/

const Factions = ["Aasimon","Archon","Baatezu"]

const Units = {
  'Aarakocra':{'d':["a",'Aarakocra',"1d8+2",13,6],'atk':[["Claw/Claw",1,1,"1d3/1d3"],["Spear",1,1,"2d4"]],'tags':["flying"],'img':'https://www.completecompendium.com/images/monsters/img/aarakocr.gif','sp':["Mv,Fly,36"]},
'Aasimar':{'d':["a",'Aasimar',"3d8+3",15,12],'atk':[["Sword",1,3,"1d8"]],'tags':[],'img':'https://www.completecompendium.com/images/monsters/img/aasimar.gif','sp':[]},
'Aboleth':{'d':["A",'Aboleth',"8d8",16,3],'atk':[["Teantacles",1,7,"1d6/1d6/1d6/1d6"]],'tags':["aberration"],'img':'https://www.completecompendium.com/images/monsters/img/aboleth.gif','sp':["Mv,Swim,18"]},
'Banshee':{'d':["b",'Banshee',"7d8",20,15],'atk':[["Touch",1,7,"1d8"]],'tags':["undead"],'img':'https://www.completecompendium.com/images/monsters/img/banshee.gif','sp':[]},
'Beholder':{'d':["B",'Beholder',"6d6+40",20,3],'atk':[["Bite",1,1,"2d4"]],'tags':["aberration"],'img':'','sp':["Mv,Fly,3"]},
'Bugbear':{'d':["b",'Bugbear',"3d8+1",15,9],'atk':[["Sword",1,3,"1d8"]],'tags':[],'img':'https://www.completecompendium.com/images/monsters/img/bugbear.gif','sp':[]},
'Centaur':{'d':["c",'Centaur',"4d8",16,18],'atk':[["Hoof/Hoof",1,3,"1d6/1d6"],["Club",1,3,"1d8"],["Longbow",14,3,"1d6"]],'tags':[],'img':'https://www.completecompendium.com/images/monsters/img/centaur.gif','sp':[]},
'Couatl':{'d':["C",'Couatl',"9d8",15,6],'atk':[["Bite/Constrict",1,9,"1d3/2d4"]],'tags':[],'img':'https://www.completecompendium.com/images/monsters/img/couatl.gif','sp':["Mv,Fly,18"]},
'Death Knight':{'d':["d",'Death Knight',"9d10",20,12],'atk':[["Longsword",1,12,"1d8+2"]],'tags':["undead"],'img':'https://www.completecompendium.com/images/monsters/img/deatknig.gif','sp':[]},
'Displacer Beast':{'d':["d",'Displacer Beast',"6d8",16,15],'atk':[["Tentacle/Tentacle",1,5,"2d4/2d4"]],'tags':[],'img':'','sp':[]},
  'Agathinon':{'d':["a",'Agathinon',"8d8",20,15],'atk':[["Sword",1,7,"2d4"]],'tags':["Aasimon"],'img':'https://www.completecompendium.com/images/monsters/img/aasiagat.gif','sp':[]},
'LightAasimon':{'d':["l",'Light',"10d8",30,48],'atk':[["Blast",1,9,"1d12"]],'tags':["Aasimon", "flying"],'img':'https://www.completecompendium.com/images/monsters/img/aasilite.gif','sp':["Mv,Fly,48"]},
'Deva':{'d':["d",'Deva',"12d8",25,24],'atk':[["Mace",1,11,"3d6/3d6"]],'tags':["Aasimon", "flying"],'img':'https://www.completecompendium.com/images/monsters/img/aasideva.gif','sp':["Mv,Fly,48"]},
'Planetar':{'d':["p",'Planetar',"14d8",27,15],'atk':[["Greatsword",1,19,"1d10+10/1d10+10/1d10+10"]],'tags':["Aasimon", "flying"],'img':'https://www.completecompendium.com/images/monsters/img/aasiplan.gif','sp':["Mv,Fly,48"]},
'Solar':{'d':["s",'Solar',"22d8",30,18],'atk':[["Solar Sword",1,20,"2d20+16/2d20+16/2d20+16/2d20+16"]],'tags':["Aasimon", "flying"],'img':'https://www.completecompendium.com/images/monsters/img/aasisola.gif','sp':["Mv,Fly,48"]},
'LanternArchon':{'d':["l",'Lantern',"1d4",15,24],'atk':[["Ray/Ray",6,0,"1d6/1d6"]],'tags':["Archon", "flying"],'img':'','sp':["Mv,Fly,24"]},
'HoundArchon':{'d':["h",'Hound',"6d8",19,15],'atk':[["Slam/Slam/Bite",1,5,"1d4/1d4/1d8"]],'tags':[],'img':'https://www.completecompendium.com/img/spc/archhoun.gif','sp':[]},
'WardenArchon':{'d':["w",'Warden',"8d8",21,15],'atk':[["Claw/Claw/Bite",1,7,"1d8/1d8/2d6"]],'tags':[],'img':'https://www.completecompendium.com/img/spc/archward.gif','sp':[]},
'SwordArchon':{'d':["s",'Sword',"10d8",25,15],'atk':[["Bite/Bite/Bite/Bite",1,9,"2d4/2d4/2d4/2d4"]],'tags':["Archon", "flying"],'img':'https://www.completecompendium.com/img/spc/archswor.gif','sp':["Mv,Fly,18"]},
'TrumpetArchon':{'d':["r",'Trumpet',"11d8",23,12],'atk':[["Sword/Sword",1,9,"1d10+3/1d10+3"]],'tags':["Archon", "flying"],'img':'','sp':["Mv,Fly,21"]},
'ThroneArchon':{'d':["T",'Throne',"12d8",27,15],'atk':[["Slam/Slam",1,13,"1d12+5/1d12+5"]],'tags':["Archon", "flying"],'img':'https://www.completecompendium.com/img/spc/archthro.gif','sp':["Mv,Fly,36"]},
'TomeArchon':{'d':["o",'Tome',"20d8",25,15],'atk':[["Ray/Ray",12,11,"1d10/1d10"]],'tags':["Archon", "flying"],'img':'','sp':["Mv,Fly,18"]},
'Amnizu':{'d':["a",'Amnizu',"9d8",21,6],'atk':[["Energy",1,14,"2d4"]],'tags':["Baatezu", "flying"],'img':'https://www.completecompendium.com/images/monsters/img/baatamni.gif','sp':["Mv,Fly,15"]},
'Barbazu':{'d':["b",'Barbazu',"6d8+6",17,15],'atk':[["Claw/Claw/Bite",1,7,"1d2/1d2/1d8"], ["Glaive",1,7,"2d6"]],'tags':["Baatezu"],'img':'https://www.completecompendium.com/images/monsters/img/baatbarb.gif','sp':[]},
'Cornugon':{'d':["c",'Cornugon',"10d8",22,9],'atk':[["Claw/Claw/Bite/Tail",1,9,"1d4/1d4/1d4+1/1d3"], ["Sword",1,9,"2d6+7"]],'tags':["Baatezu", "flying"],'img':'https://www.completecompendium.com/images/monsters/img/baatcorn.gif','sp':["Mv,Fly,18"]},
'Erinyes':{'d':["e",'Erinyes',"6d8+6",18,12],'atk':[["Sword",1,7,"2d4"]],'tags':["Baatezu", "flying"],'img':'https://www.completecompendium.com/images/monsters/img/baaterin.gif','sp':["Mv,Fly,21"]},
'Gelugon':{'d':["g",'Gelugon',"11d8",23,15],'atk':[["Claw/Claw/Bite/Tail",1,11,"1d4+4/1d4+4/2d4+4/3d4+4"], ["Longspear",1,11,"2d6+4"]],'tags':["Baatezu"],'img':'https://www.completecompendium.com/images/monsters/img/baatgelu.gif','sp':[]},
'Hamatula':{'d':["h",'Hamatula',"7d8",19,12],'atk':[["Claw/Claw/Bite",1,7,"2d4/2d4/3d4"]],'tags':["Baatezu"],'img':'https://www.completecompendium.com/images/monsters/img/baathama.gif','sp':[]},
'Kocrachon':{'d':["k",'Kocrachon',"6d8+6",18,12],'atk':[["Claw/Claw/Bite",1,7,"1d6/1d6/2d6"], ["Sword/Sword",1,7,"1d8/1d8"]],'tags':["Baatezu", "flying"],'img':'https://www.completecompendium.com/images/monsters/img/baatkocr.gif','sp':["Mv,Fly,12"]},
'Lemure':{'d':["l",'Lemure',"2d8",13,3],'atk':[["Slam",1,1,"1d3"]],'tags':["Baatezu"],'img':'https://www.completecompendium.com/images/monsters/img/baatlemu.gif','sp':[]},
'Nupperibo':{'d':["n",'Nupperibo',"1d8",11,6],'atk':[["Slam/Slam",1,1,"1d2/1d2"]],'tags':["Baatezu"],'img':'https://www.completecompendium.com/images/monsters/img/baatnupp.gif','sp':[]},
'Osyluth':{'d':["o",'Osyluth',"5d8",17,12],'atk':[["Claw/Claw/Bite/Sting",1,5,"1d4/1d4/1d8/3d4"]],'tags':["Baatezu"],'img':'https://www.completecompendium.com/images/monsters/img/baatosyl.gif','sp':[]},
'Pit Fiend':{'d':["p",'Pit Fiend',"13d8",25,15],'atk':[["Buffet/Buffet/Claw/Claw/Bite/Tail",1,13,"1d4/1d4/1d6/1d6/2d6/2d4"]],'tags':["Baatezu", "flying"],'img':'https://www.completecompendium.com/images/monsters/img/baatpitf.gif','sp':["Mv,Fly,24"]},
'Spinagon':{'d':["s",'Spinagon',"3d8+3",16,6],'atk':[["Claw/Claw/Javelin",1,3,"1d4/1d4/1d6"],["Spike/Spike",6,3,"1d3/1d3"]],'tags':["Baatezu", "flying"],'img':'https://www.completecompendium.com/images/monsters/img/baatspin.gif','sp':["Mv,Fly,18"]},
}

const Forces = [{
  "name": "Archon Strike",
  "tags": ["Archon"],
  "units": [["LanternArchon", 3, []], ["HoundArchon", 2, []], ],
}, {
  "name": "Baatezu Rabble",
  "tags": ["Baatezu"],
  "units": [["Nupperibo", 16, []],["Osyluth",1,[]]],
}, ]

/*
  AI Types 
*/
const AI = ["Player", "Aggressive", "Cautious", "Defensive", "Guardian", "Rampage", "Tactical", "Beast"]

class Unit {
  constructor(app, uid, mods) {
    this.app = app
    this.id = chance.hash()

    this.uid = uid

    //starting HP 
    this.hpMax = SumDice(this.data.d[2])
    this.hp = this.hpMax

    //conditions 
    this.conditions = []

    //current action and action history 
    this._act = 0
    this.history = []
  }
  get name() {
    return this.data.d[1]
  }
  get symbol() {
    return this.data.d[0]
  }
  get display() {
    let {selected, ci, initiative} = this.app.state
    return [...this.p, this.symbol, this.force.color, initiative[ci] == this.id ? "lightgreen" : selected == this.id ? "white" : null]
  }
  get data() {
    return Units[this.uid] || this.app.state.saved.Units[this.uid]
  }

  /*
    Combat State 
  */
  set state(s) {
    ["id", "hp", "conditions", "p"].forEach((key,i)=>this[key] = s[i])
  }
  //active state for save prior to attack to create rewind 
  get state() {
    return ["id", "hp", "conditions", "p"].map(key=>this[key])
  }

  /*
    Acions during combat 
  */
  get act() {
    return this.actions[this._act]
  }
  get actions() {
    let {d,atk,sp = []} = this.data 
    //reduce actions to what, id, name, range
    //attacks - [name,range,bonus,atk chain]
    let atks = atk.map((a,i)=>["a", a[0], a[1], a]);
    //moves 
    let baseMove = ["m","Run", d[4]]
    let mv = [baseMove].concat(sp.filter(s => s.includes("Mv")).map((s,i) => {
      //"Mv,Fly,3"
      let [base,what,range] = s.split(",")
      return ["m",what,Number(range)]
    }))

    return [...mv, ...atks]
  }

  /*
    Take Action 
  */
  _attack(target) {
    //contains the attack array 
    let[name,range,bonus,chain] = this.act[3]
    //target data 
    let thp = target.hp
      , tAC = target.data.d[3];

    let r = chain.split("/").map(_=>chance.d20())
    let dmg = chain.split("/").map((d,i)=>r[i] + bonus > tAC ? SumDice(d) : 0)

    //do damage 
    dmg.forEach(d=>target.hp -= d)
    target.hp = target.hp < 0 ? 0 : target.hp

    //notify 
    let note = `${this.name} ${name} Attack [+${bonus}]: ${r} vs ${target.name} AC ${tAC}; ${dmg} dmg`
    console.log(note)
    this.app.notify(note)
  }

  takeAction(what, data) {
    //history pushes the rewind to the history 
    if (what == "m") {
      // history from to 
      this.history.push(["m", this.p.slice()])
      //data is new position from map click 
      this.p = data
    } else if (what == "a") {
      // history - data is target unit, save its state 
      this.history.push(["a", data.state])
      //attack unit 
      this._attack(data)
    } else if (what == "u") {
      let max = this.history.length - 1
      //what to undo 
      let [lWhat,lState] = this.history[max]
      //remove from history 
      this.history.splice(max, 1)
      //act the undo 
      if (lWhat == "m") {
        this.p = lState
      } else if (lWhat == "a") {
        this.app.units[lState[0]].state = lState
      }
    }

    //redraw 
    this.app.refresh()
  }
  /*
    Ranges 
  */
  get withinActionRange() {
    return this.withinRange(this.act[2])
  }

  withinRange(r=10) {
    let {map} = this.app
    let {terrain} = map
    let range = []

    /* input callback */
    const mayMove = (x,y)=>{
      return terrain.has([x, y].join()) ? false : true
    }
    //FOV function 
    var fov = new ROT.FOV.PreciseShadowcasting(mayMove);
    /* output callback */
    fov.compute(...this.p, r, (x,y,_r,mayGo)=>range.push([x, y].join()))

    return range
  }
  /*
    UI 
  */
  get image() {
    let {html} = this.app

    let ui = html`
    <div>
      <div class="fr f3 pointer" onClick=${()=>this.app.dialog = ""}>✖</div>
      <img src=${this.data.img}></img>
    </div>
    `

    return this.data.img ? ui : null
  }
  draw(engine) {
    let d = this.display.slice()
    //update background color if no hp 
    d[4] = this.hp > 0 ? d[4] : "crimson"  
    //update canvas 
    engine.draw(...d)
  }

  stats(app) {
    let {html} = app
    //OSR 
    let[symbol,name,hd,ac,run] = this.data.d

    const OSR = html`
    <div>HD ${hd} [${this.hpMax}hp], AC ${ac}, Mv ${run}</div>
    ${this.data.atk.map(([aname,range,bonus,dice])=>html`<div class="pa1">${aname} [+${bonus}] ${dice}</div>`)}
    `

    return OSR
  }
}

class Force {
  constructor(app, f=[]) {
    let {name="New Force"} = f

    this.id = chance.hash()
    this.app = app

    this.name = name

    this.AI = "Player"
    this.side = 0

    //assign units 
    this.units = []
    let _units = f.units || f
    _units.forEach(([u,n,mods])=>BuildArray(Number(n), ()=>{
      let U = new Unit(app,u,mods)
      U.force = this
      this.units.push(U)
    }
    ))

    //place on map 
    this.map.placeForce(this, app.state.active.length)

    //UI 
    this._selected = ""
  }
  setVs(i) {
    this.i = i
    //assign vs status 
    this.vs = this.app.state.active.map(_=>"Neutral")
  }

  async addUnit(id) {
    let {app, map} = this
    //add unit 
    let U = new Unit(app,id)
    U.force = this

    //get unit positions 
    let up = this.units.length > 0 ? this.units.map(u=>u.p) : [map.randomPoint()]
    let p = []
    while (p.length == 0) {
      let np = chance.pickone(up).slice()
      //shift by one 
      np[Date.now() % 2] += 1
      p = np[0] < 0 || np[1] < 0 || np[0] >= map.size || np[1] >= map.size || map.terrain.has(np.join()) || up.map(_up=>_up.join()).includes(np.join()) ? p : np
    }
    U.p = p

    this.units.push(U)

    app.state.initiative.push(U.id)
    app.updateState("selected", U.id)
    app.refresh()
  }
  /*
  */

  get map() {
    return this.app.map
  }
  /*
    UI for tabletop display 
  */
  get UI() {
    let {app, color, name, vs, units} = this
    let {html, map, engine, current} = app
    let {active, selected} = app.state

    //load all the units 
    let allUnits = Object.entries(Object.assign({}, Units, app.state.saved.Units)).map(([key,u])=>[key, u.d[1]])

    const vsSelect = (what,i)=>html`
    <div class="dropdown">
      <div class="blue link pointer dim underline-hover hover-orange">${what}</div>
      <div class="dropdown-content w-100 bg-white ba bw1 pa1">
        ${["Allies", "Neutral", "Enemies"].map(w=>w == what ? "" : html`<div class="link pointer underline-hover hover-red" onClick=${()=>app.refresh(this.vs[i] = w)}>${w}</div>`)}
      </div>
    </div>
    `

    //
    const Unit = (u)=>html`
    <div class="ba br2 mb1 pa1">
      <div style="height: 5px;background-color: red;width:100%"> 
        <div style="height: 5px;background-color: chartreuse;width: ${100 * u.hp / u.hpMax}%;"></div>
      </div>
      <div class="flex justify-between">
        <span class="b pointer underline-hover" onClick=${()=>app.updateState("selected", u.id)}>
          ${app.current.id != u.id ? "" : html`<span class="green">➤</span>`}
          ${u.name} [${u.symbol}]
        </span>
        <div class="flex">
          <div class="pointer underline-hover mh1 ${u.image ? "" : "hidden"}" onClick=${()=>app.dialog = ["units", u.id, "image"].join(".")}>ℹ</div>
          <div class="b red pointer underline-hover ph2 ${selected == u.id ? "" : "hidden"}" onClick=${()=>app.removeUnit(u.id)}>✗</div>
        </div>
      </div>
      <div class="${selected == u.id ? "" : "hidden"}">${u.stats(app)}</div>
    </div>
    `

    return html`
    <div class="flex items-center justify-between w5">
      <h3 class="flex items-center ma0">
        <div class="dib" style="height: 25px;width: 25px;background-color: ${color};"></div>
        <div class="mh1">${name}</div>
      </h3>
    </div>
    <div class="flex items-center">
      <select class="w-100 pa1" value=${this._selected} onChange=${(e)=>app.refresh(this._selected = e.target.value)}>
        ${allUnits.map(u=>html`<option value=${u[0]}>${u[1]}</option>`)}
      </select>
      <div class="b white tc link pointer dim underline-hover hover-orange bg-green db br2 mv1 pa2" onClick=${()=>this.addUnit(this._selected)}>Add</div>
    </div>
    <div>
      ${units.map(Unit)}
    </div>
    `
  }
}

export {Factions, Forces, Force, Units}
