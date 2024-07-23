/*
  Mixins RNG
*/
import "./mixins.js"

/*
  V0.2
*/

/*
  Storage - localforage
  https://localforage.github.io/localForage/
*/
import "../lib/localforage.min.js"
const DB = {}
DB.Units = localforage.createInstance({
  name: "Units"
});

/*
  Chance RNG
*/
import "../lib/chance.slim.js"

/*
  SVG
  https://svgjs.dev/docs/3.0/getting-started/
*/

/*
  UI Resources  
*/
//Preact
import {h, Component, render} from 'https://unpkg.com/preact?module';
import htm from 'https://unpkg.com/htm?module';
// Initialize htm with Preact
const html = _.html = htm.bind(h);

/*
  Forces 
*/

import {Units,ActiveUnit} from './units.js'

/*
  App Sub UI
*/
import*as UI from './UI.js';
import {TileMap,mapStyles} from "./map.js"

/*
  Colors 
*/
const Colors = ["aquamarine","beige","blue","chartreuse","coral","cyan","fuchsia","gold","hotpink","indigo","magenta","olive","orange","pink","red","salmon","teal","violet","yellow"]

/*
  Game Object 
*/
let Game = {
  "id": "",
  "name": "",
  "maps": new Map(),
  "log": []
}


/*
  Declare the main App 
*/

class App extends Component {
  constructor() {
    super();
    this.state = {
      rules : "OPR",
      tick : 0,
      show: "",
      reveal: new Set(),
      selection: new Map([["unit-faction","Alien Hives"],["unit-add",0],["team-color","blue"]]),
      dialog: "",
      saved: {
        Units : []
      },
      round : 1,
      initiative : "",
      history : []
    };

    this.engine = new ROT.Display();
    
    //use in other views 
    this.html = html
    this.colors = Colors
    this.map = null
    this.game = Game
    this.db = DB 


    //generator 
    this.gen = {
      TileMap
    }

    //global store for generated data 
    this.activeState = {}

    //keep in window 
    window.App = this;
  }

