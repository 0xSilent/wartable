import {Units,ActiveUnit} from './units.js'

/*
  UI Resources  
*/
export const UnitSelect = (app) =>{
  let {rules,selection,saved} = app.state
  let _f = selection.get("unit-faction")
  let factions = Object.keys(Units[rules])
  let uids = _f == "Saved" ? saved.Units : Units[rules][_f] 
  
  return _.html`
    <select class="pa1" value=${selection.get("unit-faction")} onChange=${(e)=> selection.set("unit-faction",e.target.value)}>
      <option value="Saved">Saved</option>
      ${factions.map(key => _.html`<option value=${key}>${key}</option>`)}
    </select>
    <select class="w-100 tc pa1" value=${selection.get("unit-add")} onChange=${(e)=> selection.set("unit-add",e.target.value)}>
      ${uids.map((id,i) => _.html`<option value=${i}>${id}</option>`)}
    </select>
    `
} 

/*
  About 
*/

const About = (app) => {
  let _h = _.html
  return _h`
  <div class="pa1" style="width:1000px;max-height: 85vh;">
    <div class="fr pointer dim underline-hover ba br2 pa2 mr2" onClick=${()=>app.dialog=""}>X</div>
    <h2>About</h2>
    <p>The Wartable is a tool for solo-play supporting <a href="https://www.onepagerules.com/" target="_blank">One Page Rules'</a> Grimdark Future and Age of Fantasy.  
    It offers a rogue-style console display where all units and terrain are represented by single characters. 
    Units can be added to teams based upon color and then they can be placed and moved around the board. 
    The app aids in basic attack attack calculations (i.e. determine hits and wounds), and you can use it to roll arbitrary dice pools and count successes.</p>
    <p>You still need to have the official rulles and the faction specific rules with this app. There is no AI to determine unit actions or account for status, damage, morale, etc.</p>
    <h3>Current Features</h3>
    <ul>
      <li>Random Map Creation</li>
      <li>Unique unit creation</li>
      <li>Teams by color</li>
      <li>Team Point Tracking</li>
      <li>Unit placement</li>
      <li>Objective Placement</li>
      <li>Range bands for movement and attacks</li>
      <li>Player selected initiative and round tracking</li>
      <li>Tracking of Tough by unit</li>
      <li>Basic attack calculations</li>
    </ul>
    <h3>Attacking</h3>
    <p>Move the attacking unit within range of the target unit - as indicated by the range. 
    Select the target and the app will roll the correct number of attack dice and account for the target's defense to calculate the number of wounds. 
    The app accounts for the following special conditions/abilities: Blast, Poison, Reliable, Rending, and Sniper. It also notifies for Deadly and rolls for Regeneration.</p>
    <h3>Active Factions</h3>
    <h4><a href="https://army-forge.onepagerules.com/armyBookSelection?gameSystem=2" target="_blank">Grimdark Future</a></h4>
    <div>Alien Hives, Battle Brothers, DAO Union, Dark Elf Raiders, Havoc Brothers, High Elf Fleets, Human Defense Force, Orc Marauders, Robot Legions, Saurian Starhost</div>
    <h4><a href="https://army-forge.onepagerules.com/armyBookSelection?gameSystem=4" target="_blank">Age of Fantasy</a></h4>
    <div>Beastmen, Chivalrous Kingdoms, Dark Elves, Dwarves, Eternal Wardens, Ghostly Undead, Goblins, Havoc Warriors, High Elves, Kingdom of Angels, Mummified Undead, Orcs, Saurians, Vampiric Undead, Wood Elves</div>
  </div>
  `
}

