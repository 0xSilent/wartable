import {RandBetween,BuildArray} from "./random.js"

//https://github.com/gustavopezzi/isometric-tiles-js-p5js/tree/main
//https://github.com/victorqribeiro/isocity/tree/master

const SetMinMax = (full,span)=>[Math.round(full / 2) - span / 2, Math.round(full / 2) + span / 2]
const StartZone = {
  "North": (w,h)=>[...SetMinMax(w, 10), 0, 4],
  "East": (w,h)=>[w - 5, w-1, ...SetMinMax(h, 10)],
  "South": (w,h)=>[...SetMinMax(w, 10), h - 5, h-1],
  "West": (w,h)=>[0, 4, ...SetMinMax(h, 10)],
}

/*
  symbol, color 
*/
const Terrain = {
  "rock": [".", "gray"],
  "tree": ["t", "green"]
}

/*
  Generators for various terrain types
*/
const MapGen = {
  "wilderness"(seed, size) {
    let terrain = new Map()
    //set rng seed 
    ROT.RNG.setSeed(seed);
    var rocks = new ROT.Map.Cellular(size,size);
    /* cells survive probability */
    rocks.randomize(0.3);
    /* make a few generations */
    for (var i = 0; i < 4; i++)
      rocks.create();

    //set terrain
    rocks.create((x,y,n)=>n == 1 ? terrain.set([x, y].join(), "rock") : null)

    //trees - but use 0 
    ROT.RNG.setSeed(seed + 1);
    var trees = new ROT.Map.Cellular(size,size);
    /* cells survive probability */
    trees.randomize(0.65);
    /* make a few generations */
    for (var i = 0; i < 4; i++)
      trees.create();

    //set terrain
    trees.create((x,y,n)=>{
      n == 0 ? terrain.set([x, y].join(), "tree") : null
    }
    )

    return terrain
  },
  "forest"() {},
  "swamp"() {},
  "cave"() {},
  "dungeon"() {}
}

class TileMap {
  constructor(app, seed=chance.natural(), size=48, style="wilderness") {
    this.app = app
    this.seed = seed
    this.size = size

    this.terrain = MapGen[style](seed, size)
  }
  get units () {
    return this.app.state.active.map(f => f[1].units).flat()
  }

  //get a symbol at a position 
  atPosition (x,y) {
    let xy = [x,y].join()
    let units = new Map(this.units.map(u => [u.p.join(),[u.display,u]]))

    return this.terrain.has(xy) ? ["t",[x,y,...Terrain[this.terrain.get(xy)]],this.terrain.get(xy)] : units.has(xy) ? ["u",[x,y,...units.get(xy)[0]],units.get(xy)[1]] : [null] 
  }
  
  placeFactions () {
    let F = this.app.state.active
    let placed = [] 

    //assign positions 
    let start = chance.shuffle(Object.keys(StartZone)).slice(0,F.length)

    F.forEach(([lr,f],i) => {
      //available positions 
      let [xmin,xmax,ymin,ymax] = StartZone[start[i]](this.size,this.size)

      f.units.forEach((u,j) => {
        let p = [-1,-1]
        while(p[0] == -1){
          //get p based upon start
          let np = [RandBetween(xmin,xmax),RandBetween(ymin,ymax)]
          p = this.terrain.has(np.join()) ? p : placed.includes(np.join()) ? p : np 
        }
        //set unit info 
        u.p = p 
        placed.push(p.join())
      })
    })
  }
  onClick (e) {
    let {engine, current} = this.app
    let [x,y] = engine.eventToPosition(e)
    let xy = [x,y].join()

    //only two actions 
    if(current.history.length >= 2){
      return
    }
 
    //what to do if in range 
    if(current.withinActionRange.includes(xy)){
      //get action 
      let act = current.act
      //get what is at the position 
      let [what,draw,data] = this.atPosition(x,y)
      //move 
      if(act[0] == "m" && what == null){
        current.takeAction("m",[x,y])
      }
      //attack 
      else if(act[0] == "a" && what == "u" && current.id != data.id){
        current.takeAction("a",data) 
      } 
    }
  }
  onPointer (e) {
    let {engine, current} = this.app
    let [x,y] = this.app.engine.eventToPosition(e)
    let xy = [x,y].join()

    //get what is at the position 
    let [what,draw,data] = this.atPosition(x,y)
    //within range 
    let range = current.withinActionRange.includes(xy) ? "lightgreen" : "lightyellow"
    //determine color on hover 
    let color = what == "t" ? "lightpink" : range

    //update canvas 
    what ? this.draw([...draw,color]) : this.draw([x,y,"","",color]) 
  }
  async draw(pointer = null) {
    let {engine, current} = this.app
    //clear the scene 
    engine.clear()

    //set size 
    engine.setOptions({
      width: this.size,
      height: this.size
    })

    //draw terrain  
    this.terrain.forEach((t,xy)=>{
      let[x,y] = xy.split(",").map(Number)
      engine.draw(x, y, ...Terrain[t])
    }
    )

    //draw units 
    this.units.forEach( u => u.draw(engine))

    if(pointer) {
      engine.draw(...pointer)
    }
  }
}

export {TileMap}
