//https://github.com/gustavopezzi/isometric-tiles-js-p5js/tree/main
//https://github.com/victorqribeiro/isocity/tree/master

const StartZone = {
  "North": (w,h)=>[3, w - 3, 0, 8],
  "East": (w,h)=>[w - 9, w - 1, 3, h - 3],
  "South": (w,h)=>[3, w - 3, h - 9, h - 1],
  "West": (w,h)=>[0, 8, 3, h - 3],
}

/*
  symbol, color 
*/
const Terrain = {
  "rock": [".", "gray", "#888"],
  "tree": ["t", "green"],
  "swamp": ["~", "aqua"],
  "water": ["~", "blue"],
  "wall": ["*", "gray"],
  "cave": ["", "gray", "#888"],
  "objective" : ["ʘ","gold"]
}

/*
  Generators for various terrain types
*/
const MapGen = {
  "wilderness"(seed, {w, h}) {
    let terrain = new Map()
    //set rng seed 
    ROT.RNG.setSeed(seed);
    var rocks = new ROT.Map.Cellular(w,h,{
      topology: 6
    });
    /* cells survive probability */
    rocks.randomize(0.4);
    rocks.create();

    //set terrain
    rocks.create((x,y,n)=>n == 1 ? terrain.set([x, y].join(), "rock") : null)

    //trees - but use 0 
    ROT.RNG.setSeed(seed + 1);
    var trees = new ROT.Map.Cellular(w,h,{
      topology: 6
    });
    /* cells survive probability */
    trees.randomize(0.82 + (ROT.RNG.getUniform() * 8 / 100));
    trees.create();

    //set terrain
    trees.create((x,y,n)=>{
      n == 1 || [0, 1, w - 1, w - 2].includes(x) || y == 0 || y == h - 1 ? null : terrain.set([x, y].join(), "tree")
    }
    )

    return {
      terrain
    }
  },
  "forest"(seed, {w, h}) {
    let terrain = new Map()

    //set rng seed 
    ROT.RNG.setSeed(seed);

    let trees = new ROT.Map.Cellular(w,h,{
      topology: 6,
      born: [4, 5, 6],
      survive: [3, 4, 5, 6]
    });
    /* cells survive probability */
    trees.randomize(0.55);
    for (var i = 0; i < 4; i++)
      {trees.create();}

    //set terrain
    let setT = (x,y,n)=>{
      n == 0 ? terrain.set([x, y].join(), "tree") : null
    }
    trees.connect(setT, 1)

    return {terrain}
  },
  "swamp"(seed, {w, h}) {
    let terrain = new Map()
    //set rng seed 
    ROT.RNG.setSeed(seed);
    let swamp = new ROT.Map.Cellular(w,h,{
      topology: 6,
      born: [4, 5, 6],
      survive: [3, 4, 5, 6]
    });
    /* cells survive probability */
    swamp.randomize(0.4);
    swamp.create();

    //set terrain
    swamp.create((x,y,n)=>n == 1 ? terrain.set([x, y].join(), "swamp") : null)

    //trees - but use 0 
    ROT.RNG.setSeed(seed + 1);
    var trees = new ROT.Map.Cellular(w,h,{
      topology: 6
    });
    /* cells survive probability */
    trees.randomize(0.82 + (ROT.RNG.getUniform() * 8 / 100));
    trees.create();

    //set terrain
    trees.create((x,y,n)=>{
      n == 1 || [0, 1, w - 1, w - 2].includes(x) || y == 0 || y == h - 1 ? null : terrain.set([x, y].join(), "tree")
    }
    )

    return {terrain}
  },
  "cave"(seed, {w, h}) {
    let terrain = new Map()

    //set rng seed 
    ROT.RNG.setSeed(seed);

    var water = new ROT.Map.Cellular(w,h,{
      topology: 6
    });
    /* cells survive probability */
    water.randomize(0.3);
    //set terrain
    water.create((x,y,n)=>n == 1 ? terrain.set([x, y].join(), "water") : null)

    let cave = new ROT.Map.Cellular(w,h,{
      topology: 6,
      born: [4, 5, 6],
      survive: [3, 4, 5, 6]
    });
    /* cells survive probability */
    cave.randomize(0.53);
    for (var i = 0; i < 4; i++) {
      cave.create();
    }

    //set terrain
    let setT = (x,y,n)=>{
      n == 0 ? terrain.set([x, y].join(), "cave") : null
    }
    cave.connect(setT, 1)

    return {
      terrain
    }
  },
  "buildings"(seed, {w, h}) {
    let terrain = new Map()
    //set rng seed 
    ROT.RNG.setSeed(seed);
    //digger 
    let map = new ROT.Map.Digger(w,h,{
      roomWidth: [5, 15],
      roomHeight: [5, 15],
      corridorLength: [0, 0],
      dugPercentage: 0.35
    });
    let _rooms = map.create().getRooms();
    _rooms.forEach(r=>{
      let[xmin,xmax,ymin,ymax] = [r.getLeft(), r.getRight(), r.getTop(), r.getBottom()]
      //top walls 
      _.fromN(xmax - xmin, i=>{
        terrain.set([xmin + i, ymin].join(), "wall")
        terrain.set([xmin + i, ymax].join(), "wall")
      }
      )
      //side walls 
      _.fromN(ymax - ymin + 1, i=>{
        terrain.set([xmin, ymin + i].join(), "wall")
        terrain.set([xmax, ymin + i].join(), "wall")
      }
      )
    }
    )

    return {
      terrain
    }
  },
  "dungeon"(seed, {w, h}) {
    let terrain = new Map()
    //set rng seed 
    ROT.RNG.setSeed(seed);
    //digger 
    let map = new ROT.Map.Digger(w,h,{
      roomWidth: [5, 15],
      roomHeight: [5, 15],
      corridorLength: [0, 0],
      dugPercentage: 0.35
    });
    let _map = map.create((x,y,n)=>n == 1 ? terrain.set([x, y].join(), "cave") : null)
    let rooms = _map.getRooms()

    return {
      terrain,
      rooms
    }
  },
  "complex"(seed, {w, h}) {
    let terrain = new Map()
    //set rng seed 
    ROT.RNG.setSeed(seed);
    //digger 
    let map = new ROT.Map.Digger(w,h,{
      roomWidth: [5, 20],
      roomHeight: [5, 20],
      corridorLength: [0, 0],
      dugPercentage: 0.7
    });
    let _map = map.create((x,y,n)=>n == 1 ? terrain.set([x, y].join(), "cave") : null)
    let rooms = _map.getRooms()

    return {
      terrain,
      rooms
    }
  }
}