/*
  Unit Editor 
  Create / Edit Units 
*/
const OSRUnitEditor = (app)=>{
  const {html, state} = app
  let {saved, selected} = app.state
  let nu = app.state.newData || {
    d : [],
    atk : [[]]
  }

  //generic input field 
  const InputField = (label,val,set,ph="",w=100)=>html`
  <div class="flex items-center mh1 w-${w}">
    <div class="b ph1">${label}</div>
    <input class="w-100" type="text" placeholder=${ph} value=${val} onInput=${(e)=>set(e.target.value)}></input>
  </div>`

  /*
    unit - [symbol,name,hd,ac,move,[atks],special,img]
    atk - [name,range,bonus,atk chain]
  */
  return html`
  <div>
    <div class="flex items-center">
      <select class="w-100 pa1" value=${selected} onChange=${(e)=> app.updateState("selected",e.target.value)}>
        ${Object.values(saved.Units).map(u => html`<option value=${u.id}>${u.d[1]}</option>`)}
      </select>
      <div class="b white tc link pointer dim underline-hover hover-orange bg-green db br2 mv1 pa2" onClick=${()=>app.load("Units",selected,"newData")}>Load</div>
      <div class="b white tc link pointer dim underline-hover hover-orange bg-red db br2 mh1 pa2 ${selected == "" ? "hidden" : ""}" onClick=${()=>app.delete("Units",selected)}>Delete</div>
    </div>
    <div class="flex mv1">
      ${InputField("ID", nu.id, (v)=>nu.id = v)}
      ${InputField("Name", nu.d[1], (v)=>nu.d[1] = v)}
    </div>
    <div class="flex">${InputField("Tags", nu.tags, (v)=>nu.tags = v, 'Single words separated by a ","')}</div>
    <div class="flex">
      ${InputField("Symbol", nu.d[0], (v)=>nu.d[0] = v,"",10)}
      ${InputField("Image Source", nu.img, (v)=>nu.img = v,"",90)}
    </div>
    <div class="w-100 flex mv1"> 
      ${InputField("HD", nu.d[2], (v)=>nu.d[2] = v, "XdY+b")}
      ${InputField("AC", nu.d[3], (v)=>nu.d[3] = v)}
      ${InputField("Move", nu.d[4], (v)=>nu.d[4] = v)}
    </div>
    <div>
      <div class="flex items-center justify-between">
        <div class="f4 b">Attacks</div>
        <div class="b white tc link pointer dim underline-hover hover-orange bg-green db br2 mv1 pa2" onClick=${()=>app.updateState("newData",nu,nu.atk.push([]))}>Add</div>
      </div>
      ${nu.atk.map((a,i)=>html`
      <div class="flex items-center">
        ${InputField("Name", a[0], (v)=>nu.atk[i][0] = v, "", 40)}
        ${InputField("Bonus", a[2], (v)=>nu.atk[i][2] = v, "", 10)}
        ${InputField("Range", a[1], (v)=>nu.atk[i][1] = v, "", 10)}
        ${InputField("Dice", a[3], (v)=>nu.atk[i][3] = v, "XdY+b/XdY+b/...", 40)}
        <div class="b red tc link pointer dim underline-hover hover-orange ph2" onClick=${()=>app.updateState("newData",nu,nu.atk.splice(i,1))}>✗</div>
      </div>`)}
    </div>
    <div class="b white tc link pointer dim underline-hover hover-orange bg-green db br2 mv1 pa2" onClick=${()=>app.save("Units", nu.id, nu)}>Save</div>
    <div class="b white tc link pointer dim underline-hover hover-orange bg-green db br2 mv1 pa2" onClick=${()=>app.cancel()}>Close</div>
  </div>
  `
}

const OPRUnitEditor = (app)=>{
  let DB = app.db.Units
  let {selection,saved} = app.state
  let U = selection.get("unit-edit") || {}

  const load = async () => app.refresh(selection.set("unit-edit",await ActiveUnit.unitData(selection.get("unit-faction"),selection.get("unit-add"))))
  const save = () => {
    let keys = ["f","id","n","q","def","pts","_eq","_sp"]
    let u = Object.fromEntries(keys.map(k=>[k,U[k]]))
    DB.setItem(u.id,u)
    saved[u.id] = u.f
    console.log(u)
  }

  //generic input field 
  const InputField = (label,val,set,ph="",w=100)=>_.html`
  <div class="flex items-center mh1">
    <div class="b mr2">${label}</div>
    <input class="w-100 rtl" type="text" placeholder=${ph} value=${val} onInput=${(e)=>set(e.target.value)}></input>
  </div>`

  /*
    unit - [symbol,name,hd,ac,move,[atks],special,img]
    atk - [name,range,bonus,atk chain]
  */
  return _.html`
  <div style="width:800px;">
    <div class="flex items-center">
      ${UnitSelect(app)}
      <div class="b white tc link pointer dim underline-hover hover-orange bg-green db br1 pa2" onClick=${()=>load()}>Load</div>
    </div>
    <div class="flex mv1">
      <select class="pa1" value=${U.f||"Personal"} onChange=${(e)=> U.f = e.target.value}>
        <option value="Personal">Personal</option>
        ${Object.keys(Units).map(key => _.html`<option value=${key}>${key}</option>`)}
      </select>
      ${InputField("ID",U.id,(v)=>U.id = v)}
      ${InputField("#",U.n,(v)=>U.n = v)}
      ${InputField("Q",U.q,(v)=>U.q = v)}
      ${InputField("Def",U.def,(v)=>U.def = v)}
      ${InputField("pts",U.pts,(v)=>U.pts = v)}
    </div>
    <div>
      ${InputField("Equipment",U._eq,(v)=>U._eq = v)}
      ${InputField("Special",U._sp,(v)=>U._sp = v)}
    </div>
    <div class="b white tc link pointer dim underline-hover hover-orange bg-green db br2 mv1 pa2" onClick=${()=>save()}>Save</div>
    <div class="b white tc link pointer dim underline-hover hover-orange bg-green db br2 mv1 pa2" onClick=${()=>app.cancel()}>Close</div>
  </div>
  `
}


const D = {
  OPRUnitEditor,
  About
}
export const Dialog = (app)=>{
  let[what,id,ui] = app.state.dialog.split(".")

  return app.html`
  <div class="fixed z-2 top-1 left-1 bottom-1 right-1 flex items-center justify-center">
    <div class="overflow-y-auto o-90 bg-washed-blue br3 shadow-5 pa2">
      ${app[what] ? app[what][id][ui] : D[what] ? D[what](app) : ""}
    </div>
  </div>`
}

