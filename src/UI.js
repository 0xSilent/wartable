/*
  Useful Functions 
*/
import {BuildArray, SpliceOrPush, chance} from "./random.js"

/*
  UI Resources  
*/

const Main = (app)=>{
  const {html} = app
  const {savedGames} = app.state 

  return html`
  <div class="flex flex-column justify-center m-auto mw6">
    <div class="f3 tc link pointer dim underline-hover hover-orange bg-white-70 db br2 mv1 pa2" onClick=${()=>app.dialog = "BattleBuilder"}><i>Batle!</i></div>
    <div class="f3 tc link pointer dim underline-hover hover-orange bg-white-70 db br2 mv1 pa2" onClick=${()=>app.dialog = "MapEditor"}>Map Editor</div>
    <div class="f3 tc link pointer dim underline-hover hover-orange bg-white-70 db br2 mv1 pa2" onClick=${()=>app.dialog = "ForceEditor"}>Force Editor</div>
    <a class="f4 tc link black pointer dim underline-hover hover-orange bg-white-70 db br2 mv1 pa2" href="index.html">Shape the Planes</div>
    <a class="f4 tc link black pointer dim underline-hover hover-orange bg-white-70 db br2 mv1 pa2" href="explorer.html">Explore the Planes</div>
  </div>
  `
}

/*
  Battle Builder 
  Display available Factions and Forces 
  Add Map Size and Type 
*/
const BattleBuilder = (app)=>{
  const {html,factions} = app
  let {selected, selection, toGenerate = ""} = app.state
  selected = selected == "" ? [] : selected

  //seed for map generation 
  let [seed,size = 48] = toGenerate.split(",")
  seed = seed == "" ? chance.natural() : seed 

  //select a force
  const ModForce = (what) => {
    what == -1 ? selected.push(selection) : selected.splice(what,1) 
    app.updateState("selected",selected)
  }

  return html`
  <div class="flex">
    <div class="flex flex-column ma1">
      <h3 class="tc ma0">Forces</h3>
      <div class="flex ${selected.length < 4 ? "" : "hidden"}">
        <select value=${selection} onChange=${(e)=> app.updateState("selection",e.target.value)}>
          ${factions.Forces.map((f,i) => html`<option value=${i}>${f.name} ${f.cost} pts</option>`)}
        </select>
        <div class="f5 b tc link pointer dim underline-hover hover-blue bg-green pa2" onClick=${()=> ModForce(-1)}>Add</div>  
      </div>
      ${selected.map((id,i) => [i,factions.Forces[Number(id)]]).map(([i,f]) => html`<div class="flex justify-between pa1"><div>${f.name} ${f.cost} pts</div> <div class="b red pointer" onClick=${()=>ModForce(i)}>✗</div></div>`)}
    </div>
    <div class="flex flex-column ma1">
      <h3 class="tc ma0">Map</h3>
      <div class="flex">
        <span class="b w-20 pa1">Seed</span>
        <input class="f6 w-80 tc pa1 " type="number" step="1" min="0" max="9007199254740991" value=${seed} onChange=${(e)=> app.updateState("toGenerate",[e.target.value,size].join())}></input>
      </div>
      <div class="flex">
        <span class="b w-20 pa1">Scale</span>
        <input class="w-80 tc pa1" type="number" step="6" min="36" max="128" value=${size} onChange=${(e)=> app.updateState("toGenerate",[seed,e.target.value].join())}></input>
      </div>
    </div>
  </div>
  <div class="f5 b tc link pointer dim underline-hover hover-orange bg-green br2 mt1 pa2 ${selected.length < 2 ? "hidden" : ""}"  onClick=${()=>app.startBattle(seed,size)}>Battle!</div>  
  <div class="f5 white b tc link pointer dim underline-hover hover-orange bg-gray br2 mv1 pa2"  onClick=${()=>app.dialog = "Main"}>Cancel</div>  
  `
}

//Map Editor 
const MapEditor = (app)=>{
  const {html} = app
  const {toGenerate = ""} = app.state

  let [seed,size = 32] = toGenerate.split(",")
  seed = seed == "" ? chance.natural() : seed 

  app.map = new app.gen.TileMap(seed,size)

  return html`
  <div class="flex">
    <div class="flex flex-column">
      <div class="flex">
        <span class="b w-20 pa1">Seed</span>
        <input class="f6 w-80 tc pa1 " type="number" step="1" min="0" max="9007199254740991" value=${seed} onChange=${(e)=> app.updateState("toGenerate",[e.target.value,size].join())}></input>
      </div>
      <div class="flex">
        <span class="b w-20 pa1">Scale</span>
        <input class="w-80 tc pa1" type="number" step="8" min="32" max="128" value=${size} onChange=${(e)=> app.updateState("toGenerate",[seed,e.target.value].join())}></input>
      </div>
      <div class="f5 b tc link pointer dim underline-hover hover-orange bg-green br2 mt1 pa2"  onClick=${()=>app.dialog = "Main"}>Save</div>  
      <div class="f5 b tc link pointer dim underline-hover hover-orange bg-gray br2 mv1 pa2"  onClick=${()=>app.dialog = "Main"}>Close</div>  
    </div>
    <div class="flex justify-center">
    </div>
  </div>
  `
}

const D = {Main,MapEditor,BattleBuilder}
const Dialog = (app)=>{
  let[what,id,ui] = app.state.dialog.split(".")

  return app.html`
  <div class="fixed z-2 top-1 left-1 bottom-1 right-1 flex items-center justify-center">
    <div class="overflow-y-auto o-90 bg-washed-blue br3 shadow-5 pa2">
      ${app[what] ? app[what][id][ui] : D[what] ? D[what](app) : ""}
    </div>
  </div>`
}

export {Main, Dialog}