export const mapStyles = Object.keys(MapGen)

class TileMap {
  constructor(app, seed=chance.natural(), opts={}) {
    let {w=72, h=48, style="wilderness"} = opts
    this.app = app
    this.seed = seed

    this.style = style
    //layout and size 
    this.layout = ["complex", "dungeon", "buildings"].includes(style) ? "rect" : "hex"
    w *= this.layout == "hex" ? 2 : 1
    this.size = {
      w,
      h
    }

    let {terrain, rooms, obj} = MapGen[style](seed, this.size)
    this.terrain = terrain
    this.rooms = rooms || null
  }

  get units() {
    return Object.values(this.app.activeState).filter(o=>o.what == "ActiveUnit")
  }

  //get a symbol at a position 
  atPosition(x, y) {
    let xy = [x, y].join()
    let units = new Map(this.units.map(U=>U.p.map((p,i)=>[p.join(), [i, U]])).flat())
    return this.terrain.has(xy) ? ["t", [x, y, ...Terrain[this.terrain.get(xy)]], this.terrain.get(xy)] : units.has(xy) ? ["u", ...units.get(xy)] : [null]
  }

  randomPoint = (where="North")=>{
    //available positions 
    let[xmin,xmax,ymin,ymax] = StartZone[where](this.size.w, this.size.h)
    //get p based upon start
    let y = chance.randBetween(ymin, ymax)
    let x = chance.randBetween(xmin, xmax)
    //for hex every y has to have even x and odd y has odd x 
    return this.layout == "hex" ? [y % 2 == 0 && x % 2 == 1 ? x + 1 : y % 2 == 1 && x % 2 == 0 ? x + 1 : x, y] : [x, y]
  }