  // Lifecycle: Called whenever our component is created
  async componentDidMount() {
    DB.Units.iterate((data,key) => {
      this.state.saved.Units.push(key)
    })

    //show random 
    this.map = new TileMap(this)
    this.map.draw()

    setInterval(()=> {
      this.updateState("tick",this.state.tick+1)
      if(this.state.tick%2 == 0){
        this.map.draw()
      }
    }, 1000)
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {}

  /*
    Render functions 
  */

  toggle (what) {
    let reveal = this.state.reveal
    reveal.has(what) ? reveal.delete(what) : reveal.add(what)
  }

  notify(text, type="success") {
    let opts = {
      theme: "relax",
      type,
      text:text,
      layout: "center"
    }

    new Noty(opts).show();
  }

  //main function for updating state 
  async updateState(what, val) {
    let s = {}
    s[what] = val
    await this.setState(s)

    if (this.map) {
      this.map.draw()
    }
  }

  //main functions for setting view - usine set/get of show 

  refresh() {
    this.show = this.state.show
    this.dialog = this.state.dialog
  }

  set show(what) {
    this.updateState("show", what)
  }

  get show() {
    let[what,id] = this.state.show.split(".")
    return UI[what] ? UI[what](this) : this[what] ? this[what][id].UI ? this[what][id].UI() : "" : ""
  }

  set dialog(what) {
    this.state.newData = undefined 
    this.state.selected = ""
    this.updateState("dialog", what)
  }

  get dialog() {
    let[what,id] = this.state.dialog.split(".")
    return what == "" ? "" : UI.Dialog(this)
  }

  /*
    Game Data Get Fiunctions  
  */

  deleteUnit (id) {
    let {selection} = this.state
    let [_id] = selection.get("active-unit") || []
    _id == id ? selection.set("active-unit",[]) : null 
    delete this.activeState[id]
    this.refresh()
    this.map.draw()
  }

  get units () {
    let U = Object.values(this.activeState).filter(o=> o.what =="ActiveUnit")
    return U.reduce((all,u)=>{
      let team = all[u.color] || {u:[],pts : 0}
      team.u.push(u)
      team.pts+=u.pts
      all[u.color] = team 
      
      return all 
    },{})
  }

  get current () {
    let [id,ui] = this.state.selection.get("active-unit") || []
    return id ? [this.activeState[id],ui] : []
  }

  get teamCount () {
    let colors = new Set(Object.values(this.activeState).filter(o=> o.what =="ActiveUnit" && !o.uid.includes("Objects")).map(u=>u.color))
    return colors.size
  }
  
  /*
    Save / Load 
  */
  async save (where,id="",data) {
    if(!DB[where] || id == "") return
    
    await DB[where].setItem(id,data)
    
    this.state.saved[where] = {}
    //unit - [symbol,name,hd,ac,move,[atks],img]
    DB[where].iterate((data,key) => {
       this.state.saved[where][key] = data
    }).then(_ => {
      this.refresh()
    })
  }

  async load (where,id="",destination) {
    let data = await DB[where].getItem(id)
    this.updateState(destination,data)
  }

  async delete (where,id) {
    DB[where].removeItem(id)
    delete this.state.saved[where][id]
    this.refresh()
  }

  /*
    Game Functions 
  */

  roll () {
    let [nd=1,sv=5] = this.state.selection.get("dice") || []
    let res = chance.rpg(nd+"d6")
    let ns = res.filter(r=>r>=sv).length
    this.notify(`<div class="tc">Roll: `+res+`${ns>0?` [${sv}+ = ${ns}]`:''}</span>`)
  }

  start (team) {
    this.state.initiative = team
    //reset moves/actions 
    Object.values(this.activeState).filter(o=> o.what =="ActiveUnit").forEach(u => u.newRound())
  } 

  nextRound (team) {
    this.state.round++ 
    //reset moves/actions 
    Object.values(this.activeState).filter(o=> o.what =="ActiveUnit").forEach(u => u.newRound())
  }

  //clears current battle 
  cancel () {
    this.state.initiative = ""
    this.show = ""
    this.dialog = ""
  }

  removeUnit (id) {

  }

  /*
    Render 
  */

  //main page render 
  render({}, {show,active,reveal,selection,initiative,round}) {
    let {teamCount,units,map} = this 
    let view = show.split(".")[0]
    let [nd=1,sv=5] = selection.get("dice") || []

    const rfSet = (key,d) => this.refresh(selection.set(key,d))

    const LeftUI = html`
    <div style="width:300px">
      <div class="w-100 flex items-center justify-between tc ba pa1 mb1">
        <div class="w-third pointer dim underline-hover b bg-light-green br2 pa2" onClick=${()=>this.roll()}>Roll</div>
        <div class="w-third dropdown">
          <div class="b pointer dim bg-light-gray br2 pa2">${nd}d6</div>
          <div class="w-100 dropdown-content bg-white pa1">
            ${_.fromN(10,i=>html`<div class="pointer dim underline-hover b tc bg-light-gray br2 mb1" onClick=${()=>rfSet("dice",[i+1,sv])}>${i+1}d6</div>`)}
          </div>
        </div>
        <div class="dropdown">
          <div class="b pointer dim bg-light-gray br2 pa2">Success ${sv}+</div>
          <div class="w-100 dropdown-content bg-white pa1">
            ${_.fromN(5,i=>html`<div class="pointer dim underline-hover b tc bg-light-gray br2 mb1" onClick=${()=>rfSet("dice",[nd,i+2])}>${i+2}+</div>`)}
          </div>
        </div>
      </div>
      <div class="flex">
        <h4 class="w-100 bg-light-gray ma0 pa2">Units</h4>
        <h4 class="pointer dim underline-hover b bg-light-gray ma0 pa2" onClick=${()=> this.refresh(this.toggle("add-unit"))}>${reveal.has("add-unit") ? "-" : "+"}</h4>
      </div>
      <div class="${reveal.has("add-unit") ? 'flex': 'dn'}">
        ${UI.UnitSelect(this)}
      </div>
      <div class="${reveal.has("add-unit") ? 'flex items-center': 'dn'}">
        <div>Team Color</div>
        <select class="w-100 pa1" value=${selection.get("team-color")} onChange=${(e)=> selection.set("team-color",e.target.value)}>
          ${Colors.map(key => html`<option class="tc b" value=${key} style="${'color:'+key}"><span class="dib square-sm" style="${'background:'+key}"></span>${key}</option>`)}
        </select>
      </div>
      <div class="${reveal.has("add-unit") ? '': 'dn'} pointer dim tc b bg-light-green br2 pa2" onClick=${()=> new ActiveUnit(this,selection.get("unit-faction"),selection.get("unit-add"),selection.get("team-color"))}>Add</div>
      <div class="mv1">
        ${Object.entries(units).map(([key,team])=> html`
        <h4 class="flex ma0">${initiative==key?"➢":""}<span class="dib square-sm" style="${'background:'+key}"></span>${_.capitalize(key)}${team.pts==0?"":` [${team.pts} pts]`}</h4>
        ${team.u.map(u=>u.tableUI)}`)}
      </div>
    </div>
    `

    //final layout 
    return html`
    <div class="relative flex flex-wrap items-center justify-between ph3 z-2">
      <div>
        <h1 class="pointer underline-hover mv2" onClick=${()=>this.cancel()}>Wartable</h1>
      </div>
      <div class="dropdown rtl">
        <div class="f4 b pointer link dim bg-light-gray br2 pa2">⚙</div>
        <div class="f4 rtl w-100 dropdown-content bg-white-70 db ba bw1 pa1">
          <div class="tc link pointer dim underline-hover hover-orange bg-white-70 db br2 mv1 pa2" onClick=${()=>this.dialog = "OPRUnitEditor"}>Unit Editor</div>
        </div>
      </div>
    </div>
    <div class="center absolute z-1 pa2">
      <div class="flex justify-center">
        ${LeftUI}
        <div class="mh2">
          <div class="flex items-center justify-between">
            <div class="pointer dropdown">
              <h3 class="ma0">${map ? `${_.capitalize(map.style)} ${map.seed}` : ""} ↺</h3>
              <div class="dropdown-content bg-white-70 db ba bw1 pa1">
                ${mapStyles.map(s => html`<div class="tc pointer dim underline-hover hover-orange bg-white-70 db br2 mv1 pa2" onClick=${()=>this.map=new TileMap(this, chance.natural(), {style:s})}>${s}</div>`)}
              </div>
            </div>
            <div class="b ${initiative==""?"dn":""}">Round: ${round}</div>
            <div>
              <div class="pointer dropdown mb1 ${teamCount > 1 ? "" : "dn"}">
                <div class="pointer dim tc b bg-light-blue br2 pa2">${initiative==""?"Start Play":`${_.capitalize(initiative)}'s Turn`}</div>
                <div class="dropdown-content bg-white db ba pa1">
                  ${Object.entries(units).map(([key,team])=>initiative==key ? "" : html`<div class="tc pointer dim underline-hover hover-orange bg-white-70 db br2 pa1" onClick=${()=>initiative==""?this.start(key) : this.state.initiative = key}>${_.capitalize(key)}${initiative==""?" first":"'s turn"}</div>`)}
                  <div class="tc pointer dim underline-hover hover-orange bg-white-70 br2 pa1 ${initiative==""?"dn":"db"}" onClick=${()=>this.nextRound()}>Next Round</div>
                </div>
              </div>
              <div class="pointer dim underline-hover i b ba br2 pa1 ph2 mb1" onClick=${()=>this.dialog = "About"}>i</div>
            </div>
          </div>
          <div id="engine" class="pointer" onClick=${e => this.map.onClick(e)} onpointermove=${e => this.map.onPointer(e)}></div>
        </div>
      </div>
      ${this.show}
    </div>
    ${this.dialog}
    <div id="footer">
      <div>This is a fan made project by xPaladin.</div>
    </div>
    `
  }
}

render(html`<${App}/>`, document.getElementById("app"));



