/*
  V0.3
*/

/*
  Storage - localforage
  https://localforage.github.io/localForage/
*/
import "../lib/localforage.min.js"
const DB = {}
DB.Games = localforage.createInstance({
  name: "Explorations"
});

/*
  Chance RNG
*/
import "../lib/chance.min.js"
import {BuildArray, SpliceOrPush} from "./random.js"
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
const html = htm.bind(h);

/*
  Factions 
*/

import * as Factions from './factions.js'

/*
  App Sub UI
*/
import*as UI from './UI.js';
import {TileMap} from "./map.js"

/*
  Colors 
*/
const Colors = ["aquamarine","beige","blue","chartreuse","coral","cyan","fuchsia","gold","hotpink","indigo","magenta","olive","orange","pink","purple","red","salmon","teal","violet","yellow"]

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
      show: "",
      reveal: [],
      dialog: "Main",
      savedGames: [],
      //for UI selection 
      toGenerate: "",
      selection : "",
      selected: "",
      //active forces 
      active : [],
      initiative : [],
      ci : 0,
    };

    //use in other views 
    this.html = html
    this.colors = Colors
    this.map = null
    this.game = Game

    //data 
    this.factions = Factions

    //generator 
    this.gen = {
      TileMap
    }
  }

  // Lifecycle: Called whenever our component is created
  async componentDidMount() {
    //options for ROT canvas 
    let o = {
      width: 48,
      height: 48,
      fontSize: 12,
      forceSquareRatio:true
    }
    //get display and append it to the engine 
    this.engine = new ROT.Display(o);
    document.getElementById("engine").appendChild(this.engine.getContainer());

    //show random 
    this.map = new TileMap(this)
    this.map.draw()
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {}

  /*
    Render functions 
  */

  notify(text, type="success") {
    let opts = {
      theme: "relax",
      type,
      text,
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
  }

  set show(what) {
    this.updateState("show", what)
  }

  get show() {
    let[what,id] = this.state.show.split(".")
    return UI[what] ? UI[what](this) : this[what] ? this[what][id].UI ? this[what][id].UI() : "" : ""
  }

  set dialog(what) {
    this.updateState("dialog", what)
  }

  get dialog() {
    let[what,id] = this.state.dialog.split(".")
    return what == "" ? "" : UI.Dialog(this)
  }

  /*
    Game Functions 
  */

  get units () {
    let all = this.state.active.map(f => f[1].units).flat()
    return Object.fromEntries(all.map(u => [u.id,u]))
  }

  get unit () {
    return this.units[this.state.selected]
  }

  get current () {
    let {ci,initiative} = this.state 
    return initiative.length == 0 ? null : this.map.units.find(u => u.id == initiative[ci])
  }

  async nextInitiative () {
    let {ci,initiative} = this.state 
    let newI = ci+1 == initiative.length ? 0 : ci+1 
    await this.updateState("ci", newI)
    //remove history from unit 
    if(this.current.hp > 0){
      this.current.history = [] 
      this.refresh()
    }
    else {
      this.nextInitiative()
    }
  }

  startBattle(seed,size) {
    let {selected} = this.state

    //map 
    this.map = new TileMap(this,seed,size)
    this.state.active = selected.map((id,i) => {
      let f = new Factions.Force(this,Factions.Forces[Number(id)]) 
      f.color = chance.pickone(Colors)
      return [i%2,f]
    })
    //place 
    this.map.placeFactions()
    //set initiative 
    this.state.initiative = chance.shuffle(this.map.units.map(u=>u.id))
    //set starting vs and place 
    this.state.active.forEach(([lr,f],i)=> f.setVs(i))
    //redraw 
    this.map.draw()

    //reset 
    this.updateState("toGenerate","")
    this.updateState("selected","")
    this.dialog = ""
  }

  /*
    Render 
  */

  //main page render 
  render({}, {show,active}) {
    let {current} = this 
    let view = show.split(".")[0]

    let left = active.filter(a => a[0] == 0).map(a=>a[1])
    let right = active.filter(a => a[0] == 1).map(a=>a[1])

    const unitActions = () => html`
    ${current.history.length > 0 ? html`<div class="white b tc pointer dim underline-hover bg-green db br2 mv1 pa2" onClick=${()=>current.takeAction("u",null)}>Undo</div>` : ""}
    <div class="flex items-center">
      <div class="flex items-center f4 b mh1">${current.name}${current.history.map(h=> html`<div class="bg-green br2" style="height: 7px;width: 7px;"></div>`)}</div>
      <div class="dropdown ${current.history.length >=2 ? "hidden" : ""}">
        <div class="flex items-center b pointer underline-hover ba br2 mh1 pa2">${current.act[2]}</div>
        <div class="dropdown-content w-100 bg-white ba bw1 pa1">
          ${current.actions.map((a,i)=> html`<div class="link pointer underline-hover hover-red" onClick=${()=>this.refresh(current._act = i)}>${a[2]}</div>`)}
        </div>
      </div>
    </div>
    <div class="white b tc pointer dim underline-hover bg-green db br2 mv1 pa2" onClick=${()=>this.nextInitiative()}>Next</div>
    `

    //final layout 
    return html`
    <div class="relative flex flex-wrap items-center justify-between ph3 z-2">
      <div>
        <h1 class="pointer underline-hover mv2" onClick=${()=>this.dialog = "Main"}>Wartable</h1>
      </div>
      <div class="flex items-center">
      </div>
    </div>
    <div class="absolute z-1 w-100 pa2">
      <div class="flex justify-center">
        <div id="left">${left.map(f => f.UI)}</div>
        <div>
          <div class="flex items-center justify-center">${current ? unitActions() : ""}</div>
          <div id="engine" class="pointer mh2" onClick=${e => this.map.onClick(e)} onpointermove=${e => this.map.onPointer(e)}></div>
        </div>
        <div id="right">${right.map(f => f.UI)}</div>
      </div>
      ${this.show}
    </div>
    ${this.dialog}
    `
  }
}

render(html`<${App}/>`, document.getElementById("app"));