  placeUnits(U, i=0) {
    let placed = this.units.map(u=>u.p.map(p=>p.join(","))).flat()

    //pick a room if they exist 
    let _room = this.rooms ? chance.pickone(this.rooms) : null
    let useRoom = ()=>{
      let {_x1, _x2, _y1, _y2} = _room
      return [chance.randBetween(_x1, _x2), chance.randBetween(_y1, _y2)]
    }
    //assign positions 
    let side = ["North", "South"][i%2]
    let setStart = ()=>this.rooms ? useRoom() : this.randomPoint(side)
    let around = (p)=>{
      let _n = this.layout == "hex" ? [[-2, 0], [2, 0], [-1, -1], [1, 1], [-1, 1], [1, -1]] : [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]
      return _room ? useRoom() : chance.pickone(_n).map((v,j)=>p[j] + v)
    }

    let _start = setStart();
    let p = _start
    _.fromN(U.p.length, j=>{
      let k = 0
      while (this.terrain.has(p.join()) || placed.includes(p.join()) || p[0] < 0 || p[1] < 0 || p[0] > this.size.w - 1 || p[1] > this.size.h - 1) {
        p = around(p)
        k++
        if (k == 8) {
          p = _start
          k = 0
        }
      }
      U.p[j] = p.slice()
      placed.push(p.join())
    }
    )
  }

  onClick(e) {
    let {engine, current=[]} = this.app
    let {initiative, history, selection} = this.app.state
    let[x,y] = engine.eventToPosition(e)
    let xy = [x, y].join()

    let[_id,_ui,ai] = selection.get("active-unit") || []
    let atP = this.atPosition(x, y)
    console.log([x, y, ...atP])

    //select clicked unit 
    const _selectU = ()=>{
      this.app.refresh(selection.set("active-unit", [atP[2].id, atP[1], -1]))
      this.draw()
    }

    if (current[0] && initiative == "") {
      //free move if no initiative 
      atP[0] == null ? current[0].moveTo(current[1], x, y) : null
      atP[0] == "u" ? _selectU() : null
    } else if (current[0] && initiative == current[0].color && current[0].withinActionRange.includes(xy)) {
      //with initiative - what to do if in range 
      //select friendly 
      if (atP[0] == "u" && atP[2].id == _id) {
        _selectU()
      }//move
      else if (ai == -1 && atP[0] == null) {
        current[0].moveTo(current[1], x, y)
      }//attack
      else if (ai != -1 && atP[0] == "u" && atP[2].id != _id) {
        current[0].attack(atP.slice(1))
      }
    } else if (atP[0] == "u" && initiative == atP[2].color) {
      _selectU()
    }
  }
  onPointer(e) {
    return
  }
  async draw(pointer=null) {
    let {current=[], units} = this.app
    let {selected, initiative} = this.app.state
    let {w, h} = this.size

    //options for ROT canvas 
    let o = {
      width: w,
      height: h,
      layout: this.layout
    }
    if (this.layout == "hex") {
      o.spacing = 0.9
      o.fontSize = 14
    } else {
      o.fontSize = 14
      o.forceSquareRatio = true
    }
    this.app.engine.setOptions(o);
    //get display and append it to the engine 
    let engine = this.app.engine
    engine.clear()
    let el = document.getElementById("engine")
    el.innerHTML = "";
    el.appendChild(engine.getContainer());

    if (current[0] && initiative == current[0].color) {
      //draw action area range
      let _r = current[0] ? current[0].withinActionRange : []
      _r.forEach(p=>engine.draw(...p.split(",").map(Number), "", "", "#660"))
    }

    //draw terrain  
    const lookOver = ["swamp", "water"]
    this.terrain.forEach((t,xy)=>{
      let[x,y] = xy.split(",").map(Number)
      engine.draw(x, y, ...Terrain[t])
    }
    )

    //draw units 
    Object.values(units).forEach(team=>team.u.forEach(u=>u.draw(engine)))

    if (pointer) {
      engine.draw(...pointer)
    }
  }
}

export {TileMap}
