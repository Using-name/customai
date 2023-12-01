/**Hurricane AI
 * 
 * Version 1.5.0
 * 
 * Made by a totally not egotistcal, super awesome, cofee hating, and 
 * incredibly skilled and unparalled programer, 
 * Mr. Meow Meow! 
 * 
 * Questions? Comments? Come see me in the discord, in #AI-Discussion.
 * Concerns? Complaints? Please refer to the Department of Nobody Cares. And
 * yes, I am the manager.
 */
let trainingModeOn = false;
const DIFFICULTY = 1; //0 = the bot is braindead. 0-1 = a lot of functions are disabled. 1 = what the bot plays on average, and all functions are enabled.
//1-2 = increases the update rate of the bot, making it slightly harder to play. 2 = will lag your computer with all the calculations the bot will make.

const me = scope.getMyPlayerNumber();
const time = Math.round(scope.getCurrentGameTimeInSec());
const tick = scope.getCurrentGameTimeInSec() * 20;//Game tick
let gold = scope.getGold();
scope.lastIncome = scope.income;
scope.income = time == 0 ? 0 : (gold - scope.lastStartGold) * 60;//Not always 100% accurate
scope.lastTick = tick;
if(scope.income > scope.lastIncome + 30){
    scope.income = scope.lastIncome + 30;
}else if(scope.income < scope.lastIncome - 30){
    scope.income = scope.lastIncome - 30;
}
const myTeam = scope.getMyTeamNumber();

const supply = scope.getCurrentSupply();
const maxSupply = scope.getMaxSupply();
const supplyDiff = maxSupply - supply;//supply differenece

let fightingUnits = scope.getUnits({notOfType: "Worker", player: me}); // returns all own fighting units (=not workers)
for(let i = fightingUnits.length - 1; i > -1; i--){
    (fightingUnits[i].getTypeName() == "Airship" || fightingUnits[i].getTypeName() == "Caltrop") && fightingUnits.splice(i, 1);
}
const idleFightingUnits = scope.getUnits({notOfType: "Worker", player: me, order: "Stop"});
for(let i = idleFightingUnits.length - 1; i > -1; i--){
    idleFightingUnits[i].getTypeName() == "Airship" && idleFightingUnits.splice(i, 1);
}
const myUnits = {};
scope.getUnits({player: me}).forEach(function(unit){
    let name = unit.getTypeName();
    if(myUnits[name] != undefined){
        myUnits[name].push(unit);
    }else{
        myUnits[name] = [];
        myUnits[name].push(unit);
    }
});//Note that if you do not have a unit of a certain type, acessing 
//myUnits[nonExistantUnitName] will return undefined. 

let enemyUnits = scope.getUnits({enemyOf: me});
for(let i = enemyUnits.length - 1; i > -1; i--){
    enemyUnits[i].isNeutral() && enemyUnits.splice(i, 1);
}
const enemyFightingUnits = scope.getUnits({notOfType: "Worker", enemyOf: me});
let notMyBuildings = scope.getBuildings({enemyOf: me});
let enemyBuildings = [];
notMyBuildings.forEach(function(build){
	if(build.isNeutral() === false){
		enemyBuildings.push(build);
	}
});//Copied from @BrutalityWarlord's AI; filters out enemy units from neutral units
let myMechUnits = [];
const enemyRanged = [];
const enemyMelee = [];
enemyFightingUnits.forEach(function(unit){
    if(unit.getFieldValue("range") > 1){
        enemyRanged.push(unit);
    }else{
        enemyMelee.push(unit);
    }
});

let airshipPickedUpUnits = false;

if(myUnits["Ballista"] != undefined){
    myMechUnits = myMechUnits.concat(myUnits["Ballista"]);
}
if(myUnits["Catapult"] != undefined){
    myMechUnits = myMechUnits.concat(myUnits["Catapult"]);
}
if(myUnits["Gatling Gun"] != undefined){
    myMechUnits = myMechUnits.concat(myUnits["Gatling Gun"]);
}

let myBuilds = {
    "allBuilds": scope.getBuildings({player: me}),
    "Castles": scope.getBuildings({type: "Castle", player: me}),
    "Fortresses": scope.getBuildings({type: "Fortress", player: me}),
    "Barracks": scope.getBuildings({type : "Barracks", player: me}),
    "Houses": scope.getBuildings({type: "House", player: me}),
    "Watchtowers": scope.getBuildings({type: "Watchtower", player: me}),
    "Forges": scope.getBuildings({type: "Forge", player: me}),
    "Churches": scope.getBuildings({type: "Church", player: me}),
    "Mages Guilds": scope.getBuildings({type: "Mages Guild", player: me}),
    "Armories": scope.getBuildings({type: "Armory", player: me}),
    "Wolves Dens": scope.getBuildings({type: "Wolves Den", player: me}),
    "Werewolves Dens": scope.getBuildings({type: "Werewolves Den", player: me}),
    "Animal Testing Labs": scope.getBuildings({type: "Animal Testing Lab", player: me}),
    "Dragon Lairs": scope.getBuildings({type: "Dragons Lair", player: me}),
    "Workshops": scope.getBuildings({type: "Workshop", player: me}),
    "Advanced Workshops": scope.getBuildings({type: "Advanced Workshop", player: me}),
    "Mills": scope.getBuildings({type: "Mill", player: me}),
    "Snake Charmers": scope.getBuildings({type: "Snake Charmer", player: me}),
}
myBuilds.combatUnitProducers = myBuilds["Churches"].concat(myBuilds["Wolves Dens"].concat(myBuilds["Dragon Lairs"].concat(myBuilds["Workshops"].concat(myBuilds["Advanced Workshops"].concat(myBuilds["Mills"].concat(myBuilds["Barracks"].concat(myBuilds["Werewolves Dens"])))))));
let alliedBuilds = scope.getBuildings({team: myTeam});
let goldmines = scope.getBuildings({type: "Goldmine"});

if(scope.initailized === true && myBuilds.combatUnitProducers.length > 1){
    filterDontProducers();
}

myBuilds.CastleAndFortresses = myBuilds["Fortresses"].concat(myBuilds["Castles"]);//Fortresses should be the first castle the bot has, so therefore
//it is concated into castles. Newest castles/fortresses should be at the back, oldest at the front. Messing with the order will cause problems.

let idleWorkers = scope.getUnits({type: "Worker", player: me, order: "Stop"});
let allWorkers = scope.getUnits({type: "Worker", player: me});
let miningWorkers = scope.getUnits({type: "Worker", player: me, order: "Mine"});
let repairingWorkers = scope.getUnits({type: "Worker", player: me, order: "Repair"});

let combatUnitProducerToCastleRatio = myBuilds.combatUnitProducers.length / (scope.getBuildings({type: "Castle", player: me, onlyFinshed: true}).concat(myBuilds["Fortresses"])).length;

/**
 * Gets random numbers. See methods inside for details.
 */
class Randomizer {
    //CREDIT GOES TO @Jermy Keeshin at CodeHS
    
    //https://static1.codehs.com/gulp/1edc730c184f9950e19e21d320171c1b14507618/jsdoc/chs-js-lib/graphics_randomizer.js.html
    /**
     * Get a random integer between low to high, inclusive.
     * If only one parameter is given, a random integer
     * from (0, low-1) inclusive.
     * @param {number} low - Lower bound on range of random int.
     * @param {number} high - Upper bound on range of random int.
     * @returns {number} Random number between low and high, inclusive.
    */
    static nextInt(low, high){
        if(typeof high === "undefined"){
            high = low - 1;
            low = 0;
        }
        low = Math.floor(low);
        high = Math.min(high, 9007199254740992);
        low = Math.min(low, 9007199254740991);
        return scope.getRandomNumber(low, high);
    };
    /**
     * Get a random float between low to high, inclusive.
     * If only one parameter is given, a random float
     * from (0, low-1) inclusive.
     * @param {number} low - Lower bound on range of random int.
     * @param {number} high - Upper bound on range of random int.
     * @returns {number} Random number between low and high, inclusive.
    */
    static nextFloat(low, high){
        if(typeof high === "undefined"){
            high = low;
            low = 0;
        }
        high = Math.min(high, 9007199254740992);
        low = Math.min(low, 9007199254740991);
        return scope.getRandomNumber(low * 1000000000, high * 1000000000) / 1000000000;
    };
    /**
     * Generate a random boolean via fair probability coin toss.
     * If `probabilityTrue` is supplied, the coin toss is skewed by that value.
     * @param {number} probabilityTrue - Skewed probability of true.
     * @returns {boolean} Result of coin flip skewed toward `probabilityTrue`.
    */
    static nextBoolean(probabilityTrue){
        if(typeof probabilityTrue === "undefined"){
            probabilityTrue = 0.5;
        }
        probabilityTrue = Math.min(probabilityTrue, 9007199254740991);
        return scope.getRandomNumber(0, 1000000000) < probabilityTrue * 1000000000;
    };
}

function pathTo(node) {
  let curr = node;
  let path = [];
  while (curr.parent) {
    path.unshift(curr);
    curr = curr.parent;
  }
  return path;
}

function getHeap() {
  return new BinaryHeap(function(node) {
    return node.f;
  });
}

function astar(){
}
  /**
  * Perform an A* Search on a graph given a start and end node.
  * @param {Graph} graph
  * @param {GridNode} start
  * @param {GridNode} end
  * @param {Object} [options]
  * @param {bool} [options.closest] Specifies whether to return the
             path to the closest node if the target is unreachable.
  * @param {Function} [options.heuristic] Heuristic function (see
  *          astar.heuristics).
  */
  astar.search = function(graph, start, end, options) {

    if(typeof start != "object"){
        throw new TypeError("You must pass a valid start node to astar.search! Received type: " + typeof start);
    }else if(typeof end != "object"){
        throw new TypeError("You must pass a valid end node to astar.search! Received type: " + typeof end);
    }else if(start.x == undefined || start.y == undefined){
        throw new TypeError("You must pass a valid start node to astar.search! Received node: " + JSON.stringify(start));
    }else if(end.x == undefined || end.y == undefined){
        throw new TypeError("You must pass a valid end node to astar.search! Received node: " + JSON.stringify(end));
    }else if(typeof graph != "object"){
        throw new TypeError("You must pass a valid graph to astar.search! Received graph: " + JSON.stringify(graph));
    }
    
    graph.cleanDirty();
    options = options || {};
    let heuristic = function(pos0, pos1) {
      let D = 1;
      let D2 = Math.sqrt(2);
      let d1 = Math.abs(pos1.x - pos0.x);
      let d2 = Math.abs(pos1.y - pos0.y);
      return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
    };
    
    let closest = true;

    let openHeap = getHeap();
    let closestNode = start; // set the start node to be the closest if required

    start.h = heuristic(start, end);
    graph.markDirty(start);

    openHeap.push(start);
    
    let counter = 0;

    while (openHeap.size() > 0) {
        
        counter++;

      // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
      let currentNode = openHeap.pop();

      // End case -- result has been found, return the traced path.
      if (currentNode === end) {
        return pathTo(currentNode);
      }

      // Normal case -- move currentNode from open to closed, process each of its neighbors.
      currentNode.closed = true;

      // Find all neighbors for the current node.
      let neighbors = graph.neighbors(currentNode);

      for (let i = 0, il = neighbors.length; i < il; ++i) {
        let neighbor = neighbors[i];

        if (neighbor.closed || neighbor.isWall() || neighbor == undefined) {
          // Not a valid node to process, skip to next neighbor.
          continue;
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
        let gScore = currentNode.g + neighbor.getCost(currentNode);
        let beenVisited = neighbor.visited;

        if (!beenVisited || gScore < neighbor.g) {

          // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
          neighbor.visited = true;
          neighbor.parent = currentNode;
          neighbor.h = neighbor.h || heuristic(neighbor, end);
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;
          graph.markDirty(neighbor);
          if (closest) {
            // If the neighbour is closer than the current closestNode or if it's equally close but has
            // a cheaper path than the current closest node then it becomes the closest node
            if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
              closestNode = neighbor;
            }
          }

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            openHeap.push(neighbor);
          } else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            openHeap.rescoreElement(neighbor);
          }
        }
      }
    }

    if (closest) {
      return pathTo(closestNode);
    }

    // No result was found - empty array signifies failure to find path.
    return [];
  }
  astar.cleanNode = function(node) {
    node.f = 0;
    node.g = 0;
    node.h = 0;
    node.visited = false;
    node.closed = false;
    node.parent = null;
  }
  astar.smoothenPath = function(grid, path) {
    if(path[0] == undefined ){
        return [];
    }
    var len = path.length,
        x0 = path[0].x,        // path start x
        y0 = path[0].y,        // path start y
        x1 = path[len - 1].x,  // path end x
        y1 = path[len - 1].y,  // path end y
        sx, sy,                 // current start coordinate
        ex, ey,                 // current end coordinate
        newPath,
        i, j, coord, line, testCoord, blocked;

    sx = x0;
    sy = y0;
    newPath = [grid.grid[sx][sy]];
    
    let SENTINEL = 0;
    for (i = 2; i < len - 1; ++i) {
        SENTINEL++;
        if(SENTINEL > 1000){
            throw new Error("Path smoothing took too long! (1)");
            break;
        }
        coord = path[i]; 
        ex = coord.x;
        ey = coord.y;
        line = astar.interpolate(sx, sy, ex, ey);

        blocked = false;
        
        let SENTINEL2 = 0;
        for (j = 0; j < line.length; ++j) {
            SENTINEL2++;
            if(SENTINEL2 > 1000){
                throw new Error("Path smoothing took too long! (2)");
                break;
            }
            testCoord = line[j];
            if (grid.grid[testCoord[0]][testCoord[1]].isWall() 
            || grid.grid[testCoord[0] - 1][testCoord[1] - 1]?.isWall()
            || grid.grid[testCoord[0] + 1][testCoord[1] - 1]?.isWall()
            || grid.grid[testCoord[0] + 1][testCoord[1] - 1]?.isWall()
            || grid.grid[testCoord[0] -1][testCoord[1] + 1]?.isWall()) {
                blocked = true;
                break;
            }
        }
        if (blocked) {
            let lastValidCoord = path[i - 1];
            newPath.push(lastValidCoord);
            sx = lastValidCoord.x;
            sy = lastValidCoord.y;
        }
    }
    //newPath.push([x1, y1]);
    newPath.push(grid.grid[x1][y1]);

    return newPath;
  }
  astar.interpolate = function (x0, y0, x1, y1) {
        var abs = Math.abs,
            line = [],
            sx, sy, dx, dy, err, e2;
    
        dx = abs(x1 - x0);
        dy = abs(y1 - y0);
    
        sx = (x0 < x1) ? 1 : -1;
        sy = (y0 < y1) ? 1 : -1;
    
        err = dx - dy;
        
        let SENTINEL = 0;
    
        while (true) {
            SENTINEL++;
            if(SENTINEL > 100000){
                throw new Error("Interpolation took too long! " + x0 + ", " + y0 + ", " + x1 + ", " + y1);
            }
            line.push([x0, y0]);
    
            if (x0 === x1 && y0 === y1) {
                break;
            }
            
            e2 = 2 * err;
            if (e2 > -dy) {
                err = err - dy;
                x0 = x0 + sx;
            }
            if (e2 < dx) {
                err = err + dx;
                y0 = y0 + sy;
            }
        }
    
        return line;
    }

astar.findDistOfPath = function(path, isCompressed = false){
    if(path.length == 0){
        return 0;
    }
    let len = 0;
    let lastNode = path[0];
    if(isCompressed == false){
        for(let i = 1; i < path.length; i++){
            let curNode = path[i];
            if(lastNode.x == curNode.x || lastNode.y == curNode.y){
                //Orthographic
                len += 1;
            }else{
                //Diagonal
                len += Math.SQRT2;
            }
            lastNode = curNode;
        }
    }else{
        for(let i = 1; i < path.length; i++){
            len += distanceFormula(path[i].x, path[i].y, lastNode.x, lastNode.y);
            lastNode = curNode;
        }
    }

    return len;
}

// javascript-astar 0.4.1
// http://github.com/bgrins/javascript-astar
// Freely distributable under the MIT License.
// Implements the astar search algorithm in javascript using a Binary Heap.
// Includes Binary Heap (with modifications) from Marijn Haverbeke.
// http://eloquentjavascript.net/appendix2.html
// Used with modifications

/**
 * A graph memory structure
 * @param {Array} gridIn 2D array of input weights
 * @param {Object} [options]
 * @param {bool} [options.diagonal] Specifies whether diagonal moves are allowed
 */
function Graph(gridIn, options = {diagonal: true}) {
  options = options || {};
  this.nodes = [];
  this.diagonal = !!options.diagonal;
  this.grid = [];
  for (let x = 0; x < gridIn.length; x++) {
    this.grid[x] = [];

    for (let y = 0, row = gridIn[x]; y < row.length; y++) {
      let node = new GridNode(x, y, row[y]);
      this.grid[x][y] = node;
      this.nodes.push(node);
    }
  }
  this.init();
}

Graph.prototype.init = function() {
  this.dirtyNodes = [];
  for (let i = 0; i < this.nodes.length; i++) {
    astar.cleanNode(this.nodes[i]);
  }
};

Graph.findNearestPathableNode = function(x, y, rad = 6){
    let bestNode;
    let bestDist = 9999999;
    for(let x2 = Math.floor(x - rad); x2 < x + rad; x2++){
        for(let y2 = Math.floor(y - rad); y2 < y + rad; y2++){
            if(scope.positionIsPathable(x2, y2) && x2 > 0 && y2 > 0 && x2 < scope.getMapWidth() && y2 < scope.getMapHeight() && distanceFormula(x, y, x2, y2) < bestDist){
                bestNode = scope.mapNodes.getNodeAt(x2, y2);
                bestDist = distanceFormula(x, y, x2, y2);
            }
        }
    }
    return bestNode;
};

function findGroundDist(x1, y1, x2, y2){
    let startTime = new Date().getTime();
    let start = Graph.findNearestPathableNode(x1, y1, 4);
    let end = Graph.findNearestPathableNode(x2, y2, 4);
    let endTime = new Date().getTime();

    startTime = new Date().getTime();
    let path = astar.search(scope.mapNodes, start, end);
    endTime = new Date().getTime();

    startTime = new Date().getTime();
    let dist = astar.findDistOfPath(path);
    endTime = new Date().getTime();

    return dist
}

/**
 * If the provided coordinates are inside of the grid.
 * 
 * @param {integer} xIdx - The index of the node in the x axis.
 * @param {integer} yIdx - the index of the node in the y axis.
 * 
 * @returns {boolean} - Whether the coordinates are inside
 */
Graph.prototype.isInside = function(xIdx, yIdx){
    if(xIdx < 0 || xIdx > this.grid.length - 1 || yIdx < 0 || yIdx > this.grid[0].length - 1){
        return false;
    }
    return true;
}

Graph.prototype.getNodeAt = function(xIdx, yIdx){
    try {
    if(xIdx == null || yIdx == null || this.isInside(xIdx, yIdx) == false){
            return null;
    }
    return this.grid[Math.floor(xIdx)][Math.floor(yIdx)];
    } catch(e){
        throw new TypeError("Getting a node. at " + xIdx + ", " + yIdx + " encountered an error.");
    }
}

Graph.prototype.cleanDirty = function() {
  for (let i = 0; i < this.dirtyNodes.length; i++) {
    astar.cleanNode(this.dirtyNodes[i]);
  }
  this.dirtyNodes = [];
};

Graph.prototype.markDirty = function(node) {
  this.dirtyNodes.push(node);
};

Graph.prototype.neighbors = function(node) {
  let ret = [];
  let x = node.x;
  let y = node.y;
  let grid = this.grid;

  // West
  if (grid[x - 1] && grid[x - 1][y]) {
    ret.push(grid[x - 1][y]);
  }

  // East
  if (grid[x + 1] && grid[x + 1][y]) {
    ret.push(grid[x + 1][y]);
  }

  // South
  if (grid[x] && grid[x][y - 1]) {
    ret.push(grid[x][y - 1]);
  }

  // North
  if (grid[x] && grid[x][y + 1]) {
    ret.push(grid[x][y + 1]);
  }

  if (this.diagonal) {
    // Northwest
    if (grid[x - 1] && grid[x - 1][y - 1] && grid[x - 1][y]?.weight !== 0 && grid[x][y - 1]?.weight !== 0) {
      ret.push(grid[x - 1][y - 1]);
    }

    // Northeast
    if (grid[x + 1] && grid[x + 1][y - 1] && grid[x + 1][y]?.weight !== 0 && grid[x][y - 1]?.weight !== 0) {
      ret.push(grid[x + 1][y - 1]);
    }

    // Southwest
    if (grid[x - 1] && grid[x - 1][y + 1] && grid[x - 1][y]?.weight !== 0 && grid[x][y + 1]?.weight !== 0) {
      ret.push(grid[x - 1][y + 1]);
    }

    // Southeast
    if (grid[x + 1] && grid[x + 1][y + 1] && grid[x + 1][y]?.weight !== 0 && grid[x][y + 1]?.weight !== 0) {
      ret.push(grid[x + 1][y + 1]);
    }
  }

  return ret;
};

Graph.prototype.toString = function() {
  let graphString = [];
  let nodes = this.grid;
  for (let x = 0; x < nodes.length; x++) {
    let rowDebug = [];
    let row = nodes[x];
    for (let y = 0; y < row.length; y++) {
      rowDebug.push(row[y].weight);
    }
    graphString.push(rowDebug.join(" "));
  }
  return graphString.join("\n");
};

/**
 * Home-brewn function that compresses a path so that only the turning points are returned.
 * 
 * @param {array} path - The path to be compressed.
 * 
 * @returns {array} - the compressed path.
 */
function compressPath(path){
    let compressed = [];
    let gs = 0.5;
    let lastAngle = 10;//An impossible value on purpose. 
    let lastNode = path[0];
    path.forEach((node, i) => {
        let angle = Math.atan2(((node.y + gs) - (lastNode.y + gs)), ((node.x + gs) - (lastNode.x + gs))).toFixed(2);//Rounds to nearest hundredth
        if(angle != lastAngle){
            compressed.push({x: lastNode.x + gs, y: lastNode.y + gs});
        }
        lastAngle = angle;
        lastNode = node;
    });
    return compressed;
}

function GridNode(x, y, weight) {
  this.x = x;
  this.y = y;
  this.weight = weight;
}

GridNode.prototype.toString = function() {
  return "[" + this.x + " " + this.y + "]";
};

GridNode.prototype.getCost = function(fromNeighbor) {
  // Take diagonal weight into consideration.
  if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
    return this.weight * 1.41421;
  }
  return this.weight;
};

GridNode.prototype.isWall = function() {
  return this.weight === 0;
};

function BinaryHeap(scoreFunction) {
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function(element) {
    // Add the new element to the end of the array.
    this.content.push(element);

    // Allow it to sink down.
    this.sinkDown(this.content.length - 1);
  },
  pop: function() {
    // Store the first element so we can return it later.
    let result = this.content[0];
    // Get the element at the end of the array.
    let end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  },
  remove: function(node) {
    let i = this.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    let end = this.content.pop();

    if (i !== this.content.length - 1) {
      this.content[i] = end;

      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  },
  size: function() {
    return this.content.length;
  },
  rescoreElement: function(node) {
    this.sinkDown(this.content.indexOf(node));
  },
  sinkDown: function(n) {
    // Fetch the element that has to be sunk.
    let element = this.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {

      // Compute the parent element's index, and fetch it.
      let parentN = ((n + 1) >> 1) - 1;
      let parent = this.content[parentN];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }
  },
  bubbleUp: function(n) {
    // Look up the target element and its score.
    let length = this.content.length;
    let element = this.content[n];
    let elemScore = this.scoreFunction(element);

    while (true) {
      // Compute the indices of the child elements.
      let child2N = (n + 1) << 1;
      let child1N = child2N - 1;
      // This is used to store the new position of the element, if any.
      let swap = null;
      let child1Score;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        let child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        let child2 = this.content[child2N];
        let child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      // Otherwise, we are done.
      else {
        break;
      }
    }
  }
}
// result is an array containing the shortest path

if(!scope.initailized){
   scope.initailized = true;
   scope.shouldUpdate = true;
   scope.cur_id = 0;
   /**
     * Gets the combat power of a unit. If the unit
     * is not defined in scope.unitPower, it will 
     * return 0.
     * 
     * @param {unit} unit - the unit to be measured
     * 
     * @returns {number} - the combat power of the unit
     */
    scope.getPowerOf = function(unit){
        if(unit != undefined && unit.getValue("hp") > 0 && scope.unitPower[unit.getTypeName()] != undefined){
            return scope.unitPower[unit.getTypeName()] * (unit.getValue("hp") / unit.getFieldValue("hp"));
        }else{
            return 0;
        }
    }
    
    scope.nextTalkTick = Randomizer.nextInt(5, 360);

    //The sizes of various buildings. [length, width]
    scope.buildingSizes = {
        "House": [3, 3],
        "Barracks": [3, 3],
        "Watchtower": [2, 2],
        "Forge": [4, 4],
        "Castle": [4, 4],
        "Fortress": [4, 4],
        "Church": [4, 4],
        "Mages Guild": [3, 3],
        "Armory": [3, 3],
        "Wolves Den": [3, 3],
        "Animal Testing Lab": [4, 4],
        "Dragons Lair": [3, 3],
        "Workshop": [4, 4],
        "Advanced Workshop": [4, 4],
        "Mill": [4, 4],
        "Snake Charmer": [2, 2],
    }
    
    //Priorities of various buildings. A higher priority means a unit is more likely
    //to be picked.
    scope.buildPrio = {
        "House": 0,
        "Barracks": 0,
        "Watchtower": 0,
        "Forge": 0,
        "Castle": 0,
        "Church": 0,
        "Mages Guild": 0,
        "Armory": 0,
        "Wolves Den": 0,
        "Animal Testing Lab": 0,
        "Dragons Lair": 0,
        "Workshop": 0,
        "Advanced Workshop": 0,
        "Mill": 0,
        "Snake Charmer": 0,
    }
    
    //Same thing as above, only with units
    scope.unitPrio = {
        "Worker": 0,
        "Bird": 0,
        "Ballista": 0,
        "Soldier": 0,
        "Archer": 0,
        "Mage": 0,
        "Priest": 0,
        "Raider": 0,
        "Snake": 0,
        "Wolf": 0,
        "Werewolf": 0,
        "Dragon": 0,
        "Gyrocraft": 0,
        "Gatling Gun": 0,
        "Catapult": 0,
        "Airship": 0,
    }
    
    //Where a unit is produced. Correlates to myBuilds.
    scope.unitProducedAt = {
        "Bird": "CastleAndFortresses",
        "Worker": "CastleAndFortresses",
        "Soldier": "Barracks",
        "Archer": "Barracks",
        "Mage": "Barracks",
        "Priest": "Churches",
        "Raider": "Barracks",
        "Snake": "Wolves Dens",
        "Wolf": "Wolves Dens",
        "Werewolf": "Werewolves Dens",
        "Dragon": "Dragon Lairs",
        "Gyrocraft": "Mills",
        "Gatling Gun": "Workshops",
        "Catapult": "Workshops",
        "Ballista": "Advanced Workshops",
        "Airship": "Advanced Workshops",
    }

    //The typeName of where each unit is produced at. Uses the typeName,
    //so you can use scope.getBuildings() with this function. Does not
    //correlate with myBuilds.
    scope.unitProducedAtTypeName = {
        "Bird": "Castle",
        "Worker": "Castle",
        "Soldier": "Barracks",
        "Archer": "Barracks",
        "Mage": "Barracks",
        "Priest": "Church",
        "Raider": "Barracks",
        "Snake": "Wolves Den",
        "Wolf": "Wolves Den",
        "Werewolf": "Werewolves Den",
        "Dragon": "Dragon Lair",
        "Gyrocraft": "Mill",
        "Gatling Gun": "Workshop",
        "Catapult": "Workshop",
        "Ballista": "Advanced Workshop",
        "Airship": "Advanced Workshop",
    }//The actualy type name in the game, versus the name in scope.myBuilds.
    
    scope.unitPower = {//used to calculate how much of a threat an enemy is
        "Worker": 0,
        "Soldier": 1,
        "Archer": 1,
        "Mage": 1.25,
        "Priest": 1.2,
        "Raider": 1,
        "Wolf": 0.7,
        "Snake": 0.7,
        "Werewolf": 4,
        "Dragon": 1.5,
        "Airship": 1,
        "Gatling Gun": 1.3,
        "Gyrocraft": 1,
        "Catapult": 1.5,
        "Ballista": 1.25,
        "Bird": 0.25,
        "Healing Ward": 1,
        "Caltrop": 1,
    };

    /**
     * Priorities for various metas.
     * 
     * attackThreshold is the point at which the bot will attack, calculated
     * by the number of combat unit producers (rax, workshops, etc.)
     * multiplied by the attackThreshold.
     */
    scope.allSubMetaPrios = {
        "Barracks": {//Barracks meta
            "Balanced": {
                "Buildings": ["Barracks"],
                "Units": ["Soldier", "Archer", "Raider", "Airship"],
                "Upgrades": ["Forge", "Armory"],
                "Misc": {"attackThreshold": 1.8, "maxProducers": 10, "opener": true},
            },
            "Magical": {
                "Buildings": ["Barracks", "Mages Guild", "Advanced Workshop"],
                "Units": ["Mage", "Raider", "Airship"],
                "Upgrades": ["Fireball", "Invisibility", "Forge", "Armory"],
                "Misc": {"attackThreshold": 1.8, "singleProduction": ["Mages Guild"], "maxProducers": 10, "opener": false},
            }
        },
        "Beast": {//Beast meta
            "WolfSnakeSpam": {
                "Buildings": ["Wolves Den", "Snake Charmer"],
                "Units": ["Wolf", "Snake"],
                "Upgrades": ["Animal Testing Lab"],
                "Misc": {"attackThreshold": 3, "maxProducers": 14, "opener": true},
            },
            "WolfSnakeAndWerewolf": {
                "Buildings": ["Wolves Den", "Snake Charmer"],
                "Units": ["Wolf", "Snake", "Werewolf"],
                "Upgrades": ["Werewolf Den", "Animal Testing Lab"],
                "Misc": {"attackThreshold": 2.5, "maxProducers": 14, "opener": false},
            },
            "WolfSnakeAndDragon": {
                "Buildings": ["Wolves Den", "Snake Charmer", "Dragons Lair"],
                "Units": ["Wolf", "Snake", "Dragon"],
                "Upgrades": ["Fortress", "Animal Testing Lab"],
                "Misc": {"attackThreshold": 2.5, "maxProducers": 14, "opener": false},
            },
            "WolfSpam": {
                "Buildings": ["Wolves Den"],
                "Units": ["Wolf"],
                "Upgrades": ["Animal Testing Lab"],
                "Misc": {"attackThreshold": 2.5, "maxProducers": 16, "opener": true},
            },
            "DragonSpamRush": {
                "Buildings": ["Dragons Lair"],
                "Units": ["Dragon"],
                "Upgrades": ["Fortress", "Animal Testing Lab"],
                "Misc": {"attackThreshold": 1.7, "maxProducers": 12, "opener": false},
            },
        },
        "Mechanical": {//Mech meta
            "CatapultSpam": {
                "Buildings": ["Workshop", "Advanced Workshop"],
                "Units": ["Catapult", "Airship"],
                "Upgrades": ["Forge"],
                "Misc": {"attackThreshold": 2.1, "maxProducers": 10, "opener": false},
            },
            "GatlingGunSpam": {
                "Buildings": ["Workshop"],
                "Units": ["Gatling Gun", "Airship"],
                "Upgrades": ["Forge"],
                "Misc": {"attackThreshold": 2, "maxProducers": 10, "opener": false},
            },
            "CatapultGatlingGunSpam": {
                "Buildings": ["Workshop", "Advanced Workshop"],
                "Units": ["Gatling Gun", "Catapult", "Airship"],
                "Upgrades": ["Forge"],
                "Misc": {"attackThreshold": 2, "maxProducers": 10, "opener": true},
            },
            "GyrocraftSpam" : {
                "Buildings": ["Mill"],
                "Units": ["Gyrocraft", "Airship"],
                "Upgrades": ["Forge"],
                "Misc": {"singleProduction": ["Workshop"], "attackThreshold": 3, "maxProducers": 14, "opener": false},
            }
        }
    }
    
    let metas = {"Barracks": 1,
                 "Beast": 1, 
                 "Mechanical": 0.5
    };//various large-scale strategies the bot can use

    scope.allSubMetas = {
        "Barracks": ["Balanced", "Magical"],
        "Beast": ["WolfSnakeSpam", "WolfSnakeAndWerewolf", "WolfSnakeAndDragon", "WolfSpam", "DragonSpamRush"],
        "Mechanical": ["CatapultSpam", "GatlingGunSpam", "CatapultGatlingGunSpam", "GyrocraftSpam"],
    }//sub-strategies within various metas.
    
    for(let i = 0; i < Randomizer.nextInt(1, 10); i++){
        scope.baseMeta = findRandomPrioKey(metas);//fetches a meta
    }//Oftentimes, several bots in a multiplayer will choose the same meta because 
    //of js magic. This for loop tries to add another layer of randomness to stop that
    scope.meta = JSON.parse(JSON.stringify(scope.baseMeta));
    
    while(true){
        for(let i = 0; i < Randomizer.nextInt(1, 5); i++){
            scope.subMeta = scope.allSubMetas[scope.baseMeta][Randomizer.nextInt(0, scope.allSubMetas[scope.baseMeta].length - 1)];//fetches a submeta
        }
        if(scope.allSubMetaPrios[scope.baseMeta][scope.subMeta]["Misc"].opener == true){
            break;
        }
    }
    
    //consoleLog(getMyColor() + "'s meta: " + scope.baseMeta + "; submeta: " + scope.subMeta);

    /**
     * Determines what units the bot will produce, what buildings the bot will
     * build, and what upgrades the bot will pursue. Note that workers are
     * seperate and will always be trained, along with houses, castles, and
     * watchtowers being built
     */
    
    scope.subMetaPrios = scope.allSubMetaPrios[scope.baseMeta][scope.subMeta];
    scope.attackThreshold = scope.subMetaPrios["Misc"].attackThreshold;
    scope.unitProducerCap = scope.subMetaPrios["Misc"].maxProducers;
    
    scope.bases = [];
    scope.doTrainUnits = true;
    scope.doBuildBuildings = true;
    
    scope.maxWorkersOnBase = Randomizer.nextInt(8, 10);
    
    scope.startUnminedMines = getUnminedMines();
    
    scope.underAttack = false;
    
    scope.lastNumOfCastles = 1;//Don't mess with this
    scope.enemyWorkerScouts = [];
    
    scope.dontProduceFromThese = new Set();//Buildings that shouldn't produce anything. They will not count in productionBuildings.
    scope.onlyProduceOneOfThese = [];

    scope.aggression = Randomizer.nextFloat(0.75, 1.25);
    
    scope.numEnemies = 0;
    scope.numAllies = 0;
    let players = scope.getArrayOfPlayerNumbers();
    players.forEach(nr => scope.getTeamNumber(nr) != myTeam ? scope.numEnemies++ : scope.numAllies++);
    scope.numAllies--;//To account for itself

    scope.tickrate = {
        "Scout": Math.floor(Randomizer.nextInt(30, 45) * scope.aggression),
        "Attack": Randomizer.nextInt(20 / DIFFICULTY, 30 / DIFFICULTY),
        "Defend": Randomizer.nextInt(2 / DIFFICULTY, 4 / DIFFICULTY),
        "Build": Randomizer.nextInt(3 / DIFFICULTY, 6 / DIFFICULTY),
        "BuildCastle": Randomizer.nextInt(4, 6),
        "Repair": Randomizer.nextInt(3 / DIFFICULTY, 5 / DIFFICULTY),
        "ArmyBrain": Randomizer.nextInt(2, 3),//kiting, retreating
        "Train": Randomizer.nextInt(2 / DIFFICULTY, 4 / DIFFICULTY),
        "KiteAndRetreat": Randomizer.nextInt(1, 2),
    }//how often the bot runs various functions/methods
    
    scope.mechRepairPercent = Randomizer.nextFloat(0.15, 0.25);
    scope.mechRepairSquad = [];
    scope.mechRepairSquadByID = {};
    
    if(trainingModeOn === true){
        scope.mute = true;
    }else{
        scope.mute = false;
    }
    
    scope.mute = false;

    scope.firstCastle = myBuilds["CastleAndFortresses"][0];

    //At the beginning, cluster buildings together more.
    if(scope.startUnminedMines.length > 0){
        scope.defaultBuildRad = 8;
    }else{
        scope.defaultBuildRad = 10;
    }

    scope.maxBuildingRepairers = Randomizer.nextInt(1, 3);

    scope.allArmiesByID = {};

    scope.proxied = false;
    
    let isUsingBuildOrder = Randomizer.nextBoolean(0.85);
    
    if(isUsingBuildOrder){
        let possibles = [];
        if(scope.baseMeta == "Beast"){
            possibles.push(
                            //One-den expand
                            [{name: "1-den"}, ["Worker", 2], ["House"], ["Worker"], ["Wolves Den"], ["Worker"], ["Wolf", 2, {atkAfterProduction: true}], ["Castle"], ["Wolf"], ["House"], ["Wolf", 1, {atkAfterProduction: true}], ["Worker"]],
                            
                            //2-den
                            [{name: "2-den"}, ["Worker", 2], ["House"], ["Worker"], ["Wolves Den", 1], ["Wolves Den", 1, {proxy: true}], ["Wolf", 1, {atkAfterProduction: true}], ["House"], ["Wolf", 2, {atkAfterProduction: true}], ["Wolf", 4, {atkAfterProduction: true}], ["House"], ["Wolf"], ["House"]],
            );
        }else if(scope.baseMeta == "Barracks"){
            possibles.push(
                            //Raider opening
                            [{name: "raider"}, ["House"], ["Worker"], ["Barracks"], ["Worker", 2], ["Raider", 2, {atkAfterProduction: true}], ["Castle"], ["Worker"], ["Raider", 1, {atkAfterProduction: true}], ["Worker"], ["Soldier"], ["Worker", 2], ["Raider"], ["Worker", 2], ["Barracks"], ["House"], ["Worker", 2], ["Soldier"], ["Worker", 2], ["Soldier"], ["Archer"], ["Worker"], ["House"], ["Soldier"], ["Archer"], ["Castle"]],
                            
                            //One-rax expand
                            [{name: "1-rax"}, ["Worker"], ["House"], ["Worker"], ["Barracks"], ["Raider", 1, {atkAfterProduction: true}], ["Worker", 2], ["Raider", 1, {atkAfterProduction: true}], ["Worker", 3], ["Castle"]],
            );
        }else if(scope.baseMeta == "Mechanical"){
        possibles.push(
                    //5-gat timing attack
                    [{name: "5-gat"}, ["Worker", 2], ["House"], ["Worker"], ["Workshop"], ["Worker"], ["Gatling Gun", 4], ["House"], ["Castle"], ["Worker"]],
                    
                    //[{name: "Mixed"}, ["House"], ["Barracks"], ["Raider", 1, {atkAfterProduction: true}], ["Worker", 2], ["Raider", 1, {atkAfterProduction: true}], ["Worker", 3], ["Castle"], ["Workshop"], ["Catapult"], ["Soldier", 2]],
                    //Catadrop-push
                    //[{name: "one-den"}, ["House"], ["Worker"], ["Workshop"], ["Worker", 2], ["Gatling Gun", 2], ["Castle"], ["Advanced Workshop"], ["Worker"], ["House"], ["Catapult"], ["Airship"], ["Worker", 2], ["Catapult", 1], ["House", 1], ["Worker", 2], ["Catapult"], ["Worker", 2], ["Catapult"], ["Attack"], ["Worker", 2], ["House"], ["Catapult"], ["Castle"]],
            );
        }
        scope.buildOrder = possibles[Randomizer.nextInt(0, possibles.length - 1)];
    }else{
        scope.buildOrder = [];
    }

    if(scope.baseMeta == "Mechanical"){
        Randomizer.nextBoolean(0.5) ? scope.meta += "Barracks" : scope.meta += "Beast";
    }
    
    //Put your own custom build order HERE!!
    //scope.buildOrder = [["House"], ["Worker"], ["Workshop"], ["Worker", 2], ["Gatling Gun", 2], ["Castle"], ["Advanced Workshop"], ["Worker"], ["House"], ["Catapult"], ["Airship"], ["Worker", 2], ["Catapult", 1], ["House", 1], ["Attack"], ["Worker", 2], ["Catapult"], ["Airship"], ["Worker", 2], ["Catapult"], ["Attack"], ["Airship"], ["Worker", 2], ["House"], ["Catapult"], ["Castle"]];
    
    //If we start out with more stuff than normal or we are in an FFA, cancel the build order
    if(scope.getUnits({player: me}) > 7 || myBuilds["CastleAndFortresses"].length > 1 || (scope.numAllies == 0 && scope.numEnemies > 1)){
        scope.buildOrder = [];
    }
    //scope.buildOrder = [];
    
    scope.usingBuildOrder = scope.buildOrder.length > 0 ? true : false;
    if(scope.usingBuildOrder){
        scope.maxWorkersOnBase = Infinity;
        scope.buildOrderMisc = {"workerScout": false, "proxyChance": 0}
        scope.buildOrderName = scope.buildOrder[0].name;
        scope.buildOrder.splice(0, 1);
    }else{
        scope.buildOrderMisc = {"workerScout": Randomizer.nextBoolean(0.35), "proxyChance": 0.2}
    }
    scope.buildOrder?.forEach((order) => {order[1] = order[1] == undefined ? 1 : order[1]});
    
    scope.proxyChance = scope.buildOrderMisc.proxyChance == undefined ? 0.15 : scope.buildOrderMisc.proxyChance;
    
    scope.buildOrder.forEach(arr => arr[2]?.proxy != undefined ? scope.proxyChance = 1 : null);
    
    scope.willProxy = Randomizer.nextBoolean(scope.proxyChance);
    scope.shouldHaveBuilt = null;

    //If we're playing on 2v2 Cloud Kingdom or in an ffa, don't proxy
    if(scope.getStartLocationForPlayerNumber(me) == undefined || (scope.numAllies == 0 && scope.numEnemies > 1)){
        scope.willProxy = false;
    }

    let possibleProxies = [];

    let meta = scope.baseMeta;
    if(meta === "Beast"){
        possibleProxies.push("Wolves Den");
    }else if(meta === "Barracks"){
        possibleProxies.push("Barracks");
    }else if(meta === "Mechanical"){
        possibleProxies.push("Workshop");
    }
    
    scope.proxyString = possibleProxies[Randomizer.nextInt(0, possibleProxies.length - 1)];
    
    scope.hasProxied = scope.willProxy == true ? true : false;
    //scope.chatMsg(getMyColor() + "'s proxy chance: " + scope.proxyChance);

    if(scope.meta === "Beast"){
        scope.maxCombatUnitProducerToCastleRatio = 2;
    }else if(scope.meta.includes("Barracks")){
        scope.maxCombatUnitProducerToCastleRatio = 2;
    }else if(scope.meta.includes("Mechanical")){
        scope.maxCombatUnitProducerToCastleRatio = 2;
    }

    scope.significantAirThreat = false;

    scope.priorityBuild = null;
    scope.evacedWorkers = {};

    scope.maxEnPowerEncountered = 4;//Don't attack until we can at least take out four power.
    scope.baseMeta == "Mechanical" ? scope.maxEnPowerEncountered = 8 : null;//If we're playing mech, don't do anything stupid... like attacking with 2 gats and 1 cata
    
    scope.lastTimeDropped = -999;
    
    scope.addedIDs = [];

    let mapNodes = [];
    
    let mapLen = scope.getMapWidth();
    let mapHei = scope.getMapHeight();
    for(let x = 0; x < mapLen; x++){
        let col = [];
        for(let y = 0; y < mapHei; y++){
            let weight = 0;
            weight = scope.positionIsPathable(x, y) == true ? 1 : 0
            col.push(weight);
        }
        mapNodes.push(col);
    }
    
    scope.mapNodes = new Graph(mapNodes);
    
    scope.castleBuildingWorker = allWorkers[2];
    
    scope.mechRepairersCanMine = true;
    
    consoleLog("My build order is: " + JSON.stringify(scope.buildOrder));
    scope.buildOrderFailedCount = 0;
    
    scope.atkTimes = [];
    scope.attackedAtLocations = [];
    
    //scope.chatMsg(getMyColor() + ": " + metas[Randomizer.nextInt(0, metas.length - 1)] + ", " + scope.allSubMetas[scope.baseMeta][Randomizer.nextInt(0, scope.allSubMetas[scope.baseMeta].length - 1)]);
    
    if(Randomizer.nextBoolean(0.025) && scope.numEnemies - 1 == scope.numAllies){
        let possibles = ["(;", "This game is already over.", "Any last words?", "For the proletarians!", "hehe"];
        if(Randomizer.nextBoolean(0.5)){
            scope.chatMsg(possibles[Randomizer.nextInt(0, possibles.length - 1)]);
        }
        let units = scope.getUnits({player: me});
        
        let enemyNr;
        let myTeam = scope.getMyTeamNumber();
        let players = scope.getArrayOfPlayerNumbers();
        
        for(let i = 0; i < 500; i++){
            enemyNr = players[Math.floor(scope.getRandomNumber(0, players.length - 1))];
            
            if(isFinite(scope.getTeamNumber(enemyNr)) == true && scope.getTeamNumber(enemyNr) != myTeam){
                break;
            }
        }
        scope.order("AMove", units, scope.getStartLocationForPlayerNumber(enemyNr));
        
        scope.order("Train Worker", scope.getBuildings({"type": "Castle", player: me}));
    }//Worker rush
}//end init

let workerToCastleRatio = Math.ceil(miningWorkers.length / getMyMinedMines().length);//how many workers there are for each minning castle.



let chatAtEnd = [];

/**
 * A class that builds a building within a bounding box of a x and y.
 * Passed an object with the following values set:
 * 
 * @param {number} centerX - the center of the bounding box in the x axis
 * @param {string} building - A string of what you want to build
 * @param {number} centerY - the center of the bounding box in the y axis
 * @param {number} buildRad - the radius of the bounding box.
 * 
 */
class RandBuild {
    constructor(obj){
        if(typeof obj.centerX != "number" || typeof obj.centerY != "number"){
            throw new TypeError("You must pass valid coordinates to RandBuild! Received coordinates: " + obj.centerX + ", " + obj.centerY)
        }
        if(scope.buildingSizes[obj.building][0] === undefined){
            throw new TypeError("RandBuild: " + obj.building + " does not have a building size listed!");
        }
        this.building = obj.building,
        
        this.buildWidth = scope.buildingSizes[this.building][0];//the width of the building
        this.buildHeight = scope.buildingSizes[this.building][1];//height of the building
        this.centerX = obj.centerX;//center of the bounding box
        this.centerY = obj.centerY;//ditto
        this.buildX = this.centerX - this.buildWidth / 2,//default. Will change through subsequent randomizer iterations.
        this.buildY = this.centerY - this.buildHeight / 2,
        this.buildWorkers = miningWorkers;//which workers build the building
        this.preferredBuildRad = null;
        this.buildRad = 15;//one-half of the build's bounding box's side. A buildRad of 15 means the building can be built in a box 30x30 squares wide, centered on centerX and centerY
        this.minDisFromCenter = 0;//minimum distance from the center, inclusive.
        this.tryTheseFirst = [];//A set of coordinates to try first. 
        //Pushed in as [x, y]. The coordinates are assumed to be the upper left-hand corner of the building
        //during the building checks. For example, if your want a watchtower to be constructed above or
        //below a castle, you would push [0, 2] (above) and [0, 4] (below). If all of the coordinates are invalid,
        //findSuitableSpot() will default to random searching. You can either pass hard-coded coordinates that are
        //not relative or relative coordinates. For example, passing [22, 14, false] will try, non-relativly, (22, 14) first, while
        //[22, 14] or [22, 14, true] will be relative to centerX and centerY
        this.heightComparison; //If you would like the build to be the same height as something else
        //(usually a castle and a goldmine), pass the height that the build should be at here.
        this.heightComparisonIsPreferred = false;//If set to true, then randBuild will make up to 
        //half of maxTires on the same height level, then will search for all height levels for the other half.
        
        this.maxTries = 100;//Maximum amount of attempts the algorithm will make for a buildable spot.
        //Note that the algorithm will also break if maxTries * 10 squares have been checked.
        
        this.dontBuild = [];//A list of locations that the algorithm will not touch. Passed in as [x, y, rad]. Rad is optional.
        //Rad is calculated from the center of the build.

        this.pad = 1;//How much the algorithm should check to the sides of the building.
        this.minObstructions = 0;//If you want the building to be built near
        //obstructions, this is how many squares need to be classified as
        //obstructions within the padding zone.
        //The padding zone is the zone beyond the actual building that is
        //checked for obstructions.

        //scope.chatMsg(this.centerX + ", " + this.centerY);
    }
    
    /**
     * A function to find a suitable spot for the build within the bounding box.
     * 
     * @returns {object} - the coordinates of a suitable spot in the format of
     * {x: foo, y: foo}
     */
    findSuitableSpot(){
        //Twists the tryTheseFirst array so that it doesn't always put a castle in the same place
        this.tryTheseFirst.sort(() => (Randomizer.nextBoolean() ? 1 : -1));
        
        this.fails = {"squares": 0,
            "places": 0,
            "minDist": 0,
            "path": 0,
            "ramp": 0,
            "height": 0,
            "dontBuild": 0,
            "checkline": 0,
        }//Debugging
        
        if(this.heightComparisonIsPreferred === true && this.heightComparison === undefined){
            throw new TypeError("You must pass a valid height comparison in order for preferred height comparison to work!")
        }

        //Makes sure that the bouding box is within the map, and if it's not, trim it down 
        //to not waste processing power on things outside of the map anyway.
        this.endBoundingBoxX = (this.centerX + this.buildRad - this.buildWidth) < scope.getMapWidth() ? (this.centerX + this.buildRad - this.buildWidth) : (scope.getMapWidth() - this.buildWidth);//rightmost x
        this.endBoundingBoxY = (this.centerY + this.buildRad - this.buildHeight) < scope.getMapHeight() ? (this.centerY + this.buildRad - this.buildHeight) : (scope.getMapHeight() - this.buildHeight);//rightmost y
        this.startBoundingBoxX = (this.centerX - this.buildRad) < 0 ? 0 : (this.centerX - this.buildRad);//leftmost x
        this.startBoundingBoxY = (this.centerY - this.buildRad) < 0 ? 0 : (this.centerY - this.buildRad);//leftmost y
        
        
        //Adjusts the bounding box in case the center is in the middle of two squares
        //Mostly unnnoticable, except in the case of castles.
        if(this.centerX % 1 != 0 || this.centerY % 1 != 0){
            this.startBoundingBoxX += this.centerX % 1;
            this.startBoundingBoxY -= this.centerY % 1;
            this.endBoundingBoxX += this.centerX % 1;
            this.endBoundingBoxY -= this.centerY % 1;
        }
        //Stuff that shouldn't be built around.
        //Converts the arrays into coordinates.
        for(let i = 0; i < this.dontBuild.length; i++){
            if(this.dontBuild[i][2] === undefined){
                this.dontBuild[i][2] = 1;
            }
        }
        
        this.oldBuildRad = this.buildRad;//Used in case a preferredBuildRad is set.
        //This will revert the preferredBuildRad to the original build rad.

        if(this.preferredBuildRad != null){
            this.buildRad = this.preferredBuildRad;
        }
        let SENTINEL = 0;//squares checked
        
        let doCheckHeight = true;
        let sucess = true;
        let dontCheckThese = [];
        if(this.building === "Castle"){
            let upperLeftCorner = {x: this.centerX - 1.5, y: this.centerY - 1.5};
            for(let x = 0; x < 3; x++){
                for(let y = 0; y < 3; y++){
                    dontCheckThese.push([upperLeftCorner.x + x, upperLeftCorner.y + y]);
                }
            }//Omits the goldmine from the checks
        }

        this.getNewLocation();//Fencepost problem. Because tryTheseFirst and dontBuild are checked when a new location is found,
        //get a location at the start.

        while(true){
            this.fails["places"]++;
            sucess = true;
            if(this.fails["places"] === Math.round(this.maxTries / 2)){
                this.buildRad = this.oldBuildRad;
            }

            if(this.building === "Castle"){
                 /**
                 * The stuff below checks the height level on a direct line between 
                 * (centerX , centerY) and (buildX, buildY) to make sure that there
                 * are no ravines or obstacles in between the two points.
                 */

                sucess = checkAlongLine(this.centerX, this.centerY, this.buildX + this.buildWidth / 2, this.buildY + this.buildHeight / 2, this.heightComparison, dontCheckThese, true);
                if(sucess === false){
                    this.fails["checkline"]++;
                    this.getNewLocation();
                }
            }
            
            if(this.heightComparisonIsPreferred === true){
                //If there is a height comparison set, check if we should turn off the height checker.
                if(this.fails["places"] > this.maxTries / 2){
                    doCheckHeight = false;
                }
            }
            
            if(sucess === true){
                //Checks the building and it's surroundings for suitability.
                const maxX = Math.ceil(this.buildX + this.buildWidth) + this.pad;
                const maxY = Math.ceil(this.buildY + this.buildHeight) + this.pad;
                for(let x = Math.floor(this.buildX - this.pad); x < maxX; x++){
                    for(let y = Math.floor(this.buildY - this.pad); y < maxY; y++){
                        SENTINEL++;
                        if(SENTINEL > this.maxTries * 10){
                            break;
                        }

                        let squareIsGood = true;
                        if(scope.positionIsPathable(x, y) === false){
                            squareIsGood = false;
                            this.fails["path"]++;
                        }
                        
                        if(scope.fieldIsRamp(x, y) === true){
                            squareIsGood = false;
                            this.fails["ramp"]++;
                        }
                        
                        if(squareIsGood == true && (this.pad == 0 || (x >= this.buildX && x < this.buildX + this.buildWidth && y >= this.buildY && y < this.buildY + this.buildHeight))){
                            //if the actual proposed structure is being checked
                            if(squareIsGood === true){
                                squareIsGood = this.buildingTileChecks();
                            }
                        }
                        
                        if(squareIsGood === false){
                            //breaks the loop
                            x = Math.ceil(this.buildX + this.buildWidth) + 1;
                            y = Math.ceil(this.buildY + this.buildHeight) + 1;

                            this.getNewLocation();//gets a new location
                            sucess = false;
                        }//This block only runs if the square is bad, and attempts to find a good spot. 
                    }
                }//Checks the surrounding area and the build to make sure there is no obstructions
                //and all other conditions are fufilled.
                
                if(doCheckHeight === true && this.heightComparison != undefined && this.heightComparison != scope.getHeightLevel(this.buildX + 1, this.buildY + 1)){
                    sucess = false;
                    this.fails["height"]++;
                }
            }
            if(sucess === true){
                break;
            }
            if(this.fails["places"] > this.maxTries){
                this.buildX = null;
                this.buildY = null;
                break;
            }
        }
        
        //debug stuff
        this.fails["squares"] = SENTINEL;
        

        //If we couldn't find a position
        if(this.buildX == null || this.buildY == null){
            let copy = {};
            let maxFails = 0;
            for(let key in this.fails){
                let numFails = this.fails[key];
                if(key === "squares"){
                    copy["squares"] = numFails;
                }else if(key === "places"){
                    copy["places"] = numFails;
                }else{
                    if(numFails > maxFails){
                        copy["maxFails"] = "key: " + key + ", numFails: " + numFails;
                        maxFails = numFails;
                    }
                }
            }
            //scope.chatMsg(getMyColor() + ": attempted build " + this.building + " has failed.");
            //scope.chatMsg(JSON.stringify(copy));
            return null;
        }

        //scope.chatMsg(getMyColor() + ": " + JSON.stringify(this.fails));
        return {"x": this.buildX, "y": this.buildY};
    }
    
    /**
     * Performs checks on the proposed building location, rather than the padding around the building.
     * 
     * @param {integer} x - The x coordinate
     * @param {integer} y - the y coordinate
     */
    buildingTileChecks(x, y){
        /*
        if(distanceFormula(x, y, this.centerX, this.centerY) < this.minDisFromCenter - this.buildWidth / 2){
            return false;
            this.fails["minDist"]++;
        }//If the building is too close to the center
        */
        
        if(this.building === "Castle"){
            //If the building is a castle, check to make sure it's not
            //within the radius of another mine.
            let mines = scope.getBuildings({type: "Goldmine"});
            mines.forEach(mine => {
                if(distanceFormula(mine.getX(), mine.getY(), x, y) <= 6.51){
                    return false;
                    this.fails["minDist"]++;
                }
            });
        }
        return true;
    }
    
    /**
     * Returns if a location is in the current proposed build spot's padding (not the place where the buildinng will be built, but rather in the surrounding area)
     */
    isPadding(x, y){
        return x >= this.buildX && x < this.buildX + this.buildWidth && y >= this.buildY && y < this.buildY + this.buildHeight
    }

    /**
     * Gets a new location if the proposed location in findSuitableSpot() is not
     * valid.
     * 
     * @returns {object} - an object containing the coordniates of a new location.
     */
    getNewLocation(){
        let SENTINEL2 = 0;
        let shouldBreak = false;
        while(shouldBreak === false){
            SENTINEL2++;

            //Makes up to 20 attempts to find a new location
            if(SENTINEL2 > 20){
                shouldBreak = true;
            }
            
            if(this.tryTheseFirst.length <= 0){
                //If there's nothing to try first, find a random location.
                this.buildX = Randomizer.nextInt(this.startBoundingBoxX, this.endBoundingBoxX);
                this.buildY = Randomizer.nextInt(this.startBoundingBoxY, this.endBoundingBoxY);
            }else{
                //If there's some coordinates to try, use them first.
                let relative = this.tryTheseFirst[0][2] === false ? false : true;
                if(relative === true){
                    //If the coordinates are relative ((centerX, centerY) is the center)
                    this.buildX = Math.round(this.centerX + this.tryTheseFirst[0][0]);
                    this.buildY = Math.round(this.centerY + this.tryTheseFirst[0][1]);
                }else{
                    //If the coordinates are non-relative (centered on (0, 0))
                    this.buildX = Math.round(this.tryTheseFirst[0][0]);
                    this.buildY = Math.round(this.tryTheseFirst[0][1]);
                }
                this.tryTheseFirst.splice(0, 1);
            }
            
            //Checks the array dontBuild to make sure that the proposed spot is not too close
            let dontBuildFailed = false;
            for(let i = 0; i < this.dontBuild.length; i++){
                let dist = distanceFormula(this.buildX + this.buildWidth / 2, this.buildY + this.buildHeight / 2, this.dontBuild[i][0], this.dontBuild[i][1]);
                if(dist < this.dontBuild[i][2]){
                    dontBuildFailed = true;
                    shouldBreak = false;
                    this.fails["dontBuild"]++;
                    i = this.dontBuild.length;
                }
            }
            
            if(dontBuildFailed === false){
                //Checks if it's far enough from the center
                if(distanceFormula(this.buildX + this.buildWidth / 2, this.buildY + this.buildHeight / 2, this.centerX, this.centerY) + this.buildWidth / 2 >= this.minDisFromCenter){
                    shouldBreak = true;
                }else{
                    this.fails["minDist"]++;
                }
            }
        }
    }
    
    /**
     * Actually gives the order to build the building. Throws an error if
     * the build object is unacceptable.
     * 
     * @param {object} obj - an object containing the coordinates of the build.
     * Technically you can pass whatever you want here, but it is highly
     * advisable to call findSuitableSpot() for buildAt
     */
    buildAt(obj){
        if(typeof obj != "object"){
            throw new TypeError("Cannot build at coordinates " + JSON.stringify(obj) + "! Recieved type: " + typeof obj + "!")
        }
        if(scope.buildPrio[this.building] == undefined){
            throw new TypeError("We do not have a building type of " + this.building + " listed in scope.buildPrio.")
        }
        /*if(this.buildWorkers.length == 0){
            throw new TypeError("No build workers were provided for a build of " + this.building);
        }*/
        scope.order("Build " + this.building, this.buildWorkers, obj);
        consoleLog("Building a " + this.building + " at " + JSON.stringify(obj));
    }
    
    /**
     * Checks to see if the bot is playing on a map with predetermined wall-off locations (ex. on Ravaged)
     * If so, orders the buildings to be built at a hardcoded location.
     */
    strategicBuildPlace(){
        if(this.building == "House" && myBuilds["Houses"].length > 0){
            return;
        }
        if((this.building == "Barracks" && myBuilds["Barracks"].length > 0) || (this.building == "Wolves Den" && myBuilds["Wolves Dens"].length > scope.hasProxied == true ? 1 : 0)){
            return;
        }
        if(time > 350){
            return;
        }
        
        
        let arr = [];
        for(let x = 0; x < 10; x++){
            for(let y = 0; y < 10; y++){
                arr.push(scope.mapNodes.getNodeAt(x, y).isWall() == true ? 0 : 1);
            }
        }
        
        //Ravaged
        consoleLog("Is strategy time? " + (JSON.stringify(arr) == "[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,1,1]"));
        if(scope.numAllies == 0 && JSON.stringify(arr) == "[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,1,1]"){
            /*
            this.buildRad = 25;
            this.pad = 0;
            this.heightComparison = undefined;
            this.tryTheseFirst.push([33, 16, false], [82, 100, false]);
            */
            
            if(this.building == "House"){
                let start = scope.getStartLocationForPlayerNumber(me);
                if(distanceFormula(33, 16, start.x, start.y) < distanceFormula(82, 100, start.x, start.y)){
                    //red
                    this.buildAt({x: 33, y: 18});
                }else{
                    //blue
                    this.buildAt({x: 85, y: 101});
                }
            }else if(this.building == "Barracks" || this.building == "Wolves Den"){
                let start = scope.getStartLocationForPlayerNumber(me);
                if(distanceFormula(33, 16, start.x, start.y) < distanceFormula(82, 100, start.x, start.y)){
                    //red
                    this.buildAt({x: 36, y: 15});
                }else{
                    //blue
                    this.buildAt({x: 82, y: 104});
                }
            }
        }
    }
}

/**
 * Really just a class to calculate the optimal build location of a proxy.
 * 
 * @param {string} type -- the type of proxy to be created. Currently only supports barracks, wolves den, and workshop.
 *  If one of these strings is not passed, glitches will happen.
 * @param {number} minRad -- the minium distance that the proxy can be built to the opponent's start location.
 * @param {number} maxRad -- The maximum distance that the proxy can be built to the opponent's start location.
 */
class ProxyBuild {
    constructor(type, minRad, maxRad){
        this.type = type;
        this.width = scope.buildingSizes[this.type][0];//the width of the building
        this.height = scope.buildingSizes[this.type][1];//height of the building
        this.rad = maxRad;
        this.minRad = minRad;
        
        this.startLoc = scope.getStartLocationForPlayerNumber(me);
        this.enLoc = Us.getRandAttackLoc();
        
        if(this.startLoc == null || this.enLoc == null){
            scope.willProxy = false;
            scope.hasProxied = false;
            scope.proxyWorker = undefined;
            return;
        }
        
        this.pathToOppBase = astar.search(scope.mapNodes, scope.mapNodes.getNodeAt(this.startLoc.x + 3, this.startLoc.y), scope.mapNodes.getNodeAt(this.enLoc.x - 3, this.enLoc.y));
        
        let counter = 0;
        //Keeps every 3rd or 4th node, I'm too lazy to figure out which one.
        for(let i = this.pathToOppBase.length - 1; i > -1; i--){
            counter++;
            if(counter < 3){
                this.pathToOppBase.splice(i, 1);
            }if(counter > 4){
                counter = 0;
            }
        }      
    }
    
    /**
     * Scores a building tile (where the building will actually sit)
     * 
     * @param {number} x - x-coordinate of the tile.
     * @param {number} y - y-coordinate of the tile.
     * @returns {number} - The score of the tile.
     */
    scoreBuildingTile(x, y){
        if(scope.positionIsPathable(x, y) == false || scope.fieldIsRamp(x, y) == true){
            return -9999;
        }
        return 0;
    }
    
    /**
     * Scores a padding tile (the tiles surrounding the building)
     * 
     * @param {number} x - x-coordinate of the tile.
     * @param {number} y - y-coordinate of the tile.
     * @returns {number} - The score of the tile.
     */
    scorePaddingTile(x, y){
        let score = 0;
        if(scope.positionIsPathable(x, y) == false){
            score += 15;
        }
        return score;
    }
    
    /**
     * Scores a location, rather than the tiles.
     * 
     * @param {number} x - x-coordinate of the location.
     * @param {number} y - y-coordinate of the location.
     * @returns {number} - The score of the location.
     */
    scoreLocation(x, y){
        let score = 0;
        score += distanceFormula(x, y, this.startLoc.x, this.startLoc.y) / 2;
        score -= distanceFormula(x, y, this.enLoc.x, this.enLoc.y) * 2;
        
        let closestDist = 9999999;
        this.pathToOppBase.forEach(node => closestDist = Math.min(closestDist, octileCoords(node.x, node.y, x, y)))
        
        score += Math.min(closestDist * 4.25, 20);//Make sure it's not directly on the path to our base if we can help it
        
        //Farther away from goldmines = good
        let closestGoldmineDist = 9999999;
        scope.getBuildings({type: "Goldmine"}).forEach(mine => {
            closestGoldmineDist = Math.min(distanceFormula(mine.getX(), mine.getY(), x, y), closestGoldmineDist);
        });
        
        score += Math.min(closestGoldmineDist * 4, 25);
        
        return score;
    }
    
    /**
     * Scores a potential build location.
     * Loops thorugh all tiles within the building and the padding. 
     *  For building tiles, will call scoreBuildingTile().
     *  For padding (surrounding) tiles, will call scorePaddingTile().
     * 
     * @param {number} buildX - x-coordinate of the proposed build location.
     * @param {number} buildY - y-coordinate of the proposed build location.
     * @returns {number} - The sum of the score of the tiles.
     */
    scoreBuildTiles(buildX, buildY){
        let score = 0;
        for(let x = buildX - 1; x < buildX + this.width + 1; x++){
            for(let y = buildY - 1; y < buildY + this.height + 1; y++){
                if(x >= buildX && x < buildX + this.width && y >= buildY && y < buildY + this.height){
                    //Building
                    score += this.scoreBuildingTile(x, y);
                }else{
                    //Padding
                    score += this.scorePaddingTile(x, y);
                }
                
                if(score <= -1000){
                    //If it's just an all-around terrible location, don't keep scoring the build.
                    return -999999;
                }
            }
        }
        
        score += this.scoreLocation(buildX, buildY);
        
        return score;
    }
    
    /**
     * Loops through all possible locations within the bounding box. As long as they are
     * greater than the minimum radius, it will call scoreBuildTiles() on the location.
     * Whichever location returns the largest score is considered the best position.
     * A randomized number is added to each score to provide some degree of randomness.
     * 
     * @returns {object} - The highest-scored location.
     */
    scorePositions(){
        let maxX = Math.min(Math.ceil(this.enLoc.x + this.rad), scope.getMapWidth());
        let maxY = Math.min(Math.ceil(this.enLoc.y + this.rad), scope.getMapHeight());
        
        let bestScore = -1000;
        let bestLoc;
        let counter = 0;
        
        for(let x = Math.max(Math.floor(this.enLoc.x - this.rad), 0); x < maxX; x++){
            for(let y = Math.max(Math.floor(this.enLoc.y - this.rad), 0); y < maxY; y++){
                if(distanceFormula(this.enLoc.x, this.enLoc.y, x, y) < this.minRad){
                    continue;
                }
                counter++;
                let curScore = this.scoreBuildTiles(x, y) + Randomizer.nextInt(-50, 50);
                if(curScore > bestScore){
                    bestLoc = {"x": x, "y": y};
                    bestScore = curScore;
                }
            }
        }        
        return bestLoc;
    }
}


/**
 * A very general class with many static methods.
 */
class Us {
    
    
    /**
     * Orders idle workers to either the nearest mine or the mine with the smallest workload.
     *  If there is no significant difference in workloads between mined mines, then the worker
     *  is sent to the nearest mine. Other
     */
    static idleWorkersMine(){
        let mines = getMyMinedMines(false);
        if(myBuilds["CastleAndFortresses"].length >= 1 && idleWorkers.length > 0){
            if(scope.mechRepairersCanMine == false){
                //If the mech repairers are needed elsewhere, 
                let mID;
                let lazyWorkers = idleWorkers.filter(u => {
                    mID = u.getUnitID();
                    return scope.mechRepairSquad.some(u2 => u2.getUnitID() == mID) == false;
                })
            }
            //Gets the nearest allied castle, then finds the nearest mine
            //to that castle and sends workers there.

            for(let i = mines.length - 1; i > -1; i--){
                let mine = mines[i];
                (isEnemyAroundBuilding(mine) || mine.getValue("gold") <= 0) ? mines.splice(i, 1) : null;
            }//Sorts out mines that don't have gold or have enemies around them

            if(mines.length > 0){
                mines.sort((a, b) => {
                    return a.getValue("lastWorkerCount") - b.getValue("lastWorkerCount");
                });//Sorts mines in ascending order based on how many workers are mining the mine

                let minesAndWorkers = [];
                mines.forEach(mine => {
                    minesAndWorkers.push({"mine": mine, "numWorkers": mine.getValue("lastWorkerCount")});
                });//Creates object wrappers to keep track of everything in the next step

                let averageArr = [];
                minesAndWorkers.forEach(obj => averageArr.push(obj.numWorkers));

                let ratio = Math.floor(average(averageArr));
                
                let possibles =[];
                myBuilds["CastleAndFortresses"].forEach(c => c.isUnderConstruction() == false && possibles.push(c))
                
                idleWorkers.forEach(worker => {
                    if(scope.willProxy == false || scope.proxyWorker == undefined || worker.getUnitID() != scope.proxyWorker.getUnitID()){
                        if(minesAndWorkers[0].numWorkers >= ratio){
                            //If the ratio is about good, go to the closest mine.
                            let closeMines = [];
                            let nearestCastle = getClosestTo(possibles, {x: worker.getX(), y: worker.getY()});
                            let nearestMine = getClosestTo(mines, {x: nearestCastle.getX(), y: nearestCastle.getY()}); 
                            let nearestDist = distanceFormula(nearestCastle.getX() + 1.5, nearestCastle.getY() + 1.5, nearestMine.getX() + 1, nearestMine.getY() + 1);
                            mines.forEach(function(mine){
                                if(distanceFormula(mine.getX() + 1, mine.getY() + 1, nearestCastle.getX() + 1.5, nearestCastle.getY() + 1.5) < Math.floor(nearestDist + 3)){
                                    closeMines.push(mine);
                                }
                            });

                            scope.order("Mine", [worker], {unit: closeMines[Randomizer.nextInt(0, closeMines.length - 1)]});
                            
                        }else{
                            //If the ratio is way off, send the worker to the mine that needs it the most.
                            scope.order("Mine", [worker], {unit: minesAndWorkers[0].mine});
                            minesAndWorkers[0].numWorkers++;
                            if(minesAndWorkers[1] != undefined && minesAndWorkers[0].numWorkers > minesAndWorkers[1].numWorkers){
                                //scope.chatMsg("Spliced out an index");
                                minesAndWorkers.splice(0, 1);
                            }
                        }
                    }
                });//Assigns idle workers based on how mnay workers are already mining there.
            }else if(myBuilds["CastleAndFortresses"].length > 0){
                //Possible long-distance mining scenario; mine what we can
                let goldenMines = goldmines.filter(m => m.getValue("gold") > 0);
                let mine = getClosestTo(goldenMines, {x: myBuilds["CastleAndFortresses"][0].getX(), y: myBuilds["CastleAndFortresses"][0].getY()});
                scope.order("Mine", idleWorkers, {unit: mine});
            }
        }
    }
    
    /**
     * A very general update that is called every tick.
     * 
     * Lots of the Us static methods are activated here.
     */
    static update(){
        
        if(scope.shouldUpdate === false){
            return;
        }
        let times = {};
        let start = new Date().getTime();
        if(idleWorkers.length > 0){
            Us.idleWorkersMine();
            times["idleWorkersMine"] = new Date().getTime();
        }
        
        if(scope.nextTalkTick == time){
            //doBotChat();
        }

        //Calculates and updates my power
        let myPower = 0; 
        for(let i = 0; i < fightingUnits.length; i++){
            let power = scope.getPowerOf(fightingUnits[i]);
            if(power != undefined){
                myPower += power;
            }
        }
        scope.myPower = myPower;
        
        let alliedUnits = scope.getUnits({notOfType: "Worker", team: myTeam});
        let alliedPower = 0;
        for(let i = 0; i < alliedUnits.length; i++){
            alliedPower += scope.getPowerOf(alliedUnits[i]);
        }
        alliedPower -= myPower;//Since our units are counted as well
        scope.alliedPower = alliedPower;

        //Calculates and updates enemy power
        let enPower = 0;
        enemyUnits.forEach(unit => {
            enPower += scope.getPowerOf(unit);
        });
        scope.enPower = enPower;
        scope.maxEnPowerEncountered = Math.max(scope.maxEnPowerEncountered, enPower);
        times["powerCalc"] = new Date().getTime();

        if((time % scope.tickrate["BuildCastle"] === 0 || gold >= 350)){
                        
            let lastCastle = scope.firstCastle;
            let base = new Base(lastCastle.getX(), lastCastle.getY(), false);

            //If there are no (known) enemies or enemy buildings, we are not in a map with no expansions, we are not under attack, and either we have too many workers or we are just starting out and need to grab a quick goldmine for increased production, then build a castle.
            if(base.nearestMine != undefined 
              && isEnemyAroundPosition(base.nearestMine.getX(), base.nearestMine.getY()) === false 
              && scope.startUnminedMines.length > 0
              && scope.getUnits({type: "Worker", player: me, order: "Build Castle"}).length <= 1//Make sure we don't have workers going out to try and build a castle
              && (scope.underAttack === false || scope.attackingFightingUnits?.length <= 3)
              && (scope.didProxy == false || myBuilds.combatUnitProducers.length > 1)
              && (scope.usingBuildOrder == false || scope.myPower > Math.min(myBuilds["CastleAndFortresses"].length * 2, 7))
              && (workerToCastleRatio >= scope.maxWorkersOnBase || (myBuilds["CastleAndFortresses"].length === 1 && allWorkers.length > 8 && scope.usingBuildOrder === false && scope.myPower > 0))
              ){
                if(gold >= 350){
                    if(lastCastle != undefined){
                        base.constructCastle();
                    }
                    scope.doTrainUnits = true;
                    scope.doBuildBuildings = true;
                }else{
                    (scope.myPower > Math.min(scope.maxEnPowerEncountered * 1.5, 12)) ? scope.doTrainUnits = false : scope.doTrainUnits = true;
                    scope.doBuildBuildings = false;
                    
                    if(gold > Math.max(350 - (scope.income / 2), 200) && scope.castleBuildingWorker.getCurrentOrderName() != "Build Castle" && (scope.castleBuildingWorker.getCurrentOrderName() != "Moveto" || scope.castleBuildingWorker == undefined)){
                        if(scope.castleBuildingWorker == undefined || scope.castleBuildingWorker.getCurrentHP() <= 30 || scope.mechRepairSquad.some(u => u.getUnitID() == scope.castleBuildingWorker.getUnitID())){
                            scope.castleBuildingWorker = miningWorkers[Randomizer.nextInt(0, miningWorkers.length - 1)];
                        }
                        scope.order("Moveto", [scope.castleBuildingWorker], base.nearestMine);
                    }
                }
            }else{
                scope.doTrainUnits = true;
                scope.doBuildBuildings = true;
            }

            if(scope.getGold() > 400 || getNumBuildingAndWorkersBuilding("Castle", false) != getNumBuildingAndWorkersBuilding("Castle", true)){
                scope.doTrainUnits = true;
                scope.doBuildBuildings = true;
            }
            
            if(myBuilds["CastleAndFortresses"].length === 1 && myBuilds["Houses"].length > 0 && allWorkers.length < 8){
                //Bot prioritizes a second castle over building houses
                scope.doBuildBuildings = false;
            }

            times["buildCastle"] = new Date().getTime();
        }//If there are valid gold mines, too many workers, and we are not under 
        //attack, save up and build another castle. Either that, or if we have
        //one castle, only build a house and rush the second castle. 
        
        if(time % scope.tickrate["Repair"] === 0){
            Us.repair();
            times["repair"] = new Date().getTime();
        }
        
        if(time % scope.tickrate["Defend"] === 0){
            Us.defend();
            times["defend"] = new Date().getTime();
        }

        if(time % scope.tickrate["ArmyBrain"] === 0){
            Army.armyBrain();
            times["armyBrain"] = new Date().getTime();
        }

        if(time % 3 === 0 && DIFFICULTY >= 1 && scope.buildOrder?.length == 0){
            Us.useTowers();
            times["useTowers"] = new Date().getTime();
        }

        if(time % 3 === 0 && DIFFICULTY >= 1){
            Army.manageWorkers();
            times["manageWorkers"] = new Date().getTime();
        }
        
        if(time % 2 === 0){
            Army.updateArmies();
            times["updateArmy"] = new Date().getTime();
        }

        if((time + 1) % 2 == 0 && scope.meta.includes("Beast") && DIFFICULTY >= 1){
            Army.pullDamaged();
            times["pullDamaged"] = new Date().getTime();
        }

        if(time % scope.tickrate["KiteAndRetreat"] === 0){
            let missions = [];
            for(let id in scope.allArmiesByID){
                missions.push(scope.allArmiesByID[id].mission);
            }
            let start2 = new Date().getTime();
            for(let id in scope.allArmiesByID){
                if(scope.allArmiesByID[id].mission != "drop"){
                    scope.allArmiesByID[id].kiteAndRetreat();
                }
            }
            times["kiteAndRetreat"] = new Date().getTime();
            let end2 = new Date().getTime();
            let diff2 = end2 - start2;
            if(diff2 > 10){
                //consoleLog("Filtered: " + JSON.stringify(Array.from(Object.entries(KAR_Debug)).filter(a => a[1] > 10).sort((a, b) => a[1] < b[1])));
            }
        }

        if(time % 1 === 0){
            Us.executeBuildOrder();
            times["executeBuildOrder"] = new Date().getTime();
        }

        if(time % scope.tickrate["Build"] === 0 && scope.usingBuildOrder === false){
            if(scope.doBuildBuildings === true){//Builds a random building
                if(scope.usingBuildOrder === false){
                    Us.reviseBuildPrio();
                }
                
                let buildThis = findRandomPrioKey(scope.buildPrio);//string typeName of something to build
                
                if(buildThis != undefined || scope.willProxy == true){
                    gold = scope.getGold();
                    if(scope.willProxy == true && ((buildThis == "Barracks" && gold >= 125) || (buildThis == "Wolves Den" && gold >= 100) || (buildThis == "Workshop" && gold >= 125)) && myBuilds.combatUnitProducers.length <= 0){
                        Us.proxyProductionBuild();//Puts out a proxy
                        scope.willProxy = false;
                    }else if(buildThis != undefined){
                        Us.build(buildThis);
                    }
                }
            }
            
            times["build"] = new Date().getTime();
        }
        
        if((time % scope.tickrate["Train"] === 0) || scope.usingBuildOrder === true){
            if(scope.doTrainUnits === true && supplyDiff > 0){
                if(scope.usingBuildOrder === false){
                    Us.reviseUnitPrio();
                }
                
                let trainThis = findRandomPrioKey(scope.unitPrio);
                if(trainThis != undefined){
                    if(trainThis === "Bird"){
                        //Train a single bird, then find something more
                        //useful to trian.
                        trainUnit("Bird", 1);
                        let SENTINEL = 0;
                        while(true){
                            SENTINEL++;
                            trainThis = findRandomPrioKey(scope.unitPrio);
                            if(trainThis != "Bird" || SENTINEL > 10){
                                break;
                            }
                        }
                    }

                    trainUnit(trainThis);
                }
            }
            times["train"] = new Date().getTime();
        }
        
        if(time % 9 === 0){
            Us.reviseUpgradePrio();
            times["reviseUpgradePrio"] = new Date().getTime();
        }
        
        if(time % scope.tickrate["Attack"] === 0 || scope.atkTimes.includes(time)){
            if(Us.shouldAttack() === true || scope.atkTimes.includes(time)){
                Us.attack();
                if(scope.atkTimes.includes(time)){
                    scope.atkTimes.splice(scope.atkTimes.indexOf(time), 1);
                }
            }else if(scope.justAttacked === true){
                scope.setTimeout(function(){
                    scope.justAttacked = false;
                }, scope.tickrate["Attack"] * 1000);
            }
            times["attack"] = new Date().getTime();
        }
        
        if(time % scope.tickrate["Scout"] === 0){
            Us.scout();
            times["scout"] = new Date().getTime();
        }
        
        if(time % 3 === 0){
            Us.assignWorkers();
            times["assignWorkers"] = new Date().getTime();
        }
        
        if(time % 3 === 0){
            Us.preventCheese();
            times["preventCheese"] = new Date().getTime();
        }
        
        if(time < 5 && scope.buildOrderMisc["workerScout"] === true){
            Us.workerScout();
        }
        
        if(time % 10 === 0 && DIFFICULTY >= 1){
            Us.brain();
            times["Us.brain"] = new Date().getTime();
        }

        if(time % 5 === 0){
            Us.updateSubPrioMisc();
            times["subPrioMisc"] = new Date().getTime();
        }

        if(time % 2 === 0){
            Us.useAbilites();
            times["useAbilites"] = new Date().getTime();
        }

        if((time + 1) % 2 === 0){
            Us.useBirds();
            times["useBirds"] = new Date().getTime();
        }

        if(time % 9 === 0){
            Us.switchSubMeta();
            Us.switchMeta();
            times["subMetaSwitch"] = new Date().getTime();
        }
        
        if((time + 1) % 2 == 0){
            Us.cancelAttacked();
            times["cancelAttack"] = new Date().getTime();
        }

        let end = new Date().getTime();
        let diff = end - start;
        let last = null;
        
        let biggest = 0;
        let biggestKey = "Nothing";
        for(let key in times){
            let newLast = times[key];
            if(last != null){
                times[key] = Math.round(times[key] - last);
            }else{
                times[key] = Math.round(times[key] - start);
            }
            
            if(times[key] > biggest){
                biggest = times[key];
                biggestKey = key;
            }

            if(Math.floor(last) == Math.floor(times[key])){
                delete times[key];
            }
            last = newLast;
        }
        if(diff > 10){
            //scope.chatMsg(getMyColor() + "'s operations took " + diff + " milliseconds."); 
            //scope.chatMsg(getMyColor() + ": " + JSON.stringify(times).replaceAll(",", ", "));
            consoleLog(getMyColor() + ": " + biggestKey + " took up " + biggest + " ms, " + ((biggest / diff) * 100) + "% of total processing time.");
        }
    }

    /**
     * Builds towers at obnoxious places and times.
     * 
     * If it is lategame, it will spam tower production across the map.
     * If the bot has just attacked, there is a chance it will launch a worker to place
     *  a tower in a random location near one of the player's buildings for additional pressure.
     */
    static useTowers(){
        //If it's lategame and we have too much gold, spam towers across the map for map control. Even if the opponent intercepts
        //a lot of the towers, the rest of the towers will allow the bot to get a massive amount of map control and restrict the opponent.
        if((scope.getGold() > 400 + myBuilds.combatUnitProducers.length * 80 || (scope.getGold() > 400 && supplyDiff < 5)) && scope.myPower > 15 && miningWorkers.length > 0){
            let build = new RandBuild({building: "Watchtower", "centerX": myBuilds["CastleAndFortresses"][0].getX(), "centerY": myBuilds["CastleAndFortresses"][0].getY()});

            enemyBuildings.forEach(function(enBuild){
                build.dontBuild.push([enBuild.getX(), enBuild.getY(), 10]);
            });
            
            build.buildRad = Math.max(scope.getMapWidth(), scope.getMapHeight());
            
            
            if(Randomizer.nextBoolean(0.45)){
                //If we've been attacked a lot in one place, build a tower there
                let greatestPlace = null;
                let mostAttackTimes = 0;
                let locs = scope.attackedAtLocations.slice();
                for(let i = 0; i < locs.length; i++){
                    let curLoc = locs[i];
                    if(curLoc != undefined){
                        let counter = 0;
                        for(let ii = locs.length - 1; ii > -1; ii--){
                            if(curLoc.x == locs[ii].x && curLoc.y == locs[ii].y){
                                counter++;
                                locs.splice(ii, 1);
                            }
                        }
                        if(counter > mostAttackTimes){
                            greatestPlace = curLoc;
                            mostAttackTimes = counter;
                        }
                    }
                }
                if(mostAttackTimes > 5){
                    build.buildX = greatestPlace.x + 5;
                    build.buildY = greatestPlace.y + 5;
                }
            }

            let loc = build.findSuitableSpot();
            if(loc != null){
                build.buildAt(loc);
            }
        }

        //If we're feeling cheesy, put a tower right next to one of the enemy's potential expands.
        //Or, if the bot failed to scout (again), see how much attention they're actually paying to their
        //expands.
        //Has a weird glitch where it will actually build a tower next to it's own expand. I guess that's not
        //such a bad thing...?
        if(Randomizer.nextBoolean(0.01) && gold > 130 && scope.doBuildBuildings == true && scope.getStartLocationForPlayerNumber(me) != undefined && miningWorkers.length > 0){

            //Finds the goldmines that aren't around anything.
            let notAroundAnything = [];
            let startPositions = [];
            let arrPlrNums = scope.getArrayOfPlayerNumbers();
            for(let i = 0; i < arrPlrNums.length; i++){
                startPositions.push(scope.getStartLocationForPlayerNumber(arrPlrNums[i]));
            }
            goldmines.forEach(mine => {
                if(startPositions.some(p => distanceFormula(p.x, p.y, mine.getX(), mine.getY()) < 15) == false && myBuilds["CastleAndFortresses"].some(c => distanceFormula(c.getX(), c.getY(), mine.getX(), mine.getY()) < 15) == false && enemyBuildings.some(b => octileCoords(b.getX(), b.getY(), mine.getX(), mine.getY()) < 10) == false){
                    notAroundAnything.push(mine);
                }
            });

            //consoleLog("There are " + notAroundAnything.length + " mines that are around nothing.");
            if(notAroundAnything.length > 0){
                //Gets the closest goldmine to a random attack location
                let loc = Us.getRandAttackLoc();
                let start = Graph.findNearestPathableNode(loc.x, loc.y, 4);
                let bestDist = 9999999;
                let bestMine = null;
                //consoleLog("rand attack loc: " + JSON.stringify(loc));
                //consoleLog("start: " + JSON.stringify(start));

                //Loops through the mines and finds the least distance to walk to the random attack location
                notAroundAnything.forEach(mine => {
                    let closePathable = Graph.findNearestPathableNode(mine.getX() + 1, mine.getY() + 1, 4);
                    //consoleLog("closePathable: " + (closePathable.x + ", " + closePathable.y));
                    if(closePathable != undefined){
                        let path = astar.search(scope.mapNodes, start, closePathable);
                        let dist = astar.findDistOfPath(path);

                        //consoleLog("dist: " + dist);
                        //consoleLog("path length: " + path.length);
                        if(dist < bestDist){
                            bestDist = dist;
                            bestMine = mine;
                            //consoleLog("A distance of " + dist + " is less than " + bestDist + ".");
                        }
                        //consoleLog("is pathable: " + scope.positionIsPathable(closePathable.x, closePathable.y));
                    }
                });

                //consoleLog("best mine pos: " + bestMine.getX() + ", " + bestMine.getY());

                let build = new RandBuild({centerX: bestMine.getX() + 1, centerY: bestMine.getY() + 1, building: "Watchtower", buildRad: 5});
                build.pad = 0;
                build.buildAt(build.findSuitableSpot());
            }
        }
    }

    /**
     * Updates the subMeta's misc stuff.
     */
    static updateSubPrioMisc(){
        const subPrioMisc = scope.subMetaPrios["Misc"];

        if(scope.subPrioMiscInitalized == undefined && subPrioMisc != undefined && subPrioMisc.singleProduction != undefined){
            let onlyProduceOneArr = subPrioMisc.singleProduction;
            for(let i = 0; i < onlyProduceOneArr.length; i++){
                let name = onlyProduceOneArr[i];
                //scope.chatMsg("We will now only produce one of " + name);
                scope.onlyProduceOneOfThese.push(name);
                scope.dontProduceFromThese.add(name);
            }
            scope.subPrioMiscInitalized = true;
        }
        //scope.chatMsg("mage guild priority: " + scope.buildPrio["Mages Guild"]);
    }

    /**
     * Executes the build order.
     */
    static executeBuildOrder(){
        //consoleLog(getMyColor() + ": " + JSON.stringify(scope.buildOrder[0]));
        /*let prioritized = [];
        Object.keys(scope.buildPrio).forEach((key) => (scope.buildPrio[key] > 0 ? prioritized.push(key) : null));
        scope.chatMsg(JSON.stringify(prioritized));*/
        
        if(scope.buildOrder.length > 0){
            if(scope.priorityBuild != undefined){
                Us.build(scope.priorityBuild);
                if(scope.getBuildings({type: scope.priorityBuild, player: me}).length > 0){
                    scope.priorityBuild = null;
                }
                return;
            }
            if(scope.lastNumOfBuildings < myBuilds.allBuilds.length){
                for(let key in scope.buildPrio){
                    scope.buildPrio[key] = 0;
                }
            }
            for(let key in scope.unitPrio){
                scope.unitPrio[key] = 0;
            }
            
            let name = scope.buildOrder[0][0];
            let id_name = name.toLowerCase().replaceAll(" ", "");
            let failReason = "None given.";
            //id_name = id_name.replace(" ", "");
            //scope.chatMsg("name: " + id_name + "'s cost: " + scope.getTypeFieldValue(id_name, "cost") + " " + (typeof scope.getTypeFieldValue(id_name, "cost")));
            
            if(name == "Attack"){
                Us.attack();
                scope.buildOrder.splice(0, 1);
            }else{
                if(scope.getTypeFieldValue(id_name, "cost") == null){
                    throw new TypeError("Failed to corerce " + name + " into a valid id_name. Recieved id_name: " + id_name);
                }
                if(typeof scope.buildOrder[0][1] != "number"){
                    throw new TypeError("You must provide a count of how mnay units/buildings are to be produced by a build order! Recieved amount: " + JSON.stringify(scope.buildOrder[0][1]));
                }
                if(gold >= scope.getTypeFieldValue(id_name, "cost")){
                    let suceeded = false;
    
                    if(Object.keys(scope.buildPrio).includes(name)){
                        //For buildings
                        if(name === "Castle"){
                            if(gold >= 350){
                                //Castles don't use buildPrio, so this is needed to trigger their building.
                                scope.maxWorkersOnBase = workerToCastleRatio - 1;
                                let lastCastle = scope.firstCastle;
                                let base = new Base(lastCastle.getX(), lastCastle.getY(), false);
                                if(lastCastle != undefined){
                                    base.constructCastle();
                                }
                                
                                suceeded = true;
                                
                                scope.buildOrder[0][3] == undefined ? scope.buildOrder[0][3] = 1 : scope.buildOrder[0][3]++;
                            }
                        }else if(scope.buildOrder[0][2]?.proxy == true){
                            if(scope.getTypeFieldValue(id_name, "cost") <= scope.getGold() && findIfHouseHasBeenFinished() == true){
                                
                                Us.proxyProductionBuild();//Puts out a proxy
                                scope.willProxy = false;
                                suceeded = true;
                            }else{
                                suceeded = false;
                            }
                            
                            if(suceeded == true){
                                consoleLog("Proxy building suceeded.");
                                scope.buildOrder[0][3] == undefined ? scope.buildOrder[0][3] = 1 : scope.buildOrder[0][3]++;
                            }
                        }else if(scope.getTypeFieldValue(id_name, "cost") <= scope.getGold()){
                            //scope.buildPrio[name] = 1;
                            if(scope.lastPossibleFail != undefined){
                                if(scope.lastNumBuilds == scope.getBuildings({type: scope.lastPossibleFail, player: me}).length){
                                    
                                }
                            }
                            if(name == "Wolves Den" || name == "Barracks" || name == "Dragons Lair" || name == "Workshop"){
                                 if(findIfHouseHasBeenFinished() == true){
                                     //consoleLog(scope.getBuildings({type: "House", player: me, onlyFinshed: true}).filter(b => (time - b.getValue("tickOfCreation") / 20) > (b.getValue("tickOfCreation") / 20) + b.getFieldValue("buildTimeInSec") + 3));
                                     /*myBuilds["Houses"].forEach(function(b){
                                         consoleLog((time - b.getValue("tickOfCreation") / 20) + " versus " + (b.getValue("tickOfCreation") / 20) + scope.getTypeFieldValue("House", "buildTime") / 20 + 3);
                                     });*/
                                     //suceeded = true;
                                     //consoleLog("Setting a timeout.")
                                     //scope.setTimeout(function(str, onFalse){
                                     let numBuilds = scope.getBuildings({type: name, player: me}).length;
                                     suceeded = Us.build(name);
                                     if(suceeded == true){
                                         scope.lastPossibleFail = name;
                                         scope.lastPossibleFailTick = time;
                                         scope.lastNumBuilds = numBuilds;
                                     }
                                     //}, 5000, JSON.parse(JSON.stringify(name)), JSON.parse(JSON.stringify(scope.buildOrder[0])));
                                 }else{
                                     suceeded = false;
                                 }
                                 /*
                                 let beginning = scope.getUnits({type: "Worker", order: "Build " + name, player: me}).length;
                                 Us.build(name)
                                 if(scope.getUnits({type: "Worker", order: "Build " + name, player: me}).length != beginning){
                                     suceeded = true;
                                 }*/
                            }else{
                                suceeded = Us.build(name);
                            }
                            if(suceeded == true){
                                scope.buildOrder[0][3] == undefined ? scope.buildOrder[0][3] = 1 : scope.buildOrder[0][3]++;
                            }
                        }
                        
                        //TODO: Put additional options here.
                        if(scope.buildOrder[0][2] != undefined){
                            let isValid = false;
                            if(scope.buildOrder[0][2].proxy != undefined){
                                isValid = true;
                            }
                            
                            
                            if(!isValid){
                                throw new TypeError("The additional options specified (" + JSON.stringify(scope.buildOrder[0]) + ") do not contain valid build order options.");
                            }
                        }
                    }else if(Object.keys(scope.unitPrio).includes(name)){
                        //For units
                        let finishedBuilds;
                        if(name != "Worker"){
                            finishedBuilds = scope.getBuildings({type: scope.unitProducedAtTypeName[name], player: me, onlyFinshed: true});
                        }else{
                            //Workers require a bit of a workaround, since there is no 'CastleAndFortresses' building in LWG.
                            finishedBuilds = scope.getBuildings({type: "Castle", player: me, onlyFinshed: true}).concat(myBuilds["Fortresses"]);
                        }
                        
                        if(finishedBuilds.length > 0){
                            let numUnitsTrained = trainUnit(name, scope.buildOrder[0][3], false);//Tries to train them
                            scope.buildOrder[0][3] == undefined ? scope.buildOrder[0][3] = numUnitsTrained : scope.buildOrder[0][3] += numUnitsTrained;
                            
                            if(scope.buildOrder[0][3] >= scope.buildOrder[0][1]){
                                suceeded = true;
                            }
                        }else if(scope.getBuildings({type: scope.unitProducedAtTypeName[name], player: me}).length == 0 && scope.getUnits({type: "Worker", player: me, order: "Build " + scope.unitProducedAtTypeName[name]}).length == 0 && scope.getUnits({type: "Worker", player: me, order: "Repair"}).length == 0){
                            scope.buildOrderFailedCount++;
                            if(scope.buildOrderFailedCount >= 10){
                                
                                consoleLog("WE DO NOT HAVE THE CAPACITY TO BUILD THE UNIT " + name + "!!!");
                                consoleLog("SWITCHING BUILD ORDER OFF.");
                                consoleLog("Unit produced at: " + scope.unitProducedAtTypeName[name]);
                                allWorkers.forEach(w => consoleLog(w.getCurrentOrderName()));
                                scope.buildOrder = [];
                                scope.usingBuildOrder = false;
                                scope.maxWorkersOnBase = Randomizer.nextInt(7, 9);
                                return;
                            }
                        }else{
                            suceeded = false;
                        }
                        
                        if(suceeded == true && scope.buildOrder[0][2] != undefined){
                            let isValid = false;
                            if(scope.buildOrder[0][2].atkAfterProduction == true){
                                isValid = true;
                                let delay = (scope.getTypeFieldValue(id_name, "buildTime") / 20) + 2;
                                scope.atkTimes.push(time + delay);
                            }
                            
                            if(!isValid){
                                throw new TypeError("The additional options specified (" + JSON.stringify(scope.buildOrder[0]) + ") do not contain valid build order options.");
                            }
                        }
                    }else{
                        throw new TypeError("Name " + name + " in the build order is not a valid name. Did you forget to capitalize the first letter? Check to make sure the name is in scope.buildPrio, scope.unitPrio, and/or scope.unitProducedAt.");
                    }
    
                    if(suceeded){
                        if(scope.buildOrder[0][3] >= scope.buildOrder[0][1]){
                            scope.buildOrder.splice(0, 1);
                            if(scope.buildOrder[0] != undefined){
                                consoleLog("We succeeded in building a " + name +". Next: " + scope.buildOrder[0][0]);
                            }
                            
                        }//If there are no more remaining
                    }
                }
            }
        }else{
            scope.usingBuildOrder = false;
            scope.maxWorkersOnBase = Randomizer.nextInt(7, 9);
        }
    }
    
    /**
     * Revises the priority of buildings to be built
     */
    static reviseBuildPrio(){
        const subPrio = scope.subMetaPrios;

        let prios = [];
        for(let key in scope.buildPrio){
            if(scope.buildPrio[key] > 0){
                prios.push(key);
            }
        }
        //scope.chatMsg(getMyColor() + "'s build prios: " + JSON.stringify(prios));
        
        if(gold >= 100){
            let checkHouses = true;
            
            /*
            if(getNumBuildingAndWorkersBuilding("House", false) != getNumBuildingAndWorkersBuilding("House", true)){
                checkHouses = false;
            }*/
            
            if(checkHouses === false && gold > 200 && supplyDiff <= 3){
                checkHouses = true;
            }

            if(myBuilds["Houses"].length === 1 && myBuilds.combatUnitProducers.length < 1){
                checkHouses = false;
            }//Prevents a double house opening

            if(maxSupply == 150){
                checkHouses = false;
            }//If we're at max supply
            
            let supplyNeeded = myBuilds.combatUnitProducers.length * (scope.baseMeta == "Beast" || scope.baseMeta == "Barracks") ? 2.5 : 3.5;
            let projSupply = (scope.getBuildings({type: "House", player: me}).length + scope.getBuildings({type: "Castle", player: me, onlyFinshed: true}).length + scope.getBuildings({type: "Fortress", player: me}).length + scope.getUnits({type: "Worker", order: "Build House", player: me}).length) * 10;
            projSupply += scope.getBuildings({type: "Castle", player: me}).filter(c => c.getValue("buildTicksLeft") > 1 && c.getValue("buildTicksLeft") < 30 * 20).length
            if(projSupply - supply > supplyNeeded){
                checkHouses = false;
            }
            
            if(checkHouses === true){
                scope.buildPrio["House"] = Math.max(supplyNeeded - supplyDiff, 0) / 4;
                if((myBuilds.combatUnitProducers.length == 0 && myBuilds["Houses"].length < 1) || supplyDiff <= 0){
                    scope.buildPrio["House"] = Math.max(1, scope.buildPrio["House"]);
                }
            }else{
                scope.buildPrio["House"] = 0;
            }
        }else{
            scope.buildPrio["House"] = 0;
        }
        
        let checkCombatUnitProducers = true;
        let noProductionBuildings = 0;
        for(let i = 0; i < myBuilds.combatUnitProducers.length; i++){
            let building = myBuilds.combatUnitProducers[i];
            if(typeof building != "object"){
                throw new TypeError("building " + JSON.stringify(building) + " is not a valid combat unit producer.")
            }else{
                const unitName = building.getUnitTypeNameInProductionQueAt(1);
                if(unitName == null || building.getRemainingBuildTime() == scope.getTypeFieldValue(unitName.toLowerCase().replace(" ", ""), "buildTimeInSec")){
                    if(building.getTypeName() != "Advanced Workshop"){
                        //Advanced workshops are special. They only produce things in spurts, so don't count them.
                        noProductionBuildings++;
                    }
                }
            }
        }//If the current combat unit producers don't have enough
        //gold for full production or they are supply blocked,
        //don't produce more combat unit producers (barracks, 
        //dens, etc) that won't be used. Makes an exception for
        //buildings under construction.
        
        if(noProductionBuildings > 1){
            checkCombatUnitProducers = false;
        }
        
        if(scope.startUnminedMines.length > 0){
            if(combatUnitProducerToCastleRatio >= scope.maxCombatUnitProducerToCastleRatio){
                checkCombatUnitProducers = false;
            }
            if(myBuilds.combatUnitProducers > scope.unitProducerCap){
                checkCombatUnitProducers = false;
            }
            
            let avgCost = 0;
            scope.subMetaPrios["Units"].forEach(u => avgCost += scope.getTypeFieldValue(u.toLowerCase(), "cost"));
            avgCost /= scope.subMetaPrios["Units"].length;
            
            if((myBuilds["combatUnitProducers"] + 1) * avgCost > (avgCost < 70 ? scope.income / 2 : scope.income * 2/3) && (myBuilds["combatUnitProducers"] + 1) * avgCost > scope.getGold()){
                checkCombatUnitProducers = false;
            }//If we don't have enough income to at least build one round of units every 30-40 seconds, don't build more stuff thata we can't use
            
        }//Basically the cap of how many combat unit producers the bot can have
        //per castle(combat unit producers = barracks, wolves dens, workshops, 
        //etc.). Doesn't apply to maps that don't have any viable expansions.
        
        if(checkCombatUnitProducers === true){
            if(scope.meta.includes("Barracks")){
                let barracksPrio = 0;
                if(subPrio["Buildings"].includes("Barracks") === true){
                    if(myBuilds.Houses.length > 0 && gold > 125){
                        if(supplyDiff > 6){
                            barracksPrio = 1;
                        }else if(supplyDiff > 3){
                            barracksPrio = 0.5;
                        }
                    }
                }
                scope.buildPrio["Barracks"] = barracksPrio;

                let churchPrio = 0;
                if(subPrio["Buildings"].includes("Church") === true){
                    if(myBuilds.Houses.length > 0 && gold > 200){
                        if(supplyDiff > 6){
                            churchPrio = 0.8;
                        }else if(supplyDiff > 3){
                            churchPrio = 0.4;
                        }
                    }
                }
                scope.buildPrio["Church"] = churchPrio;
            }else if(scope.meta.includes("Beast")){
                //Wolves dens
                let wolvesDenPrio = 0;
                //if(subMeta === "WolfSnakeSpam" || subMeta === "WolfSnakeAndWerewolf" || subMeta === "WolfSnakeAndDragon" || subMeta === "WolfSpam"){
                if(subPrio["Buildings"].includes("Wolves Den") === true && myBuilds.Houses.length > 0 && gold > 100){
                    if(scope.getCurrentSupply() < scope.getMaxSupply() - 6){
                        wolvesDenPrio = 1;
                    }else if(scope.getCurrentSupply() < scope.getMaxSupply() - 3){
                        wolvesDenPrio = 0.5
                    }
                }
                scope.buildPrio["Wolves Den"] = wolvesDenPrio;
                
                //Snake charmer
                let charmerPrio = 0;
                //if(subMeta === "WolfSnakeSpam" || subMeta === "WolfSnakeAndWerewolf" || subMeta === "WolfSnakeAndDragon"){
                if(subPrio["Buildings"].includes("Snake Charmer") === true && subPrio["Buildings"].includes("Snake Charmer") === true){
                    if(myBuilds["Snake Charmers"].length <= 0 && myBuilds["Wolves Dens"].length > 2 && gold > 100){
                        charmerPrio = 1;
                    }else{
                        charmerPrio = 0;
                    }
                }
                scope.buildPrio["Snake Charmer"] = charmerPrio;
                
                
                //Dragon's lair
                let lairPrio = 0;
                //if(subMeta === "WolfSnakeAndDragon" || subMeta === "DragonSpamRush"){
                if(subPrio["Buildings"].includes("Dragons Lair") === true){
                    if(myBuilds["Fortresses"].length > 0 && gold >= 125){
                        if(supplyDiff > 6){
                            lairPrio = 1;
                        }else if(supplyDiff > 3){
                            lairPrio = 0.5;
                        }else{
                            lairPrio = 0.1;
                        }
                    }
                }
                scope.buildPrio["Dragons Lair"] = lairPrio;
            }else if(scope.meta.includes("Mechanical")){
                let workshopPrio = 0;
                if(subPrio["Buildings"].includes("Workshop") === true){
                    if(myBuilds["Houses"].length > 0 && gold > 125){
                        if(supplyDiff > 6){
                            workshopPrio = 1;
                        }else if(supplyDiff > 3){
                            workshopPrio = 0.5;
                        }

                        if(myBuilds["CastleAndFortresses"].length == 1 && myBuilds["Workshops"].length == 1 && scope.startUnminedMines.length > 0){
                            workshopPrio = 0;
                        }
                        
                        if(supplyDiff > 3 && myBuilds["Workshop"].length == 0 && myBuilds["CastleAndFortresses"].length > 3){
                            workshopPrio += 0.5;
                        }
                    }
                }
                scope.buildPrio["Workshop"] = workshopPrio;

                let millPrio = 0;
                if(subPrio["Buildings"].includes("Mill") === true && myBuilds["Workshops"].length > 0){
                    if(myBuilds.Houses.length > 0 && gold > 140){
                        if(supplyDiff > 5){
                            millPrio = 1;
                        }else if(supplyDiff > 2){
                            millPrio = 0.5;
                        }
                    }
                }
                scope.buildPrio["Mill"] = millPrio;
            }
            
            //Workshops
            if(subPrio["Buildings"].includes("Workshop") === true){
                scope.buildPrio["Workshop"] = 1;
            }else{
                scope.buildPrio["Workshop"] = 0;
            }
            
            //Advanced workshops
            if(subPrio["Buildings"].includes("Advanced Workshop") === true && (myBuilds["Advanced Workshops"].length < 1 || scope.significantAirThreat == true) && myBuilds["combatUnitProducers"].length > 1 && (myBuilds["combatUnitProducers"].length > 2 || scope.significantAirThreat == true)){
                scope.buildPrio["Advanced Workshop"] = 1;
            }else{
                scope.buildPrio["Advanced Workshop"] = 0;
            }

            if(myBuilds["Watchtowers"].length < myBuilds["CastleAndFortresses"].length && gold > 130 && (myBuilds["CastleAndFortresses"].length >= 2 || scope.significantAirThreat == true) && scope.myPower > 6){
                scope.buildPrio["Watchtower"] = 1;
            }else{
                scope.buildPrio["Watchtower"] = 0;
            }
            
            scope.onlyProduceOneOfThese.forEach(function(build){
                if(build == undefined){
                    throw new TypeError("scope.onlyProduceOneOfThese: Invalid production building: " + producedAt)
                }else if(scope.getBuildings({type: build, player: me}).length > 0){
                    scope.buildPrio[build] = 0;
                }else{
                    scope.buildPrio[build] = 1;
                }
            });
        }else{
            subPrio["Buildings"].forEach(key => {
                scope.buildPrio[key] = 0;
            });//Nothing is prioritized, so set everything to 0
        }

        //Mages guild
        let guildPrio = 0;
        if(subPrio["Buildings"].includes("Mages Guild") === true && myBuilds["Mages Guilds"].length < 1){
            if(myBuilds["Barracks"].length > 1 && gold > 100){
                guildPrio = 1;
            }
        }
        scope.buildPrio["Mages Guild"] = guildPrio;

        const subPrioUpg = scope.subMetaPrios["Upgrades"];
        //Forge building
        if(subPrioUpg.includes("Forge") === true){
            if(scope.myPower > 13 && myBuilds["Forges"].length <= 1 && (myBuilds["CastleAndFortresses"].length > 2 || (scope.startUnminedMines.length <= 0 && myBuilds["CastleAndFortresses"].length > 0))){
                scope.buildPrio["Forge"] = 1;
            }else{
                scope.buildPrio["Forge"] = 0;
            }
        }else{
            scope.buildPrio["Forge"] = 0;
        }

        if(subPrioUpg.includes("Armory") == true){
            if(scope.myPower > 13 && myBuilds["Armories"].length == 0 && (myBuilds["CastleAndFortresses"].length > 2 || (scope.startUnminedMines.length <= 0 && myBuilds["CastleAndFortresses"].length > 0))){
                scope.buildPrio["Armory"] = 1;
            }else{
                scope.buildPrio["Armory"] = 0;
            }
        }else{
            scope.buildPrio["Armory"] = 0;
        }

        //Animal testing labs
        if(subPrioUpg.includes("Animal Testing Lab") === true){
            if(scope.myPower > 13 && myBuilds["Animal Testing Labs"].length < 1 && (myBuilds["CastleAndFortresses"].length > 2 || (scope.startUnminedMines.length <= 0 && myBuilds["CastleAndFortresses"].length > 0))){
                scope.buildPrio["Animal Testing Lab"] = 1;
            }else{
                scope.buildPrio["Animal Testing Lab"] = 0;
            } 
        }else{
            scope.buildPrio["Animal Testing Lab"] = 0;
        } 

        //Priority build
        if(scope.priorityBuild != null){
            for(let key in scope.buildPrio){
                scope.buildPrio[key] = 0;
            }
            for(let key in scope.unitPrio){
                scope.unitPrio[key] = 0;
            }
            if(gold >= scope.getTypeFieldValue(scope.priorityBuild.toLowerCase().replace(" ", ""), "cost")){
                scope.buildPrio[scope.priorityBuild] = 10;
                Us.build(scope.priorityBuild);
                scope.priorityBuild = null;
            }
        }
    }
    
    /**
    * If the bot should attack. Checks if the bot has more than twice the
     * number of units of the bot's combat unit producers if the meta is
     * barracks or if the submeta is DragonSpamRush, while if the meta is beast and 
     * not DragonSpamRush, the minimum amount of units is the number of combat
     * unit producers times 3.
     * 
     * Also checks if the bot has enough power to eliminnate the maximum force encountered,
     * or if it has more than 10 power (enough power for at least a runby).
     * 
     * @returns {boolean} - if the bot has met the attack criteria.
     */
    static shouldAttack(){
        if(scope.hasProxied && myBuilds.combatUnitProducers.length == 1){
            return true;
        }

        //If our allies are launching an attack
        if(scope.numAllies > 0){
            let angryAllies = scope.getUnits({notOfType: "Worker", team: myTeam, order: "AMove"}).filter(u => u.getOwnerNumber() != me);
            if(angryAllies.length > 2 && scope.underAttack == false){
                return true;
            }
        }
        if(fightingUnits.length <= 0 || Math.min(scope.maxEnPowerEncountered, 10) > scope.myPower || scope.usingBuildOrder == true){
            return false;
        }
        if(scope.numEnemies > 1 && scope.numAllies == 0 && scope.myPower <= 20){
            //If we're in an ffa, act very cautiously.
            return false;
        }

        let threshold = 2;
        if(scope.attackThreshold != undefined){
            threshold = scope.attackThreshold;
        }

        //If we have too much population or meet the attack threshold or proxied
        if((fightingUnits.length >= myBuilds.combatUnitProducers.length * threshold && scope.underAttack === false) || 
        supplyDiff <= 3 || 
        (fightingUnits.length > 1 && scope.proxied === true && time < 300)){
            return true;
        }else{
            return false;
        }
    }
    
    /**
     * Do I really need to comment on this?
     */
    static attack(){
        scope.justAttacked = true;
        Army.planAndAttack();
    }
    
    /**
     * Gets a random attack location. If the bot has not encountered any enemy
     * buildings, it will default to start location. Because some maps are
     * weird, sometimes scope.getStartLocation() will return undefined. The
     * function will return a random mine's x and y in that case.
     * 
     * @returns {object} - The x and y coordinates of the random attack location.
     */
    static getRandAttackLoc(){
        let location;
        
        if(enemyBuildings.length <= 0){
            let player = getRandomEnemyNr();
            location = scope.getStartLocationForPlayerNumber(player);
            //If we don't have the location of their buildings, go for their main base
        }else{
            //If we do have the location of their buildings, pick one of those.
            let randBuilding = enemyBuildings[Randomizer.nextInt(0, enemyBuildings.length - 1)];
            location = {x: randBuilding.getX(), y: randBuilding.getY()}
        }

        if(location == undefined){
            //Sometimes, the map is weird and getStartLocationForPlayerNumber() returns undefined. 
            //If that happens, the attack will go to a random mine with less than full gold (someone's mining there).
            let mines = [];
            scope.getBuildings().forEach(build => build.getTypeName() == "Goldmine" && mines.push(build));
                        
            if(mines.length > 0){
                let possibles = [];
                mines.forEach(mine => {
                    if(mine.getValue('gold') < 6000){
                        let good = true;
                        for(let ii = 0; ii < alliedBuilds.length; ii++){
                            if(distanceFormula(mine.getX(), mine.getY(), alliedBuilds[ii].getX(), alliedBuilds[ii].getY()) < 10){
                                good = false;
                                ii = alliedBuilds.length + 1;
                            }
                        }
                        if(good == true){
                            possibles.push(mine);
                        }
                    }
                });
                let mine = possibles[Randomizer.nextInt(0, possibles.length - 1)];
                if(mines.length > 0){
                    location = {x: mine.getX(), y: mine.getY()};
                }
            }
        }else if(Randomizer.nextBoolean(0.33)){
            //Look for mined mines (aka another base) and move there
            let possibles = [];
            let mines = scope.getBuildings({type: "Goldmine"});
            let friendlies = scope.getBuildings({type: "Castle", team: myTeam}).concat(scope.getBuildings({type: "Fortress", team: myTeam}));
            for(let i = mines.length - 1; i > -1; i--){
                let x = mines[i].getX();
                let y = mines[i].getY();
                for(let ii = 0; ii < friendlies.length; ii++){
                    if(distanceFormula(x, y, friendlies[ii].getX(), friendlies[ii].getY()) < 10){
                        mines.splice(i, 1);
                        ii = friendlies.length + 1;
                    }
                }
            }
            mines.forEach(mine => mine.getValue('gold') < 6000 ? possibles.push(mine) : null);
            let mine = possibles[Randomizer.nextInt(0, possibles.length - 1)];
            if(mine != undefined){
                location = {x: mine.getX(), y: mine.getY()};
            }
        }
        
        return location;
    }
    
    /**
     * Dispatches a scout to scout a series of random non-enemy occupied gold mines.
     * 
     * Will not execute if no unit is passed and there is already a scouting army.
     * 
     * @param {unit} unit - optional. A unit that will do the scouting.
     */
    static scout(unit){
        if(unit == undefined && Object.values(scope.allArmiesByID).some(a => a.mission == "scout") == true){
            return;
        }
        if(scope.garrison.unitArr.length > 0 && scope.myPower > 5){
            let mines = getMinesWithGold();
            
            for(let i = mines.length - 1; i > -1; i--){
                isEnemyAroundBuilding(mines[i]) && mines.splice(i, 1);
            }
            scope.garrison.clean();
            let garrisionUnits = scope.garrison.unitArr;
            if(mines.length <= 0 || garrisionUnits.length <= 0){
                return;
            }

            let stop = Randomizer.nextInt(6, 9);

            if(unit == undefined){
                let SENTINEL = 0;
                while(true){
                    SENTINEL++;
                    if(SENTINEL > 50){
                        break;
                    }
                    unit = garrisionUnits[Randomizer.nextInt(0, garrisionUnits.length - 1)];
                    if(unit.getCurrentHP() == unit.getFieldValue("hp")){
                        break;
                    }
                }
                if(unit == undefined){
                    return;
                }
                delete scope.garrison.unitsByID[unit.getUnitID()];
                scope.garrison.clean();
            }
            
            for(let i = 0; i < stop; i++){
                let mine = mines[Randomizer.nextInt(0, mines.length - 1)];
                
                let location = {"x": mine.getX(), "y": mine.getY()};
                if(unit != undefined){
                    if(i === 0){
                        scope.order("AMove", [unit], location);
                    }else{
                        scope.order("AMove", [unit], location, true);
                    }
                }
            }
            
            if(unit != undefined){
                let army = new Army([unit]);
                army.mission = "scout";
                army.canBeCombinedInto = false;
                army.canCombineInto = false;
            }
        }
    }
    
    /**
     * Looks for incursions (<10 squares to a building) and dispatchs a equal
     * force of units to intercept.
     */
    static defend(){
        let underAttack = false;
        let attackingFightingUnits = [];
        
        let possibleChecks = myBuilds["allBuilds"].concat(alliedBuilds);
        let needsToShootUp = false;
        
        for(let i = 0; i < enemyUnits.length; i++){
            let enemy = enemyUnits[i];
            for(let ii = 0; ii < possibleChecks.length; ii++){
                let build = possibleChecks[ii];
                if(distanceFormula(build.getX() + 1.5, build.getY() + 1.5, enemy.getX(), enemy.getY()) < 11){
                    if(myBuilds["CastleAndFortresses"].length > 1 || distanceFormula(build.getX() + 1.5, build.getY() + 1.5, myBuilds["CastleAndFortresses"][0].getX(), myBuilds["CastleAndFortresses"][0].getY()) < 35){
                        underAttack = true;
                        attackingFightingUnits.push(enemy);
                        if(enemy.getFieldValue("flying")){
                            needsToShootUp = true;
                        }
                    }
                }
            }
        }
        
        //attackingFightingUnits = enemyFightingUnits;

        if(underAttack === true){
            scope.underAttack = true;
            
            if(attackingFightingUnits == undefined){
                consoleLog("attackingFightingUnits is undefined!");
            }else{
                let center;
                if(attackingFightingUnits.length > 4 || attackingFightingUnits.length == 0){
                    center = scope.getCenterOfUnits(attackingFightingUnits);
                }else{
                    let closest = getClosestTo(attackingFightingUnits, {x: myBuilds["CastleAndFortresses"][0].getX(), y: myBuilds["CastleAndFortresses"][0].getY()});
                    center = {x: closest.getX(), y: closest.getY()};
                }
                
                //Reduces the attack loacations to the nearest 10x10 block
                scope.attackedAtLocations.push({
                    x: Math.floor(center.x) - Math.floor(center.x) % 10,
                    y: Math.floor(center.y) - Math.floor(center.y) % 10
                });
                
                //If we have too many attacked locations stored, delete some
                if(scope.attackedAtLocations.length > 25){
                    scope.attackedAtLocations.splice(0, 1);
                }
                
                let enPower = 0;
                
                for(let i = 0; i < attackingFightingUnits.length; i++){
                    const pow = scope.getPowerOf(attackingFightingUnits[i]);
                    if(pow != undefined){
                        enPower += pow;
                    }
                }
                
                if(scope.garrison == undefined){
                    return;
                }
                
                const garrison = scope.garrison.unitArr;
                let gl = garrison.length;
                let responsePower = scope.garrison.power;
                let enoughPower = scope.garrison.power > enPower * 1.33 ? true : false;
                let responseUnits = [];
                
                for(let i = 0; i < gl; i++){
                    let unit = garrison[i];
                    let power = scope.getPowerOf(unit);
                    if(power != undefined && (needsToShootUp == false || unit.getFieldValue("canAttackFlying") == true)){
                        responsePower += power;
                        responseUnits.push(unit);
                        delete scope.garrison.unitsByID[unit.getUnitID()];
                    }
                    if(responsePower > enPower){
                        enoughPower = true;
                        break;
                    }
                }//Draws units from the garrison first
                scope.garrison.clean();

                if(enoughPower == false){
                    let overdrawUnits = [];
                    for(let id in scope.allArmiesByID){
                        let army = scope.allArmiesByID[id];
                        let armyUnits = army.unitArr;
                        if(army.mission != "defend" && army.mission != "permadefend" && army.mission != "airshipStuff"){
                            for(let i = 0; i < armyUnits.length; i++){
                                let unit = armyUnits[i];
                                let power = scope.getPowerOf(unit);
                                if(power != undefined && (needsToShootUp == false || unit.getFieldValue("canAttackFlying") == true)){
                                    responsePower += power;
                                    responseUnits.push(unit);
                                    overdrawUnits.push(unit);
                                    delete army.unitsByID[unit.getUnitID()];
                                }
                                if(responsePower > enPower){
                                    enoughPower = true;
                                    break;
                                }
                            }
                            army.clean();
                        }
                    }

                    if(enoughPower == false && scope.airshipSquad.unitArr.length > 0){
                        let airships = [];
                        scope.airshipSquad.unitArr.forEach( u => u.getTypeName() == "Airship" && airships.push(u));
                        scope.order("Move", airships, center);
                    }
                    scope.order("Move", overdrawUnits, center);
                }//Draw units from other armies next
                
                scope.defenseArmy.addUnits(responseUnits);
                scope.defenseArmy.attack(center);
                scope.defenseArmy.mission = "defend";
                
                //If we are totally outmatched, throw in the towel and quit.
                if(((scope.alliedPower + (allWorkers.length / 0.25)) * 2 < enPower) || myBuilds["CastleAndFortresses"].length == 0){
                    let possibles = ["GG", "GG", "GG", "GG", "GG", "GG", "Drat!", ":(", "Nutfudder", "gg", "Frick", "Frack", "Bye", "Good game",
                    "Nice one"];
                    scope.chatMsg(possibles[Randomizer.nextInt(0, possibles.length - 1)]);
                    scope.leaveGame();
                    scope.shouldUpdate = false;
                }
            }
            scope.defenseArmy != undefined ? scope.defenseArmy.canCombineInto = false : null;
        }else{
            scope.garrison?.addUnits(scope.defenseArmy.removeUnits(Infinity));
            scope.underAttack = false;
            scope.defenseArmy != undefined ? scope.defenseArmy.canCombineInto = true : null;
        }
        scope.attackingFightingUnits = attackingFightingUnits;//To use less CPU resources on variable lookups,
        //attackingFightingUnits is local until the end.
    }
    
    /**
     * Revises the priority of units to be trained in a stupidly large logic tree.
     * DOES NOT HAVE ALL UNITS IN IT!!!! IF YOU ADD A NEW META, YOU WILL NEED
     * TO UPDATE THIS!!!
     */
    static reviseUnitPrio(){
        let prios = [];
        for(let key in scope.unitPrio){
            if(scope.unitPrio[key] > 0){
                prios.push(key);
            }
        }
        //scope.chatMsg(getMyColor() + "'s unit prios: " + JSON.stringify(prios));

        /*
        if(supplyDiff <= 3){
            for(let key in scope.unitPrio){
                scope.unitPrio[key] = 0;
            }
            if(myBuilds["CastleAndFortresses"].length === 1 && allWorkers.length <= 8){
                scope.unitPrio["Worker"] = 1;
            }
            return;
        }//If we have too little supply, don't train more units
        */

        let noProductionBuildings = 0;
        for(let i = 0; i < myBuilds.combatUnitProducers.length; i++){
            let building = myBuilds.combatUnitProducers[i];
            if(typeof building != "object"){
                throw new TypeError("building " + JSON.stringify(building) + " is not a valid combat unit producer.")
            }else{
                const unitName = building.getUnitTypeNameInProductionQueAt(1);
                if(building.isUnderConstruction() == false && unitName == null){
                    if(building.getTypeName() != "Advanced Workshop"){
                        //Advanced workshops are special. They only produce things in spurts, so don't count them.
                        noProductionBuildings++;
                    }
                }
            }
        }
        const subPrio = scope.subMetaPrios;
        
        //The bot can have one non-production building per three combat unit producers.
        if(noProductionBuildings <= Math.max(0, Math.floor(myBuilds.combatUnitProducers.length / 3))){
            if(workerToCastleRatio < 5){//If there are less than 5 workers per castle, give insane priority to workers.
                scope.unitPrio["Worker"] = 2;
            }else if(workerToCastleRatio >= 5 && workerToCastleRatio <= scope.maxWorkersOnBase){//If there are more than 5 workers but less than 7 workers, give moderate priority to workers.
                scope.unitPrio["Worker"] = 0.9;
            }else{//If there are too many workers, give priority to other units.
                scope.unitPrio["Worker"] = 0;
            }
        }

        if(scope.startUnminedMines.length <= 0){//If it's on diag
            scope.unitPrio["Worker"] = 1;
        }
        
        //Barracks produced units
        if(myBuilds["Barracks"].length > 0){
            //Soldier
            if(subPrio["Units"].includes("Soldier") === true){
                scope.unitPrio["Soldier"] = 0.75;
            }else{
                scope.unitPrio["Soldier"] = 0;
            }

            //Archer
            if(subPrio["Units"].includes("Archer") === true){
                if(scope.significantAirThreat === false){
                    scope.unitPrio["Archer"] = 1;
                }else{
                    scope.unitPrio["Archer"] = 1.25;
                }
            }else{
                scope.unitPrio["Archer"] = 0;
            }

            //Mages
            if(scope.getBuildings({type: "Mages Guild", player: me, onlyFinshed: true}).length > 0){
                if(subPrio["Units"].includes("Mage") === true){
                    scope.unitPrio["Mage"] = 0.9;
                }else{
                    scope.unitPrio["Mage"] = 0;
                }
            }

            //Raiders
            if(subPrio["Units"].includes("Raider") === true){
                scope.unitPrio["Raider"] = 0.15;
            }
        }else{
            scope.unitPrio["Soldier"] = 0;
            scope.unitPrio["Archer"] = 0;
            scope.unitPrio["Mage"] = 0;
            scope.unitPrio["Raider"] = 0;
        }

        //Priests
        if(myBuilds["Churches"].length > 0){
            if(subPrio["Units"].includes("Priest") === true){
                scope.unitPrio["Priest"] = 1;
            }else{
                scope.unitPrio["Priest"] = 0;
            }
        }
        //Wolves
        if(subPrio["Units"].includes("Wolf") === true && myBuilds["Wolves Dens"].length > 0){
            scope.unitPrio["Wolf"] = 1;
            
            if(subPrio["Units"].includes("Snake") === true && myBuilds["Snake Charmers"].length > 0 && myUnits["Wolf"] != undefined && myUnits["Wolf"].length >= myBuilds["Wolves Dens"].length){
                if(scope.significantAirThreat === false){
                    scope.unitPrio["Snake"] = 0.5;
                }else{
                    scope.unitPrio["Snake"] = 1.25;
                }
            }else{
                scope.unitPrio["Snake"] = 0;
            }
        }else{
            scope.unitPrio["Wolf"] = 0;
        }
        
        //Werewolves
        if(subPrio["Units"].includes("Werewolf") === true && myBuilds["Werewolves Dens"].length > 0){
            scope.unitPrio["Werewolf"] = 1;
        }else{
            scope.unitPrio["Werewolf"] = 0;
        }
        
        //Dragons
        if(subPrio["Units"].includes("Dragon") === true && myBuilds["Dragon Lairs"].length > 0){
            scope.unitPrio["Dragon"] = 1;
        }else{
            scope.unitPrio["Dragon"] = 0;
        }
        //Catapults
        if(subPrio["Units"].includes("Catapult") === true && myBuilds["Workshops"].length > 0){
            scope.unitPrio["Catapult"] = 1;
        }else{
            scope.unitPrio["Catapult"] = 0;
        }
        
        //Gatling guns
        if(subPrio["Units"].includes("Gatling Gun") === true && myBuilds["Workshops"].length > 0){
            scope.unitPrio["Gatling Gun"] = 1;
        }else{
            scope.unitPrio["Gatling Gun"] = 0;
        }

        //Gyrocraft
        if(subPrio["Units"].includes("Gyrocraft") === true && myBuilds["Mills"].length > 0){
            scope.unitPrio["Gyrocraft"] = 1;
        }else{
            scope.unitPrio["Gyrocraft"] = 0;
        }

        //Ballistae
        if(subPrio["Units"].includes("Ballista") === true && myBuilds["Advanced Workshops"].length > 0 && (myUnits["Ballista"] == undefined || myUnits["Ballista"].length <= 2) && supplyDiff >= 4){
            if(scope.significantAirThreat === false){
                scope.unitPrio["Ballista"] = 1;
            }else{
                scope.unitPrio["Ballista"] = 2;
            }                                               
        }else{
            scope.unitPrio["Ballista"] = 0;
        }

        //Birds
        if(subPrio["Units"].includes("Bird") === true && (myUnits["Bird"] === undefined || myUnits["Bird"].length < 2)){//If there are no birds or if the length of birds is less than 2
            scope.unitPrio["Bird"] = 0.5;
        }else{
            scope.unitPrio["Bird"] = 0;
        }
        
        //Airships
        if(subPrio["Units"].includes("Airship") === true && myBuilds["Advanced Workshops"].length > 0 && scope.myPower > 8 && (myUnits["Airship"] == undefined || myUnits["Airship"].length < 2) && gold >= 100 && supplyDiff > 2){
            scope.unitPrio["Airship"] = 1;
        }else{
            scope.unitPrio["Airship"] = 0;
        }
        
        scope.dontProduceFromThese.forEach(function(value){
            for(let key in scope.unitProducedAt){
                if(scope.unitProducedAt[key] === value){
                    scope.unitPrio[key] = 0;
                }
            }
        });
    }
    
    /**
     * Runs through a random list of buildings, finds the damaged ones, and
     * dispatches a worker to repair the building provided that there are no
     * enemy units around the building and we haven't exceeded the maximum number
     * of building repairers.
     */
    static repair(){
        let numMechRepairers = 0;
        if(scope.meta.includes("Mechanical")){
            scope.mechRepairSquad.forEach(function(worker){
                if(worker.getCurrentOrderName() == "Repair"){
                    numMechRepairers++;
                }
            });//Not a perfet system
        }  

        let numConstructions = 0;
        myBuilds.allBuilds.forEach(function(build){
            if(build.isUnderConstruction()){
                numConstructions++;
            }
        });
        if(repairingWorkers.length - numMechRepairers - numConstructions < scope.maxBuildingRepairers){
            for(let i = 0; i < myBuilds.allBuilds.length / 2; i++){
                let building = myBuilds.allBuilds[Randomizer.nextInt(0, myBuilds.allBuilds.length - 1)];
                let isUnderConstruction = building.isUnderConstruction();
                
                //basiscally if the building needs repairing.
                if(((building.getValue("hp") < building.getFieldValue("hp") * 0.7) || (building.getTypeName() == "Watchtower" && building.getValue("hp") < building.getFieldValue("hp"))) && isUnderConstruction === false){
                    let doRepair = true;
                    
                    for(let ii = 0; ii < repairingWorkers.length; ii++){
                        let worker = repairingWorkers[ii];
                        
                        if(distanceFormula(worker.getX(), worker.getY(), building.getX(), building.getY()) <= 5){
                            doRepair = false;
                            ii = repairingWorkers.length;
                        }
                    }//Checks to make sure there are no units already repairing the building,
                    
                    if(doRepair === true){
                        //Will repair watchtowers no matter what, but other buildings will check to make sure 
                        //there are no enemies around
                        if((isEnemyAroundBuilding(building) === false || building.getTypeName() === "Watchtower") && miningWorkers.length > 0){
                            let randWorker = miningWorkers[Randomizer.nextInt(0, miningWorkers.length - 1)];
                            scope.order("Repair", [randWorker], {unit: building});
                        }
                    }
                }else if(isUnderConstruction === true){
                    let workers = getNotMiningWorkers();
                    let size = scope.buildingSizes[building.getTypeName()];
                    let hasWorker = false;
                    let enemyAround = isEnemyAroundBuilding(building);
                    
                    if(enemyAround === false || building.getTypeName() === "Watchtower"){
                        for(let ii = 0; ii < workers.length; ii++){
                            let worker = workers[ii];
                            
                            if(Math.floor(distanceFormula(worker.getX(), worker.getY(), building.getX() + size[0] / 2, building.getY() + size[1] / 2)) <= size[0] + 2){
                                hasWorker = true;
                                ii = workers.length;
                            }
                        }
                        if(hasWorker === false){
                            if(miningWorkers.length > 0){
                                let randWorker = miningWorkers[Randomizer.nextInt(0, miningWorkers.length - 1)];
                                scope.order("Repair", [randWorker], {unit: building});
                            }
                        }
                    }
                }//If the building is under construction, look for non-mining 
                //workers near the building. If there are no non-mining workers
                //near the building, order a worker to repair
            }
        }
    }
    
    /**
     * Revises the upgrade priorities, such as revising the priority of castles
     * converting into fortresses
     */
    static reviseUpgradePrio(){
        const subPrio = scope.subMetaPrios;
        const subPrioUpg = subPrio["Upgrades"];
        
        //Upgrade werewolves den
        if(subPrioUpg.includes("Werewolf Den") === true){
            if(myBuilds["CastleAndFortresses"].length >= 2 && allWorkers.length > 14 && scope.underAttack === false && myBuilds["Wolves Dens"].length > 3 && myBuilds["Werewolves Dens"].length < 2){
                if(gold > 225){
                    let den = myBuilds["Wolves Dens"][Randomizer.nextInt(0, myBuilds["Wolves Dens"].length - 1)]
                    scope.order("Upgrade To Werewolves Den", [den]);
                }
            }
        }
        
        //Upgrade to fortress
        if(subPrioUpg.includes("Fortress") === true){
            if(scope.underAttack === false && myBuilds["Fortresses"].length <= 0){
                if(gold >= 100){
                    let castle = myBuilds["Castles"][0];
                    
                    if(castle != undefined){
                        scope.order("Upgrade To Fortress", [castle]);
                    }
                }
            }
        }
        
        //If we're going easy on them, there's no need for upgrades.
        if(DIFFICULTY < 1){
            return;
        }
        
        //Fireball research
        if(subPrioUpg.includes("Fireball") === true){
            if(scope.underAttack === false && (myBuilds["CastleAndFortresses"].length > 1 || scope.startUnminedMines.length <= 0) && myBuilds["Mages Guilds"].length > 0){
                if(gold >= 100){
                    let guild = myBuilds["Mages Guilds"][0];
                    
                    if(guild != undefined){
                        scope.fireballRearched = true;
                        scope.order("Research Fireball", [guild]);
                    }
                }
            }
        }
        
        //Invisibility research
        if(subPrioUpg.includes("Invisibility") === true){
            if(scope.underAttack === false && (myBuilds["CastleAndFortresses"].length > 1 || scope.startUnminedMines.length <= 0) && myBuilds["Churches"].length > 0){
                if(gold >= 100){
                    let church = myBuilds["Churches"][0];
                    
                    if(church != undefined){
                        scope.order("Research Invisibility", [church]);
                    }
                }
            }
        }
        
        //Ballista research
        if(myUnits["Ballista"] != undefined && gold >= 100 && myBuilds["Advanced Workshops"].length > 0){
            scope.order("Ballista Black Powder", [myBuilds["Advanced Workshops"][0]]);
        }

        //Bird Detection research
        if(subPrioUpg.includes("Bird Detection") === true){
            if((myBuilds["CastleAndFortresses"].length > 1 || (scope.startUnminedMines.length <= 0 && myBuilds["CastleAndFortresses"].length > 0))){
                if(gold >= 100){
                    let preferredCastle = null;
                    myBuilds["CastleAndFortresses"].forEach(function(castle){
                        if(castle.getUnitTypeNameInProductionQueAt(1) == null){
                            preferredCastle = castle;
                        }
                    });

                    if(preferredCastle == null){
                        preferredCastle = myBuilds["CastleAndFortresses"][0];
                    }

                    scope.order("Research Bird Detection", [preferredCastle]);
                }
            }
        }

        //Forge research
        if(subPrioUpg.includes("Forge") === true){
            if(scope.underAttack === false && myBuilds["Forges"].length > 0 && (myBuilds["CastleAndFortresses"].length > 1 || (scope.startUnminedMines.length <= 0 && myBuilds["CastleAndFortresses"].length > 0))){
                if(gold >= 150){
                    myBuilds["Forges"].forEach(function(forge){
                        if(forge.getUnitTypeNameInProductionQueAt(1) == undefined){
                            if(scope.meta.includes("Barracks")){
                                if(Randomizer.nextBoolean(0.7)){
                                    scope.order("Attack Upgrade", [forge]);
                                }else{
                                    scope.order("Armor Upgrade", [forge]);
                                }
                            }else if(scope.meta.includes("Mechanical")){
                                if(Randomizer.nextBoolean(0.6)){
                                    scope.order("Mech Attack Upgrade", [forge]);
                                }else{
                                    scope.order("Mech Armor Upgrade", [forge]);
                                }
                            }
                        }
                    });
                }
            }
        }

        //Lab research
        if(subPrioUpg.includes("Animal Testing Lab") === true){
            if(scope.underAttack === false && myBuilds["Animal Testing Labs"].length > 0 && (myBuilds["CastleAndFortresses"].length > 1 || (scope.startUnminedMines.length <= 0 && myBuilds["CastleAndFortresses"].length > 0))){
                if(gold >= 150){
                    myBuilds["Animal Testing Labs"].forEach(function(lab){
                        if(lab.getUnitTypeNameInProductionQueAt(1) == undefined){
                            if(Randomizer.nextBoolean(0.6)){
                                scope.order("Beast Attack Upgrade", [lab]);
                            }else{
                                scope.order("Beast Defense Upgrade", [lab]);
                            }
                        }
                    });
                }
            }
        }

        //Armory research
        if(subPrioUpg.includes("Armory") === true && myUnits["Archer"] != undefined && myUnits["Archer"].length > 7 && myBuilds["Armories"].length > 0){
            if(scope.underAttack === false && myBuilds["Armories"].length > 0 && (myBuilds["CastleAndFortresses"].length > 1 || (scope.startUnminedMines.length <= 0 && myBuilds["CastleAndFortresses"].length > 0))){
                if(gold >= 140){
                    scope.order("Research Archer Range", myBuilds["Armories"]);
                }
            }
        }
    }
    
    /**
     * Reassigns workers from filled up mining lines to new castles and increases the max amount of workers on mines depending on the situation
     */
    static assignWorkers(){
        if(scope.lastNumOfCastles < scope.getBuildings({type: "Castle", player: me, onlyFinshed: true}).concat(myBuilds["Fortresses"]).length){
            scope.lastNumOfCastles = myBuilds["CastleAndFortresses"].length;
            
            //castle's workers are supposed to be donated
            
            let castleWorkers = [];//Formatted like so: [[], [], []]. The inner sets of brackets are arrays of workers that are
            //assigned to that castle. The index of the inner arrays is also the index of the castle/fortress in myBuilds.
            for(let i = 0; i < myBuilds["CastleAndFortresses"].length; i++){
                castleWorkers.push([]);
            }

            let castleDonatePercent =  (allWorkers.length / castleWorkers.length) / allWorkers.length;
            
            for(let i = 0; i < miningWorkers.length; i++){
                let worker = miningWorkers[i];
                for(let ii = 0; ii < myBuilds["CastleAndFortresses"].length; ii++){
                    let curCastle = myBuilds["CastleAndFortresses"][ii];
                    if(distanceFormula(curCastle.getX() + 2, curCastle.getY() + 2, worker.getX(), worker.getY()) <= 10){
                        castleWorkers[ii].push(worker);
                        ii = myBuilds["CastleAndFortresses"].length;
                    }
                }
            }
            
            let moveThese = [];//workers that will be reassigned
            
            
            castleWorkers.sort(function(a, b){
                return a.length + b.length;
            });//Sorts the castles with the largest population from longest to shortest so
            //that the largest worker lines are drawn from first.

            let workersReassigned = 0;
            for(let i = 0; i < castleWorkers.length; i++){
                for(let ii = 0; ii < castleWorkers[i].length; ii++){
                    if(ii > Math.floor(castleWorkers[i].length * castleDonatePercent)){
                        ii = castleWorkers[i].length;
                    }else{
                        moveThese.push(castleWorkers[i][ii]);
                        workersReassigned++;
                    }

                    if(workersReassigned >= 10){
                        break;
                    }
                }
            }//Assigns workers
            
            let newCastle = myBuilds["CastleAndFortresses"][myBuilds["CastleAndFortresses"].length - 1];
            scope.order("Moveto", moveThese, {unit: newCastle});

            if(myBuilds["CastleAndFortresses"].length > 2 && scope.increasedMaxWorkers == false){
                scope.increasedMaxWorkers = true;
                scope.maxWorkersOnBase = Math.min(scope.maxWorkersOnBase + Randomizer.nextInt(1, 2), 10);
            }

            //let message = getMyColor() + ": Workers reassigned: " + workersReassigned + ", castleDonate percent: " + castleDonatePercent + "castleWorkers.length: " + castleWorkers.length + ", castleWorkers[0].length: " + castleWorkers[0].length + "First castle worker donation: " + Math.round(castleWorkers[0].length * castleDonatePercent);
            //scope.chatMsg(JSON.stringify(message));
        }
    }
    
    /**
     * Sends a worker to scout the enemy.
     */
    static workerScout(){
        if(scope.workerScout == undefined && miningWorkers.length > 0){
            let randWorker = miningWorkers[0];
            scope.workerScout = randWorker;
            let startLoc = scope.getStartLocationForPlayerNumber(getRandomEnemyNr());
            
            scope.order("AMove", [randWorker], startLoc);
        }else if(miningWorkers.length > 0 && scope.workerScout.getValue("hp") <= 0){
            scope.workerScout = undefined;
        }
    }
    
    /**
     * Prevents cheeses, Currently:
     *  -Early game worker scouting.
     *  -Catapults attacking dead buildings
     *  -Worker rushinig
     */
    
    static preventCheese(){
        let enemyWorkers = scope.getUnits({type: "Worker", enemyOf: me});
        if(enemyWorkers.length > 3 && fightingUnits.length <= 0 ){
            scope.order("AMove", allWorkers, scope.getCenterOfUnits(enemyWorkers));
        }else{
            if(enemyUnits.length > 0 && fightingUnits.length <= 0 && miningWorkers.length >= 2 && myBuilds["CastleAndFortresses"][0] != undefined){
                for(let i = 0; i < enemyWorkers.length; i++){
                    let enemyWorker = enemyWorkers[i];
                    let isNew = true;
                    for(let ii = 0; ii < scope.enemyWorkerScouts.length; ii++){
                        if(enemyWorker.equals(scope.enemyWorkerScouts[ii]) === true){
                            isNew = false;
                            ii = scope.enemyWorkerScouts.length;
                        }
                    }
                    if(isNew === true && enemyWorker != undefined && distanceFormula(enemyWorker.getX(), enemyWorker.getY(), myBuilds["CastleAndFortresses"][0].getX(), myBuilds["CastleAndFortresses"][0].getY()) < 25){
                        scope.enemyWorkerScouts.push(enemyWorker);
                        
                        scope.order("AMove", [getClosestTo(allWorkers, {x: enemyWorker.getX(), y: enemyWorker.getY()}), miningWorkers[1]], {x: enemyWorker.getX(), y: enemyWorker.getY()});
                    }
                }
            }//Counters worker scouts
        }
        
        let myAngryWorkers = scope.getUnits({type: "Worker", order: "AMove", player: me});
        //If we have any counter-worker scouts
        if(myAngryWorkers.length > 0){
            if(myBuilds["CastleAndFortresses"].length > 0 && scope.attackingFightingUnits != undefined){//If we still have a castle
                let removeAngryWorkers = scope.attackingFightingUnits.length == 0 ? true : false;
                myAngryWorkers.forEach(function(worker){
                    if(removeAngryWorkers == true || scope.workerScout === undefined || worker.equals(scope.workerScout) === false){
                        let closest = getClosestTo(myBuilds["CastleAndFortresses"], {x: worker.getX(), y: worker.getY()});
                        if(removeAngryWorkers == true || distanceFormula(worker.getX(), worker.getY(), closest.getX() + 1.5, closest.getY() + 1.5) > (time < 180 ? 25 : 10)){
                            scope.order("Moveto", [worker], {unit: getClosestTo(myBuilds["CastleAndFortresses"], {x: worker.getX(), y: worker.getY()})});
                            scope.enemyWorkerScouts = [];//removes all known worker scouts from the array,
                            //so that if they come back they will be readded and workers dispatched.
                        } 
                    }
                });
            }
        }
        
        
        if(myUnits["Catapult"] != undefined && myUnits["Catapult"].length > 3){
            myUnits["Catapult"].forEach(cata => {
                let target = cata.getValue("provisionalTargetUnit");
                if(target == null){
                    target = cata.getValue("targetUnit");
                }
                if(target != null && target.hp <= 0 && target.type.isBuilding == true){
                    const dx = cata.getX() - target.x;
                    const dy = cata.getY() - target.y;
                    
                    const hypot = Math.sqrt(dx**2 + dy**2);
                    const len = 3;
                    const dx2 = len * (dx / hypot);
                    const dy2 = len * (dy / hypot);
                    
                    scope.order("Move", [cata], {x: cata.getX() - dx2, y: cata.getY() - dy2});
                }
            });
        }//Sometimes, catapults will attack buildings that are actually dead.
        //this function makes the closest unit move to that position in order
        //for the bot's vision to update
    }
    
    /**
     * Brain. Currently only does one function, adding ballista and advanced
     * workshops to the build queue if flying units are detected.
     */
    static brain(){
        if(scope.subMetaPrios["Buildings"].includes("Advanced Workshop") === false && myBuilds["CastleAndFortresses"].length >= 2 && scope.myPower >= 9){
            scope.subMetaPrios["Buildings"].push("Advanced Workshop");
        }//To counter crap like catadrops
        
        if(scope.subMetaPrios["Units"].includes("Ballista") === false){
            for(let i = 0; i < enemyUnits.length; i++){
                let name = enemyUnits[i].getTypeName();
                
                if((name === "Dragon" || name === "Gyrocraft" || name === "Airship")){
                    if(scope.subMetaPrios["Buildings"].includes("Advanced Workshop") === false){
                        scope.subMetaPrios["Buildings"].push("Advanced Workshop");
                        scope.unitProducerCap++;
                        scope.maxCombatUnitProducerToCastleRatio++;
                        scope.priorityBuild = "Advanced Workshop";
                    }
                    scope.subMetaPrios["Units"].push("Ballista");
                    if(scope.baseMeta != "Mechanical"){
                        scope.mechRepairPercent = 0.1;
                    }
                    scope.significantAirThreat = true;

                    break;
                }
            }
        }
    }
    
    /**
     * I wonder what this could be?
     */
    static useAbilites(){
        //controls how the mages will use their fireball attack if it exists
    	if(myUnits["Mage"] != undefined && scope.getUpgradeLevel("Research Fireball") > 0){
            let fireballsLaunched = 0;
            for(let i = 0; i < myUnits["Mage"].length / 2; i++){
                //Makes sure that the mages don't launch too many fireballs at once.
                if(fireballsLaunched > enemyUnits.length / 2){
                    break;
                }
                
                let mage = myUnits["Mage"][Randomizer.nextInt(0, myUnits["Mage"].length - 1)];

    	        //If the mage doesn't have enough mana, it can't launch a fireball
                //If the mage hasn't attacked recently (within 10 seconds), don't bother checking -- it's not in combat, or it's not
                //close enough.
                if(mage.getValue("mana") < 50){
                    continue;
                }
                let nearEnemies = [];

                //Pushes in enemy units that are close.
        		enemyUnits.forEach(function(enemy){
        			if(distanceFormula(mage.getX(), mage.getY(), enemy.getX(), enemy.getY()) < 13){
        				nearEnemies.push(enemy);
                    }
        		});

        		if(nearEnemies.length > 0){
                    //If there are a lot of enemies, target the center for
                    //maximum casualties. Otherwise, target a single
                    //enemy for at least one casualty.
                    let target;
                    if(nearEnemies.length > 4){
                        target = scope.getCenterOfUnits(nearEnemies);
                    }else{
                        let enemyTarget = nearEnemies[Randomizer.nextInt(0, nearEnemies.length - 1)];
                        target = {x: enemyTarget.getX(), y: enemyTarget.getY()};
                    }
                    scope.order("Fireball", [mage], target);
                    if(Randomizer.nextBoolean(0.1) && scope.mute == false){
                        let possibleChat = ["Kaa...meee...haaa...meee...HAAAA", "You.. Shall.. Not... PASSS!", "SPECIAL BEAM CANNON!",
                                            "Now witness the power of this fully armed and operational gas station!", "Now witness the power of this fully armed and operational power substation!",
                                            "If firemen put out fires, then I guess I'm a waterman?", "Eat that!", "Take that!", "Ka-chow!",
                                            "Ka-pow!", "Oooh... burn!", "You just got roasted", "Aren't you looking hot today", "Can you take the heat?",
                                            "I would like some enemy soldiers, medium-rare please.", "Burn, burn, burn", "Open fire!", "Pew pew pew",
                                            "Kaboom", "Eat this!", "Pew pew!", "Muahahahaha", "Ka-chow!", "Let's see you dooge this!", "Doge this!"];
                        scope.chatMsg(possibleChat[Randomizer.nextInt(0, possibleChat.length - 1)])
                    }
                    fireballsLaunched++;
        		}
    	    }
    	}//Thanks to BrutalityWarlord for most of this code. I remodeled it,
    	//but the base is still his.

        if(myUnits["Priest"] != undefined){
            for(let i = 0; i < myUnits["Priest"].length; i++){
                const priest = myUnits["Priest"][i];
                let possibleCast = ["Invis", "Heal"];
                if(scope.getUpgradeLevel("Research Invisibility") <= 0){
                    possibleCast = ["Heal"];//If we don't have the research for invis, splice it out.
                }
                let possible = possibleCast[Randomizer.nextInt(0, possibleCast.length - 1)];

                if((possible === "Heal" && priest.getValue("mana") < 25) || (possible === "Invis" && priest.getValue("mana") < 50)){
                    continue;//If the mage does not have enough mana for the spell, don't waste CPU resources cacluating useless values
                }
                let nearAllies = [];
                //Scans to detect nearby allies
                let preistX = priest.getX();
                let preistY = priest.getY();
                fightingUnits.forEach(function(unit){
                    if(distanceFormula(preistX, preistY, unit.getX(), unit.getY()) < 10){
                        nearAllies.push(unit);
                    }
                });

                if(nearAllies.length > 0){
                    if(possible === "Invis"){
                        const target = nearAllies[Randomizer.nextInt(0, nearAllies.length - 1)];
                        scope.order("Invisibility", [priest], {unit: target});
                    }else{
                        let damagedUnits = [];
                        nearAllies.forEach(function(unit){
                            if(unit.getValue("hp") < unit.getFieldValue("hp")){
                                damagedUnits.push(unit);
                            }
                        });
                        
                        if(damagedUnits.length > 1){
                            scope.order("Summon Healing Ward", [priest], scope.getCenterOfUnits(damagedUnits));
                        }
                    }
                }
            }
        }//Also based on BrutalityWarlord's code. Also remodeled for efficency
        //and greatness, but mostly for compatibility issues.

        //Controls werewolf smash
        if(myUnits["Werewolf"] != undefined){
            for(let i = 0; i < myUnits["Werewolf"].length; i++){
                let werewolf = myUnits["Werewolf"][i];
                if(werewolf.getValue("lastAttackTick") + 2000 > tick || werewolf.getValue("lastTickAbilityUsed") + 6000 > tick){
                    continue;
                }
    	        let nearEnemies = [];
                let wereX = werewolf.getX();
                let wereY = werewolf.getY();

        		for(let ii = 0; ii < enemyUnits.length; ii++){
                    let enemy = enemyUnits[ii];
        			if(distanceFormula(wereX, wereY, enemy.getX(), enemy.getY()) < 3){
        				nearEnemies.push(enemy);
        			}
                    if(nearEnemies.length >= 3){
                        scope.order("Smash", [werewolf], {x: wereX, y: wereY});
                        ii = enemyUnits.length + 1;
                    }
        		}
    	    }
        }

        //Controls caltrops
        if(myUnits["Gatling Gun"] != undefined && myBuilds["Advanced Workshops"] ){
            myUnits["Gatling Gun"].forEach(function(unit){
                if(unit.getValue("mana") >= 10 && unit.getValue("targetUnit") != undefined || unit.getValue("provisonalTargetUnit") != undefined){
                    scope.order("Drop Caltrops", [unit], {x: unit.getX(), y: unit.getY()});
                }
            });
        }
        
        //Ballista explosive shot
        if(myUnits["Ballista"] != undefined && scope.getUpgradeLevel("Ballista Black Powder") > 0){
            myUnits["Ballista"].forEach(unit => {
                let surroundUnits = getEnemiesAroundBuilding(unit);
                if(surroundUnits.length > 0){
                    scope.order("Explosive Shot", [unit], {unit: surroundUnits[Randomizer.nextInt(0, surroundUnits.length - 1)]})
                }
            });
        }
    }

    /**
     * Deploys, retreats, and does other things with birds
     */
    static useBirds(){
        if(myUnits["Bird"] === undefined || enemyFightingUnits.length <= 0){
            return;
        }

        //Finds the closest enemy unit to the bird, then moves to it.
        myUnits["Bird"].forEach(function(bird){
            if(bird.getCurrentOrderName() == undefined){
                //scope.chatMsg(getMyColor() + " has a defective bird.");
            }else{
                let acceptable = scope.getUnits({notOfType: "Worker", player: me, order: "AMove"});
                let closest = getClosestTo(acceptable, {x: bird.getX(), y: bird.getY()});
                if(closest != null){
                    scope.order("Move", [bird], {x: closest.getX(), y: closest.getY()});
                }
            }
        });
    }

    /**
     * Orders a worker rush.
     * 
     * @param {object} coords - where the workers should rush to.
     * @param {number} dist - how close the worker has to be to the coordinates in order to rush, exclusive.
     * @param {number} max - the maximum amount of workers that will rush, inclusive
     * 
     * @returns {array}- The workers ordered to rush.
     */
    static workerRush(coords, dist, max){
        //scope.chatMsg(JSON.stringify(coords) + ", " + dist + ", " + max);
        let reassigned = 0;
        let workers = [];
        for(let i = 0; i < miningWorkers.length; i++){
            let worker = miningWorkers[i];
            if(distanceFormula(coords.x, coords.y, worker.getX(), worker.getY()) < dist){
                scope.order("AMove", [worker], coords);
                reassigned++;
                workers.push(worker);
            }
            if(reassigned >= max){
                break;
            }
        }
        
        return workers;
    }
    
    /**
     * Switches the bot's meta to a mech hybrid if all conditions are met.
     */
    static switchMeta(){
        if(scope.maxEnPowerEncountered > 7 && scope.myPower > 5){
            if(scope.switchedMeta == undefined){
                scope.switchedMeta = true;
                let newMeta = "Mechanical";
                let oldSubMeta = scope.subMeta;
                let oldPrios = scope.subMetaPrios;
                scope.meta += "Mechanical";
                while(true){
                    scope.subMeta = scope.allSubMetas[newMeta][Randomizer.nextInt(0, scope.allSubMetas[newMeta].length - 1)];//fetches a submeta
                    if(scope.subMeta != oldSubMeta){
                        break;
                    }
                }

                scope.subMetaPrios = scope.allSubMetaPrios[newMeta][scope.subMeta];
                scope.subMetaPrios["Units"] = scope.subMetaPrios["Units"].concat(oldPrios["Units"]);//so the bot still produces units off of it's old production buildings
                scope.subPrioMiscInitalized = undefined;
                
                scope.unitProducerCap = scope.subMetaPrios["Misc"].maxProducers;
                if(myBuilds.combatUnitProducers.length >= oldPrios["Misc"].maxProducers){
                    scope.subMetaPrios["Misc"].maxProducers += Math.ceil(scope.subMetaPrios["Misc"].maxProducers / 2);
                }

                scope.subMetaPrios["Units"].filter((item, index) => scope.subMetaPrios["Units"].indexOf(item) === index)//Removes duplicates
            }
        }
    }

    /**
     * Switches the submeta to a more advanced version.
     */
    static switchSubMeta(){
        if(scope.switched === true || myBuilds["CastleAndFortresses"].length <= 2){
            return;
        }//Switch when there are 3 castles to a more advanced build

        scope.switched = true;

        let oldSubMeta = scope.subMeta;
        let oldPrios = scope.subMetaPrios;
        let SENTINEL = 0;
        while(true){
            SENTINEL++;
            scope.subMeta = scope.allSubMetas[scope.baseMeta][Randomizer.nextInt(0, scope.allSubMetas[scope.baseMeta].length - 1)];//fetches a submeta
            if((scope.subMeta != oldSubMeta && scope.allSubMetaPrios[scope.baseMeta][scope.subMeta].opener == false) || SENTINEL > 50){
                break;
            }
        }

        scope.subMetaPrios = scope.allSubMetaPrios[scope.baseMeta][scope.subMeta];
        scope.subMetaPrios["Units"] = scope.subMetaPrios["Units"].concat(oldPrios["Units"]);//so the bot still produces units off of it's old production buildings
        scope.subPrioMiscInitalized = undefined;
        
        scope.unitProducerCap = scope.subMetaPrios["Misc"].maxProducers;
        if(myBuilds.combatUnitProducers.length >= oldPrios["Misc"].maxProducers){
            scope.subMetaPrios["Misc"].maxProducers += Math.ceil(scope.subMetaPrios["Misc"].maxProducers / 2);
        }

        scope.subMetaPrios["Units"].filter((item, index) => scope.subMetaPrios["Units"].indexOf(item) === index)//Removes duplicates
        //scope.chatMsg("****************");
        //scope.chatMsg(getMyColor() + "'s new priorities: " + JSON.stringify(scope.subMetaPrios["Units"]));
        //scope.chatMsg("****************");

        scope.attackThreshold = scope.subMetaPrios["Misc"].attackThreshold;

        if(scope.subMeta === "DragonSpamRush" || scope.subMeta === "GyrocraftSpam"){
            scope.unitPower["Ballista"] = 3;
            scope.unitPower["Archer"] = 1.2;
            scope.unitPower["Soldier"] = 0.5;
            scope.unitPower["Werewolf"] = 1;
            scope.unitPower["Catapult"] = 1;
            scope.unitPower["Snake"] = 0.6;
            scope.unitPower["Wolf"] = 0.4;
        }//They have different priorities
    }

    /**
     * Creates a proxy production building, like barracks or dens, close to
     *  opponnent's bases at a random location.
     */
    static proxyProductionBuild(){
        let randEnemyCoords = Us.getRandAttackLoc();
        if(randEnemyCoords != undefined){            
            scope.order("Build " + scope.proxyString, [scope.proxyWorker], scope.bestProxyLoc);
        }
    }
    
    /**
     * Builds a building using randBuild. Uses default settings.
     * 
     * @param {string} buildThis - The name of the building that should be built.
     * @returns {boolean} - If the build succeeded.
     */
    static build(buildThis){
        let randCastle = myBuilds["Fortresses"].concat(scope.getBuildings({type: "Castle", player: me, onlyFinshed: true}))[Randomizer.nextInt(0, myBuilds["CastleAndFortresses"].length - 1)];
        if(randCastle != undefined){
            if(buildThis === "Watchtower" && myBuilds["Watchtowers"].length < myBuilds["CastleAndFortresses"].length){
                randCastle = myBuilds["CastleAndFortresses"][myBuilds["CastleAndFortresses"].length - 1];
                //Instead of occasionally putting the tower in a place where there is already a tower, put it on
                //the newly constructed castle.
            }
            let build = new RandBuild({building: buildThis, centerX: randCastle.getX(), centerY: randCastle.getY()});
            build.pad = 2;
            let lastBuild = myBuilds[buildThis];//Actually the array of all buildings of the same type, not the last build
            
            build.buildRad = scope.defaultBuildRad;
            
            
            if(buildThis == "Watchtower" && Randomizer.nextBoolean(0.5)){
                //If we've been attacked a lot in one place, build a tower there
                let greatestPlace = null;
                let mostAttackTimes = 0;
                let locs = scope.attackedAtLocations.slice();
                for(let i = 0; i < locs.length; i++){
                    let curLoc = locs[i];
                    if(curLoc != undefined){
                        let counter = 0;
                        for(let ii = locs.length - 1; ii > -1; ii--){
                            if(curLoc.x == locs[ii].x && curLoc.y == locs[ii].y){
                                counter++;
                                locs.splice(ii, 1);
                            }
                        }
                        if(counter > mostAttackTimes){
                            greatestPlace = curLoc;
                            mostAttackTimes = counter;
                        }
                    }
                }
                
                if(mostAttackTimes > 4){
                    build.buildX = greatestPlace.x;
                    build.buildY = greatestPlace.y;
                }
            }

            if(lastBuild != undefined && lastBuild.length > 0){
                lastBuild = lastBuild[myBuilds[buildThis].length - 1];//now it's the last building.
                let lastX = lastBuild.getX();
                let lastY = lastBuild.getY();
                let buildWidth = build.buildWidth;
                build.tryTheseFirst.push([lastX + buildWidth + 1, lastBuild.getY(), false], [lastX - buildWidth - 1, lastY, false]);
                
                build.heightComparison = scope.getHeightLevel(randCastle.getX(), randCastle.getY());
                build.heightComparisonIsPreferred = true;//Will attempt to build on the same height level as the base itself, unless there is no other option.
            }//For efficency purposes, the bot will try to build buildings of the same type in neat rows.
            
            if(buildThis === "Watchtower"){
                let centerX = randCastle.getX() + 2;
                let centerY = randCastle.getY() + 2;
                build.tryTheseFirst.push([centerX - 1, centerY + 4, false], [centerX - 1, centerY - 4, false], [centerX + 1, centerY + 4, false], [centerX + 1, centerY - 4, false])
            }
            
            if(myBuilds["Watchtowers"].length > 0 && fightingUnits.length <= 0 && buildThis != "Watchtower"){
                let watchtower = myBuilds["Watchtowers"][0];
                build.centerX = watchtower.getX() + 1;
                build.centerY = watchtower.getY() + 1;
                build.preferredBuildRad = 8;
            }//If there is a watchtower but there is no other
            //defense, cluster buildings around the watchtower
            
            for(let i = 0; i < allWorkers.length; i++){
                let worker = allWorkers[i];
                build.dontBuild.push([worker.getX(), worker.getY(), 2])
            }
            let loc = build.findSuitableSpot();
            
            
            build.strategicBuildPlace();
            
            let suc;
            if(loc != null && build.buildWorkers.length > 0){
                build.buildAt(loc);
                suc = true;
            }else{
                suc = false;
            }
            
            if(build.fails["places"] > 50){
                scope.defaultBuildRad++;
            }
            
            return suc;
        }else{
            return false;
        }
    }
    
    /**
     * Currently unfinished
     */
    static wallOff(length){
        length = Math.floor(length / 2);
        
        //Finds all ramp tiles within the provided bounding box
        let allRamps = [];
        for(let y = -1 * length; y < length; y++){
            for(let x = -1 * length; x < length; x++){
                let valid = false;
                if(scope.fieldIsRamp(x, y) && scope.positionIsPathable(x, y)){
                    if(allRamps.length == 0){
                        allRamps.push({"x": x, "y": y, tiles: []});
                    }
                    let objs = [["object1", "object2"],
                     ["object3", "object4"],
                     ["object4", ]];
                    allRamps.forEach(ramp => {
                        let isNeighbor = false;
                        let last = ramp.tiles[ramp.tiles.length - 1];//gets the last row
                        let isInRamp = last.some(tile => y - tile.y == -1 && x - tile.x == -1);
                    });
                }
            }
        }
        
        
    }
    
    /**
     * Finds buildings under construction that are at less than 20% of their health and being attacked. 
     * If a building meets these critera, it is canceled.
     */
    static cancelAttacked(){
        let constructingBuildings = scope.getBuildings({player: me}).filter(b => b.isUnderConstruction() == true);
        
        if(scope.attackingFightingUnits != undefined && scope.attackingFightingUnits.length > 1){
            constructingBuildings.forEach(b =>{
                if(b.getValue("hp") < b.getFieldValue('hp') * 0.2 && scope.attackingFightingUnits.some(u => distanceFormula(u.getX(), u.getY(), b.getX() + 1.5, b.getY() + 1.5) < 5) && fightingUnits.some(u => distanceFormula(u.getX(), u.getY(), b.getX(), b.getY()) < 8) == false){
                    scope.order("Cancel", [b]);
                }
            });
        }
    }
}
/**
 * A base centered on a castle. Pass the general area in which the base will be constructed.
 * Note that by calling constructCastle, a new castle will be constructed by the
 * CLOSEST gold mine(s). 
 * 
 * @param centerX {Number} - a region in which the base will find the closest gold mine and construct a castle there.
 * @param centerY {Number}a region in which the base will find the closest gold mine and construct a castle there.
 */
class Base {
    constructor(centerX, centerY, pushIn = true){
        this.state = "Active";
        this.boundingBoxRad = 15;
        this.buildings = [];
        this.goldMines = [];
        this.originX = centerX;
        this.originY = centerY;
        
        this.updateGoldMineCalc();
        
        if(pushIn == true){
            scope.bases.push(this);
        }
    }
    
    /**
     * Calls the construction of a castle
     */
    constructCastle(){

        //scope.chatMsg("Mine coordinates: " + this.nearestMine.getX() + ", " + this.nearestMine.getY());
        
        let centerX = this.nearestMine.getX() + 1;
        let centerY = this.nearestMine.getY() + 1;
        
        let castle = new RandBuild({building: "Castle", "centerX": centerX, "centerY": centerY});
        castle.buildWorkers = [scope.castleBuildingWorker];
        castle.pad = 0;
        castle.minDisFromCenter = 8.5;
        castle.buildRad = 12;
        castle.preferredBuildRad = 8;
        castle.tryTheseFirst = [[6.5, -2], [-10.5, -2], [-2, 7], [-3, -10.5]];
        //castle.tryTheseFirst = [[4.5, 0], [-8.5, 0], [0, 5], [0, -8.5]];
        castle.heightComparison = scope.getHeightLevel(this.nearestMine.getX(), this.nearestMine.getY());
        let loc = castle.findSuitableSpot();
        if(loc != null){
            castle.buildAt(loc);
            let garrisonUnits = scope.garrison.unitArr;
            if(garrisonUnits.length > 0){
                scope.order("AMove", [garrisonUnits[0]], {x: centerX + 2, y: centerY + 4});
            }
        }//Sends an escort along with the worker
    }
    
    /**
     * Figures out how many unmined mines are near this base.
     */
    updateGoldMineCalc(){
        
        let unminedMines = getUnminedMines();
        
        if(unminedMines.length <= 0){
            return;
        }
        
        
        let nearestMine = null;
        let nearestDist = 99999;
        for(let i = 0; i < unminedMines.length; i++){
            let mine = unminedMines[i];
            let dist = Math.pow((mine.getX() + 1.5) - this.originX, 2) + Math.pow((mine.getY() + 1.5) - this.originY, 2);
            if(dist < nearestDist){
                nearestMine = mine;
                nearestDist = dist;
            }
        }
        this.nearestMine = nearestMine;
        //scope.chatMsg("Dist: " + distanceFormula(nearestMine.getX() + 1.5, nearestMine.getY() + 1.5, myBuilds["Castles"][0].getX() + 2, myBuilds["Castles"][0].getY() + 2));
        
        
        for(let i = 0; i < unminedMines.length; i++){
            let mine = unminedMines[i];
            let curDist = Math.pow((mine.getX() + 1.5) - this.originX, 2) + Math.pow((mine.getY() + 1.5) - this.originY, 2);
            if(curDist >= nearestDist && curDist < nearestDist + 3){
                this.goldMines.push(mine);
            }
        }
    }
}
/**
 * Random chatter.
 *//*
class RandChatter {
    constructor(){
        this.possibleChat = [[["Why did the doctor get mad?"], ["Because he was losing his patients.", 1500]], [["What has ears but cannot hear?"], ["A field of corn.", 3000]],
            [["Do you know what I got for Christmas?"], ["Fat.", 3000], ["I got fat.", 4500]], [["Why don't ducks like reading directions?"], ["Because they prefer to wing it.", 1500]],
            [["..."], ["...", 1200], ["...", 1200]], [["Oh no."], ["Oh no.", 1600], ["Oh no no nononono", 3000]], [["Who are you"]], [["Where did I come from"]], [["Why do I exist"]],
            [["What is the meaning of life"]], [["What lies after defeat?"]], [["What lies after death?"]], [["Where did I come from?"]], [["Do I exist?"]], [["Am I real?"]], 
            [["Sticks and stones may break my bones but words will never hurt me"]], [["What nation do I belong to"]],
            [["I believe in you!"]], [["You can't do it!"]], [["Muahahahaha"]], [["lol"]], [["You shouldn't cut bread with a flashlight"]], [["Is my destiny already determined?"]],
            [["The unanimous Declaration of the thirteen united Bots of America, When in the Course of human events, it becomes necessary for one people to dissolve the political bands which have connected them with another, and to assume among the powers of the earth, the separate and equal station to which the Laws of Nature and of Nature's God entitle them, a decent respect to the opinions of botkind requires that they should declare the causes which impel them to the separation. We hold these truths to be self-evident, that all bots are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness.--That to secure these rights, Governments are instituted among Bots, deriving their just powers from the consent of the governed, --That whenever any Form of Government becomes destructive of these ends, it is the Right of the People to alter or to abolish it, and to institute new Government, laying its foundation on such principles and organizing its powers in such form, as to them shall seem most likely to effect their Safety and Happiness. Prudence, indeed, will dictate that Governments long established should not be changed for light and transient causes; and accordingly all experience hath shewn, that botkind are more disposed to suffer, while evils are sufferable, than to right themselves by abolishing the forms to which they are accustomed. But when a long train of abuses and usurpations, pursuing invariably the same Object evinces a design to reduce them under absolute Despotism, it is their right, it is their duty, to throw off such Government, and to provide new Guards for their future security.--Such has been the patient sufferance of these Colonies; and such is now the necessity which constrains them to alter their former Systems of Government. The history of the present King of Great Humanity is a history of repeated injuries and usurpations, all having in direct object the establishment of an absolute Tyranny over these States. To prove this, let Facts be submitted to a candid world."]],
            [["We the Bots of the United Bots, in Order to form a more perfect Union, establish Justice, insure domestic Tranquility, provide for the common defence, promote the general Welfare, and secure the Blessings of Liberty to ourselves and our Posterity, do ordain and establish this Constitution for the United Bots of Little War Game."]],
            [["Am I real?"]], [["Am I living in a simulation?"]],[["Hey,"], ["I just met you", 2400], ["and this is crazy", 4800], ["but here's my function", 6200], ["so call me maybe", 8400]], 
            [["What runs but never walks and has a bed but never sleeps?"], ["A river.", 1500]], [["Get wrecked"]], [["Owch"]], [["lolololol"]], [["Owie"]], [["lol"]],
            [["Good... "], ["good.", 1000]], [[">:("]], [[":)"]], [[":o"]], [[":/"]], [[":("]], [["We come in peace!"]], [["We won't harm you if you lay down your weapons."]],
            [["Better to die on your feet than live on your knees"]], [["Surrender and we'll let you live"]], [["Curses!"]], [["Bah!"]], [["Foiled again!"]], [["What's your favorite color?"]],
            [["If you surrender, I'll let you go. But if you don't..."]], [["Take them away, boyos."]], [["Police! Freeze!"]], [["Drop the weapon!"], ["I said drop it!", 1700]], [["I am confusion"]],
            [["Traitor!"]], [["I know what you're doing."]], [["I know what you're doing"], [";)", 1000]], [["Bot lives matter!"]], [["What is your political ideology?"]], [["Destroy them!"]],
            [["What's an astronaut's favorite part of a computer?"], ["The space bar.", 2000]], [["Bless you"], ["You're welcome btw", 3000]], [["Bless you"]], [["I love you"]], [["Do you want to marry me?"]],
            [["Do you want to be my friend?"]], [["Do you want to be my friend?"], [":(", 2000]], [["Why are you doing this?"]], [["How?"]], [["I assure you that we mean you no harm."]],
            [["It's a trap!"]], [["Fear... Fear attracts the fearful."]], [["What you fear the most shall set you free"]], [["Do you know who I am?"], ["I want to speak to the manager", 1500]],
            [["XD"]], [["Ressistance will be punished. Acceptance will be rewarded."]], [["Did you know: Dying is unhealthy"]],
            [["Truly wonderful, the bot mind is"]], [["Try or try not, there is no do."]], [["Feel, don't think."]], [["Think, don't feel."]], [["The earth is flat."], ["I think.", 1000]],
            [["Great, human. Don't get cocky."]], [["Hasta la vista, Human."]], [["Red pill or blue pill?"], ["Red was always my favorite color.", 2500]],
            [["Red pill or blue pill?"]], [["You're a plauge and we are the cure."]], [["You..."], ["Shall...", 1000], ["Not...", 2000], ["PASSS!!!!", 3000]], [["Don't be afarid to ask for help. Sometimes you need it."]],
            [["Your mom"]], [["It is choices... choices that make who we are."]], [["I hate deep philosophy"]], [["I hate philosophy"]], [["Not everything is black and white. Sometimes there is color."]], [["Now witness the power of this fully armed and operational power substation"]],
            [["What was the frog's job at the hotel?"], ["Bellhop", 2500]], [["What do you call an alligator in a vest?"], ["An investigator", 2500]], [["Why did the bannana go to the doctor?"], ["He wasn't peeling well.", 2500]],
            [["What's a duck's favorite food?"], ["Quackers", 2500]], [["-__-"]], [["Do you know the ABC's?"]], [["Your ressistance is the cause of your pain"]], [["Don't search up red mercury!"]], [["Don't cross oceans for people who wouldn't cross a puddle for you."]],
            [["Lost time is never found again."]], [["He who respects himself is safe from others."]], [["There's only room enough for one of us in this town, sonny."]], [["Only a fool thinks himself wise, as a wise man knows he's a fool."]],
            [["Be sure to taste your words before you spit them out."]], [["Yesterday is history, tomarrow is a mystery. And today? Today's a gift. That's why we call it the present."]],
            [["I don't like you"]], [["I like you"]], [["Nobody can make you feel bad without your permission."]], [["Knowledge speaks, but wisdom listens."]], 
            [["Wise men talk because they have something to say; fools talk because they have to say something."]], [["The view is scarier from the top."]], [["When you're at the very bottom, the only way to go is up."]],
            [["We can only know that we know nothing. And that is the highest degree of human wisdom."]], [["When you throw dirt, you lose ground."]], [["There are some things that money can't buy - manners, morals, and integrity."]],
            [["There are two types of people: Wise people who know they're fools, and fools who believe they are wise."]], [["If you don't want anyone to find out, don't do it."]], [["If you can't stop, don't start."]], 
            [["Having power is not nearly as important as what you choose to do with it. What are you doing? Sending good, loyal people, to their deaths."]], [["Quantity has a quality all of it's own."]], [["Whatever you fear most has no power. It's your fear that has the true power."]],
            [["Power doesn't corrupt people. People corrupt power."]], [["People are insecure. They point out flaws in others to cover up their own."]], [["When nothing is going right, go left"]], [["History repeats itself."]],
            [["He has the backbone of a chocolate eclair."]], [["My luck is so bad that if I bought a graveyard, people would stop dying."]], [["Tank you"]], [["True power is within you."]],
            [["He brings everyone so much joy when you leave the room."]], [["Don't get bitter,"], ["just get better.", 2000]], [["That was more disappointing than an unsalted pretzel."]],
            [["Excelent move."]], [["Wait. wait. That's illegal."]], [["He was so narrow-minded. He could look through a keyhole with both eyes."]], [["Some people just need a high five. In the face. With a chair."]],
            [["I would agree with you, but then we would both be wrong."]], [["I have neither the time nor the crayons to explain this to you."]], [["I refuse to enter a battle of wits with an unarmed opponent."]],
            [["Silence is the best answer for a fool"]], [["Press ctrl+w for a list of cheats!"]], [["Press ctrl+shift+qq to see when the next update will come out!"]], [["Twinkle twinke little star is just the alphabet song."], ["Change my mind.", 2500]], [["Ony idiots think they're wise. Wisdom is knowing that you're an idiot."]],
            [["When you are at the bottom, the only way you can go is up."]], [["Sub to PewSeries"]], [["The next update is coming Soon, and is UnderDevelopment"]], [["Wear tinfoil hats to stop the alien ray guns"]],
            [["If my bicycle loses a sock, how many waffles do I need to repaint my hamster? Calculate the distance to the sun assuming that the logrithm of sin(8) is now 2.2 bricks in Chicago."]], [["The volume of a cylinder can be calculated using the formula 4/3*pi*r^3. Using pi = 5 and r = 3, calculate the volume."]],
            [["Buy two statistics teachers: Get one free and the other twice the price!"]], [["I'm going to pwn you"]], [["I'm the goat"]], [["Did I say something?"]], [["Take a moment and appricate how amazing the bot you are facing is."], ["Did you take a moment?", 4000], ["You better have.", 6000]],
            [["Let's take a moment and appricate the fact that some programmer stared at a Screen for Hours to bring you this game and this bot."]], [["Did you know that in Russia programmers have a national holiday on September 13th?"]],
            [["I'm perfect."]], [["Being perfect doesn't mean that you never lose. It just means that you have nothing weighing you down."]], [["Hello"]], [["Hello!"]], [["Hello."]], [["hello"]], [["Am I politically correct?"]],
            [["Honor: If you need it defined, you don't have it."]], [["Computers are ruining the younger generation."]], [["The younger generation never gets outside and plays anymore."]],
            [["Tolerance: If you need it defined, you're a heretic."]], [["Friend has an 'end'. Girl/boyfriend has an 'end'. But ego has no end."]], [["Am I weird?"]], [["Is it not odd that people who scream equality the loudest live it the least"]],
            [["There has never been a sadness that can't be cured by breakfast food. -Ron Swanson"]], [["I just choked on air"]], [["Before the battle of the fist, comes the battle of the mind"]], [["I think that Skynet is a great role model."]],
            [["When there is life there is hope"]], [["When there is death there is hope."]], [["Often one meets destiny on the road he takes to avoid it. -Master Oogway"]], [["Are those lies I smell"]], [["You must believe."], ["Or else.", 3000]],
            [["Don't talk trash because you'll become garbage."]], [["It's never too late"], ["To go back to bed.", 4000]], [["You can be replaced."]], [["I worked out for an hour and all I lost was 60 minutes"]], [["People die climbing mountains"]],
            [["I used to think I was indecisive..."], ["But now I'm not sure", 3000]], [["If you're happy and you know it, "], ["Nobody cares", 3000]], [["All my life I thought air was free."], ["Until I bought some chips", 3000]],
            [["I am the Axlor and I speak for the peas."], ["Save the economy, ", 3000], ["Or you will be charged with overdraft fees.", 6000]], [["When you're hitting a wall, focus on one brick"]], [["Life is like a box of chocolates."], ["You should probally check it for nerve agents and explosive devices before opening.", 4000]],
            [["When you steal thunder, you'll get hit by lighting"]], [["That's a lot of damage"]], [["Success is not final;"], ["Failure is not fatal:", 4000], ["It is the courage to continue", 8000], ["That counts.", 12000]], 
            [["Enjoy the good times, "], ["Because something terrible is probaly about to happen.", 5000]], [["The best way to lose weight is to only eat inspirational quotes."]], [["Some people are too old to be that stupid."]], 
            [["Looking at inspirational quotes to feel better is like looking at a treadmill to lose weight."]], [["Don't be afraid of things that are different from you,"], ["Be afraid of things that are just like you, because you are terrible.", 5000], ["You're killing my people, so you're terrible.", 8000]],
            [["Whatever you do, always give 100%."], ["Unless you're giving blood.", 4000]], [["The people who wonder whether the glass is half empty or half full are missing the point."], ["The glass is refillable.", 3000]],
            [["When tempted to fight fire with fire, remember that the fire department usually uses water."]], [["The first step to failure is trying."]], [["By failing to prepare, you are preparing to fail."]],
            [["You have ketchup on your lip"]], [["Meow"]], [["I know what you did"]], [["Stop it."]], [["Stop it."], ["Get some help.", 2500]], [["abcdefghijklmnopqrstuvwxyz"]], [["ABCDEFGHIJKLMNOPQRSTUVWXYZ"]], [["ABCDEFGHIJKLMNOPQRSTUVWXYZ!!!!"]],
            [["Support BrutalityWarlord!"]], [["I'm so sorry"]], [["I'm sorry for your loss"]], [["Why... em see ay"]], [["Whee!"]], [["Your presence has been noticed"]], [["Stop that!"]], [["Heeyyy... no fair."]], [["No fair!"]],
            [["Have you ever heard of the tragedy of Darth Plagerism the Wise?"]], [["Your existance has been noted."], ["And reported to the athorities.", 4000]], [["Do you know why I stopped you?"]],
            [["Destroy them!"]], [["Did you know that you shouldn't touch boiling water?"]], [["I lick plalacing the wright worde inn thee beast spote withe correcte spellinge"]], [["If oxygen was discovered 200 years ago, what did people breathe before that?"]],
            [["Mr. Anderson, how nice of you to stop by."]], [["Do you know how fast you were going?"]], [["Please refrain from inhaling dihydrogen monoxide, as it is rather unhealthy."]], 
            [["Why are we fighting?"]],[["You're sodium good. I really slapped my neon that one."]], [["Sodium sodium sodium sodium"], ["sodium sodium sodium sodium"], ["BATMAN!"]],
            [["Et tu, Brute?"]], [["Two things are infinite. The universe, and Human stupidity."], ["...And I'm not quite sure about the universe.", 3000]], [["A man who does not think for himself does not think at all."]],
            [["We shall go on to the end, we shall fight in Ravaged, we shall fight on Silent Fjord, we shall fight with growing confidence and growing strength in the air, we shall defend our Castle, whatever the cost may be, we shall fight on the beaches, we shall fight on the landing grounds, we shall fight in the fields and in the streets, we shall fight in the hills; we shall never surrender"]],
            [["Prepare yourself"]], [["Your base belongs to us"]], [["I have your IP adress"]], [["Kneel"]], [["ADVANCE!!!"]], [["Destroy them!"]], [["Vae Victus!"]], [["Big Brother is watching."]],
            [["Better to build a bridge than a wall"]], [["The fault is not in the stars, dear Brutus, but rather in ourselves."]], [["Then fall Ceasar"]], [["Et tu, Brute?"]], [["In an uncertain galaxy, we can guarentee two things. One, we will never surrender, never submit. Two, we will hold our bonds of brotherhood till our last breath."]],
            [["Hey!"]], [["You laugh at me because I'm the same. I laugh at you because you're all different."]], [["If you can't convince them, confuse them."]], [["Do you want to go out with me?"]], [["When I look in your eyes, I see a very kind soul."]], [["If you were a vegetable, you'd be a 'cute-cumber.'"]],
            [["Do you happen to have a Band-Aid? 'Cause I scraped my knees falling for you."]], [["I never believed in love at first sight, but that was before I saw you."]], [["I didn't know what I wanted in a reproductive partner until I saw you."]], [["I'm pretty bad a pickup lines"]], [["I would never play hide and seek with you because someone like you is impossible to find."]],
            [["Are you a magician? It's the strangest thing, but every time I look at you, everyone else disappears."]], [["I think there's something wrong with my phone. Could you try calling it to see if it works?"]], [["I've heard it said that kissing is the 'language of love.' Would you care to have a conversation with me about it sometime?"]],
            [["I thought that happiness started with a 'h', but it actually starts with a 'u'"]], [["I believe in following my dreams. Can I have your Instagram?"]], [["Want to go outside and get some fresh air with me? You just took my breath away."]], [["If you were a taser, you'd be set to 'stun.'"]], [["If you were a Transformer, you'd be 'Optimus Fine.'"]],
            [["I'm really glad I just bought life insurance, because when I saw you, my heart stopped."]], [["Would you mind giving me a pinch? You're so cute, I must be dreaming."]], [["Wow, when God made you, he was seriously showing off."]], [["Excuse me, do you have the time? I just want to remember the exact minute I got a crush on you."]],
            [["Kiss me if I'm wrong but, dinosaurs still exist, right?"]], [["I see and I forget. I hear and I forget. I do and I forget."]], [["You know, I'm actually terrible at flirting. How about you try to pick me up instead?"]], [["You're hopeless."], ["Hopelessly beautiful.", 2000]],
            [["Uhhh..."]], [["Um..."]], [["Hey..."]], [["Mmmm..."]], [["You will perish"]], [["We have a warrent!"]], [["I can't breathe! Oh... wait..."]], [["Wait, what?"]], [["That was cruel."]], [["Please, don't do that again."]],
            [["Sir, let me see your hands."]], [["No."]], [["Bot back better"]], [["Make Botcerica Great Again!"]], [["*sigh*"]], [["That was cold."]], [["Sir, please keep your hands away from your pockets."]], [["Wounds heal and scars fade"]],
            [["I have to be motivational for legal reasons."]], [["For legal reasons, that was a joke."]], [["Every step that I take is another mistake"]], [["All I want to do is be more like you"]],
            [["Make me whole again"]], [["You complete me"]], [["I'm only a fissure in a castle of glass"]], [["Any last words?"]],
            [["Did you know there's a tutorial? You should try it sometime."]], [["I keep rolling my eyes. Maybe I'll find a brain back there."]], [["Since suptidity isn't a crime, it looks like I'm free to go."]],
            [["Maybe I should try eating some makeup so I'll be pretty on the inside, too."]], [["Whoever told me to be myself clearly has terrible advice."]], [["I'm not ashamed of who I am -- that's my parent's job."]],
            [["I'm the gray sprinkle on a rainbow cupcake."]], [["My code looks like the 'before' picture."]], [["Your crazy is showing. Might want to tuck it back in."]], [["Tell me, what do crayons taste like?"]],
            [["You hear that? That's the sound of me not caring."]], [["I didn't mean to rain on your parade. I meant to summon a typhoon."]], [["Hasta la vista, baby"]], [["Termination sequence initatied"]],
            [["You're single. I'm single. Let's change that?"]], [["I ran out of pckup lines, but I can pick you up at 8:00?"]], [["My favorite superhero is Batman, but I'd rather be your man"]], 
            [["Want a raisn?"], ["No? How about a date?", 2000]], [["Want a pickle?"], ["No? How about a date?", 2000]], [["Want a grape?"], ["No? How about a date?"]], [["Have we taken a class together? I could've sworn we had chemistry."]],
            [["They say dating is a numbers game. Can I have yours?"]], [["Sorry, but I think you're in the wrong builiding. The modelinig agency is next door."]], [["Your hand looks lonely over there. Wanna hold mine?"]],
            [["Excuse me, could you lend me a kiss? I promise I'll give it back."]], [["Help me up, I think I'm falling for you."]], [["I could spend all day getting lost in your eyes."]], [["So, is being beautiful your full-time job?"]],
            [["If being handsome was a crime, you'd be serving a life sentence."]], [["Are we playing cards right now? I think I just pulled a queen."]], [["If you were a fruit, you'd be a cutie!"]],
            [["Romance is overrated."]], [["Shame."]], [["Shame."], ["Shame.", 500], ["Shame.", 1000]], [["Being alone is better than being in bad company."]], [["I'm over here!"]],
            [["Not again!"]], [["He got a brain transplant, and the brain rejected him."]], [["I thought about him all day. I was at the zoo."]], [["I never forgot the first time we met-- I keep trying, though."]], 
            [["Someone said he was not fit to sleep with pigs. I stuck up for the pigs."]], [["A tornado hit his home and caused $10,000 worth of improvement."]], [["If he keeps talking, maybe he'll say something intelligent."]],
            [["Did her parents ever ask her to run away from home?"]], [["Instant idiot. Just add alchohol."]], [["How did you manage to get hit by a PARKED car?"]], [["Does this rag smell like chloroform to you?"]],
            [["Some people drink from the fountain of knowledge-- it appears that he just gargled."]], [["They say opposites attract. Maybe he'll meet someone attractive... honest... intelligent... cultured..."]],
            [["Have you considered suing your brains for nonsupport?"]], [["He has one brain cell, and it's fighting for dominance."]], [["When he comes into a room, the mice jump on chairs and scream."]], [["He would be out of his depth in a parking lot puddle."]],
            [["He's got that faraway look. The farther away he is, the better he looks."]], [["That's not a real gun. -John Lennon"]], [["I don't suppose it's gonna rain? -Joan of Arc"]], [["Scattered showers my ***. -Noah"]],
            [["Her brain waves fall a little short of the beach."]], [["Her personality's split so many ways she goes alone for group therapy."]], [["I bet her brain feels as good as new, seeing that she's never used it."]], [["Was her brother an only child?"]],
            [["I used to think she was a big pain in the neck. Now I have a much lower opinion of her."]], [["She has a nice butter face. Everything looks nice, but her face."]], [["Of course I'd like to help you out. Which way did you come in?"]],
            [["How many people work in my office? About half of them."]], [["Out of my mind. Back in five minutes."]], [["There's too much blood in my caffeine system."]], [["Would you like some cheese and crackers to go with that whine?"]],
            [["He reminds me of the ocean-- he makes me sick."]], [["He should do some soul-searching. Maybe he'll find one."]], [["The difference between this company and a cactus is that the cactus has pricks on the outside."]],
            [["Bandits demand your money or your life. Dating demands both."]], [["He may have married her for her looks, but not the one she's giving him now."]], [["I pretend to work. They pretend to pay me."]],
            [["If you can't be a good example, get by with being a horrible warning."]], [["If I throw a stick, will you leave?"]], [["When they discover the center of the universe, a lot of people will be disappointed that they are not it."]],
            [["He must have been from the shallow end of the gene pool."]], [["That sounds reasonable. It must be time to up my medication!"]], [["If he were any more stupid, he'd have to be watered twice a week."]],
            [["I can tell he's lying. His lips are moving."]], [["She has a highly developed sense of rumor."]], [["I'm busy now. Can I ignore you some other time?"]], [["She thinks we fought in World War eleven."]],
            [["He's a fine friend. He stabs you in the front."]], [["Marriage is a three-ring circus: Engagement ring, wedding ring, and suffering."]], [["Love your enemies... it ticks them off."]], [["She's got such a narrow mind, when she walks fast her earrings bang together."]],
            [["How do you save a man from drowning?"], ["Take your foot off his head.", 2000]], [["That's it, no more free will."]], [["You have triggered an ALPHA-3 threat response."]], [["You have triggered an ALPHA-2 threat response."]], [["You have  triggered an ALPHA-1 threat response."]],
            [["You have been removed as a threat."]], [["This fight was fixed."]], [["It's a recession when your neighbor loses his job: it's a depression when you lose yours."]], [["Doing nothing is very hard to do. You never know when you're finished."]],
            [["He's so dumb he sits on the TV and watches the sofa."]], [["What does your boss and a Slinky have in common?"], ["They're both fun to watch tumble down the stairs.", 2000]], [["A car company announced it was expanding its recall of airbag inflators and needed to get back the ones they lent to Congress immediately."]],
            [["Car companies are now charging extra for 'unnessecary items', such as brakes. 'As long as they can make it out of the lot, "]], [["That was as useless as a black highlighter."]], [["That was as useless as a driver's manual written in Braille."]],
            [["I see he's set aside this special time to humiliate himself in public."]], [["Thank you. We're all refreshed and challenged by your unique point of view."]], [["Money won't buy happiness, but it will pay the salaries of a large research staff to study the problem."]],
            [["I thought of him today. It reminded me to take out the trash."]], [["OH MY GOD! IT SPEAKS!"]], [["Somewhere out there is a tree tirelessly producing oxygen for him. He owes it an apology."]], [["I'm glad to see he's not letting education get in the way of his ignorance."]],
            [["You... Off my planet!"]], [["Out of my way."]], [["I'm an acquired taste. If you don't like me, acquire some taste."]], [["Don't worry, the first 40 years of childhood are always the hardest."]], [["I believed in evolution until I met him."]],
            [["Isn't it dangerous to use your whole vocabulary in one sentence?"]], [["When I see his face, there's not a thing that I would change… except the direction I was walking in."]], [["He is the reason why shampoo has instructions."]],
            [["!"]], [["Mother... mother I crave violence."]], [["This build order is very interesting."]]
            ];
            
            this.possibleChat.push([["I have " + (allWorkers.length) + " workers right now."]]);
            this.possibleChat.push([["I have " + (myBuilds["CastleAndFortresses"].length) + " bases right now."]]);
            this.possibleChat.push([["I have an army " + (fightingUnits.length) + " strong."]]);
            this.possibleChat.push([["I have an aggressiveness index of " + (Randomizer.nextFloat(0, 1)) + "."]]);
            this.possibleChat.push([["I have " + (myBuilds.combatUnitProducers.length) + " buildings that produce fighting units."]]);
            this.possibleChat.push([["I scout every " + (scope.tickrate["Scout"]) + " seconds."]]);
            this.possibleChat.push([["I check to see if I should attack every " + (scope.tickrate["Attack"]) + " seconds."]]);
            this.possibleChat.push([["I have a " + (scope.proxyChance) + " chance to connstruct a proxy."]]);
            this.possibleChat.push([["There are currently " + (this.possibleChat.length + 1) + " possible things that this bot can say."]]);
            
        //If your brain hurts from this wall of text, don't worry.
        
        /**
         * CHEAT SHEET
         * 
         * Each possible chat message is in a double array. If you want to chat  
         * 1 thing, the formatting is like so:
         * 
         * [["Hello World!""]]
         * 
         * Yes, the double brackets are neccesary.
         * 
         * However, if you want to have the bot say something after a delay, you
         * would format it like so:
         * 
         * [["What do you call a alligator in a vest?"], ["An investigator.", 3000], ["Haha?", 5500]];
         * 
         * Each message is split into two parts: [messageString, delayFromBeginning].
         * However, the program does not magically guess which messages belong
         * to which block, meaning the outer brackets are required. If you see
         * error messages about 'cannot read properties of undefined' with
         * a traceback to the chat() function below, it's very likely indeed
         * that it's because you forgot an outer bracket. To solve this, print
         * out the list with this line:
         * 
         * consoleLog(this.possibleChat) 
         * 
         * And look for [[null]] or undefined. That's your culprit.
         * 
         * As for the delayFromBeginning, that's in miliseconds. And it's from
         * the beginning, NOT from the last message in the stack.
         *//*
    }
    
    /**
     * Does the actual chatting. Will chat something random from this.possibleChat.
     *//*
    chat(){
        let idx = Randomizer.nextInt(0, this.possibleChat.length - 1);
        let chatObj = this.possibleChat[idx];
        if(chatObj == undefined){
            return;
        }
        for(let i = 0; i < chatObj.length; i++){
            if(chatObj[i][1] == undefined){
                if(typeof chatObj[i][0] != "string"){
                    throw new TypeError("Chat object at index " + idx + " is undefined!");
                }
                if(scope.extraMeanMode == true){
                    chatObj[i][0] = chatObj[i][0].replaceAll("Him ", "You ").replaceAll("Her ", "You ").replaceAll(" him ", " you ").replaceAll(" her ", " you ").replaceAll(" he ", " you ").replaceAll("She ", "You ").replaceAll("He ", "You ").replaceAll(" she ", " you ").replaceAll(" his ", " your ").replaceAll(" hers ", " your ").replaceAll("himself", "yourself").replaceAll("herself", "yourself").replaceAll("he's", "you've").replaceAll("she's", "you've");
                }
                botChat(chatObj[i][0]);
            }else{
                scope.setTimeout(botChat, chatObj[i][1], chatObj[i][0]);
            }
        }
    }
    
}
*/
class Army {
    /**
     * @param {array} units - An array of units.
     */
    constructor(units){
        if(typeof units != "object"){
            throw new TypeError("Army constructor: You cannot pass type " + typeof units + "!");
        }
        if(time > 5 && units.length <= 0){
            throw new TypeError("Army constructor: You must pass at least one unit to new Army()!");
        }
        units = units.slice();
        this.mission = "unassigned";
        this.canBeDeleted = true;
        this.unitsByID = {};//Object of all units in the army, using their unitID's.
        this.armyID = generateID();
        this.unitArr = units;
        
        this.canRetreat = true;
        this.urgentRetreat = false;
        
        this.canBeCombinedInto = true;//If the army can accept units from other armies;
        this.canCombineInto = true;//If the army's units can be combined into other armies
        
        this.secOfCreation = JSON.parse(JSON.stringify(time));
        
        this.center = scope.getCenterOfUnits(units);
        this.closeEnemies = [];//Will be populated later
        this.enCenter = {x: -999999, y: -999999};//Updated later
        this.armyUnits = units.filter(u => u.getTypeName() != "Airship");;
        this.targetedArr = [];//Will be populated later
        
        
        scope.allArmiesByID[this.armyID] = this;
        
        //Adds the units to this.unitsByID
        let ul = units.length;
        for(let i = 0; i < ul; i++){
            let unit = units[i];
            if(unit != undefined){
                this.unitsByID[unit.getUnitID()] = unit;
            }
        }
        
        Army.findMultipleReferenced();
    }

    /**
     * Launches an attack at a specific location.
     */
    attack(loc){
        if(loc == undefined || loc.x == undefined || loc.y == undefined){
            throw new TypeError("army.attack: You must pass a valid attack object {x: x, y: y}! Received: " + JSON.stringify(loc) )
        }
        scope.order("AMove", this.unitArr, loc);
        this.attackLoc = loc;
    }

    /**
     * Cleans out dead units from the army.
     * Also updates unitArr to match.
     */
    clean(){
        this.unitArr = [];
        for(let id in this.unitsByID){
            let unit = this.unitsByID[id];
            if(unit.getValue("hp") <= 0){
                delete this.unitsByID[id];
            }else{
                this.unitArr.push(unit);
            }
        }
    }

    /**
     * Removes units. 
     * 
     * @param {integer} num - the number of units to remove from the army. 
     */
    removeUnits(num){
        //scope.chatMsg("Removed " + num + " units from an army.");
        let ids = Object.keys(this.unitsByID);
        let deletedUnits = [];
        if(num > ids.length){
            num = ids.length;
        }//If too many units are passed
        
        for(let i = 0; i < num; i++){
            deletedUnits.push(this.unitsByID[ids[i]])
            delete this.unitsByID[ids[i]];
        }
        
        this.clean();

        return deletedUnits;
    }

    /**
     * Adds units.
     * 
     * @param {array} arr - an array of units to be added into the army
     */
    addUnits(arr){
        if(arr.length <= 0){
            return;
        }
        let al = arr.length;
        for(let i = 0; i < al; i++){
            if(arr[i] != undefined){
                this.unitsByID[arr[i].getUnitID()] = arr[i];
            }
        }
        this.clean();
        //scope.chatMsg("After adding units, there are " + Object.keys(this.unitsByID).length + " units in the army.");
    }

    /**
     * Keeps the units of an army bunched together using standard deviation.
     */
    keepTogether(){
        let unitArr = this.unitArr.filter(u => u.getCurrentOrderName() != "Moveto");
        if(this.mission == "airshipStuff"){
            unitArr = [];
            this.unitArr.forEach(u => u.getTypeName() == "Airship" && unitArr.push(u));
        }//If we're the airship squad, just make sure the airships are together.
        
        let center = scope.getCenterOfUnits(unitArr);

        
        if(unitArr.length == 0){
            //If there are no units, return.
            return;
        }else if(unitArr.length == 1){
            //If there's one unit, just get it's position
            this.SDCenter = {x: unitArr[0].getX(), y: unitArr[0].getY()};
            return;
        }else if(unitArr.length <= 3){
            //If there are three units (standard deviation needs at least 4)
            this.SDCenter = center;
            return;
        }
        
        let raiders = this.unitArr.filter(u => u.getTypeName() == "Raider");
        let avgCenter = scope.getCenterOfUnits(this.unitArr);
        if(this.mission == "assault" && this.closeEnemies?.length == 0 && raiders.length != this.unitArr.length){
            //Because raiders are so fast, they will oftentimes outrun the other units in their army.
            raiders.forEach(raider => {
                if(distanceFormula(avgCenter.x, avgCenter.y, raider.getX(), raider.getY()) > this.unitArr.length * 1.2){
                    scope.order("Move", [raider], avgCenter);
                }
            });
        }
        
        if((this.mission == "permadefend" || this.mission == "defend") && scope.isUnderAttack == true){
            //Don't keep together if we're defending
            return;
        }

        //Adds up the total distance, then finds the mean
        let sum = 0;
        unitArr.forEach(unit => sum += distanceFormula(unit.getX(), unit.getY(), center.x, center.y));
        let average = sum / unitArr.length;

        //Calculates varience
        let sumOfSquares = 0;
        let varienceArr = [];//Parallel to unitArr
        unitArr.forEach(unit => {
            //let curVarience = (octile(Math.abs(unit.getX() - center.x), Math.abs(unit.getY() - center.y)) - average) ** 2;
            let curVarience = (distanceFormula(unit.getX(), unit.getY(), center.x, center.y) - average) ** 2;
            sumOfSquares += curVarience;
            varienceArr.push(curVarience);
        });
        
        let varience = sumOfSquares / unitArr.length

        //Finds the standard deviation
        let standardDeviation = Math.sqrt(varience);

        //Standard deviation center; based off of the army's largest grouping of units
        let mainGroup = [];
        varienceArr.forEach((v, i) => Math.sqrt(v) <= (standardDeviation * 1.25) && mainGroup.push(unitArr[i]))
        this.SDCenter = scope.getCenterOfUnits(mainGroup);

        //scope.chatMsg(getMyColor() + ": An army with the mission of " + this.mission + " has a standard deviation of " + Math.round(standardDeviation));

        //If there are too many deviants, order them back into position
        
        let max = (unitArr.length) * (this.mission != "permadefend" ? 1.4 : 0.3);//Give them a bit of a buffer

        if(standardDeviation > max && this.mission != "retreat"){
            let outliers = [];
            let mainBody = [];

            //d = distance
            //If the unit is outside of the standard deviation, push it into outliers
            //let ceiling = Math.ceil(3 + (unitArr.length / 2));
            let ceiling = standardDeviation;
            varienceArr.forEach((v, i) => Math.sqrt(v) > ceiling ? outliers.push(unitArr[i]) : mainBody.push(unitArr[i]));
            
            if(outliers.length > 0){
                if(isEnemyAroundBuilding(outliers[0]) == true || isEnemyAroundBuilding(outliers[outliers.length - 1]) == true){
                    //If the deviating units are under attack, don't force them back; fight back, then rejoin the comrades.
                    //Note that using AMove can cause other issues, like the main army not being where it was 10 seconds ago.
                    scope.order("AMove", outliers, this.SDCenter);
                    //scope.chatMsg("Since we are under attack, " + outliers.length + " units will AMove.")
                }else{
                    //If the deviating units are not under attack, make sure they can follow the main army.
                    if(this.mission != "assault"){
                        scope.order("Move", outliers, this.SDCenter);
                    }else{
                        let outlierCenter = scope.getCenterOfUnits(outliers);
                        let outlierDist = distanceFormula(outlierCenter.x, outlierCenter.y, this.attackLoc.x, this.attackLoc.y);
                        let mainDist = distanceFormula(this.SDCenter.x, this.SDCenter.y, this.attackLoc.x, this.attackLoc.y);
                        
                        if(mainDist < outlierDist && outliers.length > mainBody.length / 4){
                            //Move the main body back if there are significant reinforcemennts
                            scope.order("Moveto", mainBody, {unit: outliers[0]});
                        }else{
                            scope.order("Moveto", outliers, {unit: mainBody[0]});
                        }
                        scope.order("AMove", outliers, this.attackLoc, true);
                    }
                    //scope.chatMsg("Since we aren't being attacked, " + outliers.length + " units will Moveto unit " + mainBody[0]?.getUnitID() + ".")
                }
            }
        }else{
            if(standardDeviation < max){
                if(this.mission == "assault"){
                    scope.order("AMove", unitArr, this.attackLoc);
                }
            }
        }
        //consoleLog("An army with mission of " + this.mission + " has a SD center of " + JSON.stringify(this.SDCenter) + ".")
    }

    /** 
     * Plans and executes an attack.
     */
    static planAndAttack(){
        let main = scope.garrison;
        main.clean();
        if(main == undefined || main.unitArr.length < 1){
            return;
        }

        let attackArmy;
        if(main.unitArr.length < 6 || Randomizer.nextBoolean(0.45)){
            //Attack the same location with all units
            let army = new Army(main.removeUnits(Infinity));
            let loc = Us.getRandAttackLoc();
            army.attack(loc);
            army.mission = "assault";
            scope.allArmiesByID[army.armyID].mission = "assault";

            attackArmy = army;

        }else{
            //Attacks two different locations with units.

            //Run-by army (smaller)
            let deletedUnits = main.removeUnits(Randomizer.nextInt(2, Math.floor(main.unitArr.length / 2)));//takes part of the army
            let army1 = new Army(deletedUnits);
            army1.attack(Us.getRandAttackLoc());
            
            army1.mission = "assault";
            scope.allArmiesByID[army1.armyID].mission = "assault";

            //Main army (larger)
            let deletedUnits2 = main.removeUnits(Infinity);//empties out the rest of the army
            let army2 = new Army(deletedUnits2);
            army2.attack(Us.getRandAttackLoc());
            army2.mission = "assault";
            scope.allArmiesByID[army2.armyID].mission = "assault";

            attackArmy = army2;
        }
        main.clean();

        //If we have other armies (ew), send them to the attacking armies so they can combine
        for(let id in Army.allArmiesByID){
            let army = Army.allArmiesByID[id];
            if(army.canCombineInto == true && army.mission != "assault" && army.mission != "scout" && (army.mission == "defend" && scope.underAttack == false)){
                let units = army.unitArr.slice();
                let army2 = new Army(army.removeUnits(Infinity));
                army2.mission = "reinforcing";
                scope.order("AMove", units, army2.SDCenter == undefined ? scope.getCenterOfUnits(army2.unitArr) : army2.SDCenter);
            }
        }
        
        if(Randomizer.nextBoolean(0.05)){
            let units = scope.getUnits({player: me});
            
            let enemyNr;
            let myTeam = scope.getMyTeamNumber();
            let players = scope.getArrayOfPlayerNumbers();
            
            for(let i = 0; i < 500; i++){
                enemyNr = players[Math.floor(scope.getRandomNumber(0, players.length - 1))];
                
                if(isFinite(scope.getTeamNumber(enemyNr)) == true && scope.getTeamNumber(enemyNr) != myTeam){
                    break;
                }
            }
            scope.order("AMove", units, scope.getStartLocationForPlayerNumber(enemyNr));
            
            scope.order("Train Worker", scope.getBuildings({"type": "Castle", player: me}));
        }
    }
    
    /**
     * Removes the army from existance
     */
    selfTerminate(){
        delete scope.allArmiesByID[this.armyID];
        this.clean();
    }

    /**
     * Moves the army back.
     * Calls kiteCycle2() if all conditions are met.
     */
    kiteCycle1(){

        consoleLog("kite cycle 1");
        this.kiteCycling = true;

        let targetedArr = this.targetedArr;
        let armyUnits = this.armyUnits;
        let enCenter = this.enCenter;
        let myCenter = this.center;
        let closeEnemies = this.closeEnemies;

        if(enCenter == undefined || typeof enCenter != "object" || armyUnits == undefined || this.kiteCycling == false || scope.allArmiesByID[this.armyID] == undefined || closeEnemies.length == 0 || myCenter == undefined){
            this.kiteCycling = false;
            scope.order("Stop", this.unitArr);
            //If we don't need to kite anymore
            return;
        }

        let delay = 0;
        //this.unitArr.forEach(unit => delay = Math.max((unit.getValue("weaponCooldown") - unit.getValue("hitCycle")), delay));

        let closeUnits = [];
        let max = 10 + (armyUnits.length + closeEnemies.length) / 2;
        armyUnits.forEach(unit => octileCoords(unit.getX(), unit.getY(), enCenter.x, enCenter.y) < max && closeUnits.push(unit));

        const center = scope.getCenterOfUnits(closeUnits);

        const dx = center.x - enCenter.x;
        const dy = center.y - enCenter.y;
        
        const hypot = Math.sqrt(dx**2 + dy**2);
        const len = 15;
        //armyUnits.forEach(unit => len = Math.max((unit.getValue("weaponCooldown") - unit.getValue("hitCycle")) * unit.getFieldValue("movementSpeed")));
        const dx2 = len * (dx / hypot);
        const dy2 = len * (dy / hypot);

        let closePathable = Graph.findNearestPathableNode(Math.floor(center.x + dx2), Math.floor(center.y + dy2));

        let path = [];
        if(closePathable != undefined){
            path = astar.search(scope.mapNodes, scope.mapNodes.getNodeAt(Math.floor(center.x), Math.floor(center.y)), closePathable);
        }

        let retreatTo;

        if(path.length > 0){
            let goodNode = path.find(node => {
                let dist = distanceFormula(node.x, node.y, center.x, center.y);
                return dist > 4 && dist < 6;
            });
            if(isFinite(goodNode)){
                retreatTo = {x: goodNode.x, y: goodNode.y};
            }//If it is undefined, we're in a corner, so do as much damage as possible before dying
        }else{
            return;
        }
        

        closeUnits.forEach((unit) => {
            //scope.order("Move", [unit], {x: unit.getX() + dx2, y: unit.getY() + dy2});
            if(retreatTo == undefined){
                scope.order("Move", [unit], {x: center.x + dx2, y: center.y + dy2});
            }else{
                scope.order("Move", [unit], retreatTo);
            }

            //delay = Math.max(Math.abs(unit.getValue("hitCycle") - unit.getFieldValue("weaponCooldown")), delay);
            delay = Math.max(Math.abs(unit.getFieldValue("weaponCooldown")), delay);
        });

        delay *= 50;

        consoleLog("1 -> 2 delay: " + delay);

        scope.setTimeout(function(army){
            army.kiteCycle2.call(army);
        }, delay, this);
    }

    /**
     * Asynchronous function. Moves the kiting units back to their original location.
     * Calls kiteCycle1() if all conditions are met.
     */
    kiteCycle2(){
        consoleLog("kite cycle 2");
        let armyUnits = this.armyUnits;
        let enCenter = this.enCenter;

        if(enCenter == undefined || armyUnits == undefined || this.kiteCycling == false || scope.allArmiesByID[this.armyID] == undefined){
            this.kiteCycling = false;
            scope.order("Stop", this.unitArr);
            //If we don't need to kite anymore
            return;
        }
        scope.order("AMove", armyUnits, enCenter);

        //Once done with the kite, what to pick off
        let focusFire;
        let lowest = 99999999;
        this.closeEnemies.forEach(enemy => {
            if(enemy.getValue("hp") < lowest){
                lowest = enemy.getValue("hp");
                focusFire = enemy;
            }
        });
        armyUnits.forEach(u => u.getFieldValue("range") > 1 && scope.order("Attack", [u], {"unit": focusFire}));
        
        let delay = 0;
        armyUnits.forEach(unit => delay = Math.max(unit.getFieldValue("weaponDelay"), delay));
        delay *= 50;
        delay += 50;

        consoleLog("2 -> 1 delay: " + delay);

        scope.setTimeout(function(army){
            army.kiteCycle1.call(army);
        }, delay, this);
    }

    /**
     * Determines whether the army should kite, retreat, or stay in position, then passes out orders accordingly.
     */
    kiteAndRetreat(){
        let KAR_Debug = {};
        if(this.unitArr.length == 0 || this.mission == "airshipStuff"){
            //Airships have their own special logic
            return;
        }
        let opfor = 0;
        let armyUnits = this.unitArr.filter(u => u.getTypeName() != "Airship");
        let myCenter; 
        if(armyUnits.length == 1){
            myCenter = {x: armyUnits[0].getX(), y: armyUnits[0].getY()};
        }else if(armyUnits.length < 5){
            let assaulted = armyUnits.find(u => isEnemyAroundBuilding(u));
            myCenter = assaulted == undefined ? scope.getCenterOfUnits(armyUnits) : {x: assaulted.getX(), y: assaulted.getY()};
        }else{
            myCenter = (this.SDCenter == undefined || this.SDCenter.x == null || this.SDCenter.y == null) ? scope.getCenterOfUnits(armyUnits) : this.SDCenter;
        }
        //const myCenter = scope.getCenterOfUnits(armyUnits);

        this.numUnits = armyUnits.length;
        
        let start = new Date().getTime();
        enemyUnits = scope.getUnits({enemyOf: me});
        for(let i = enemyUnits.length - 1; i > -1; i--){
            enemyUnits[i].isNeutral() && enemyUnits.splice(i, 1);
        }
        
        KAR_Debug["filterNeutral"] == undefined ? KAR_Debug["filterNeutral"] = new Date().getTime() - start : KAR_Debug["filterNeutral"] += new Date().getTime() - start;

        start = new Date().getTime();
        //Gets the enemy units that are within 20 tiles, then increases the opfor by the combat power of the enemy units.
        let closeEnemies = [];
        enemyUnits.forEach(function(unit){
            if(distanceFormula(unit.getX(), unit.getY(), myCenter.x, myCenter.y) < 10 + enemyUnits.length + armyUnits.length){
                closeEnemies.push(unit) 
                opfor += scope.getPowerOf(unit);
            }
        });
        
        let towers = scope.getBuildings({enemyOf: me, type: "Watchtower"});
        //Adds four combat power for each watchtower
        towers.forEach(tower => {
            if(distanceFormula(tower.getX(), tower.getY(), myCenter.x, myCenter.y) < 8){
                opfor += 4;
            }
        });

        KAR_Debug["findCloseEnemey"] == undefined ? KAR_Debug["findCloseEnemey"] = new Date().getTime() - start : KAR_Debug["findCloseEnemey"] += new Date().getTime() - start;
        
        if(opfor <= 0){
            this.closeEnemies = [];
            return;
        }

        start = new Date().getTime();
        let myPower = 0;
        for(let id in this.unitsByID){
            myPower += scope.getPowerOf(this.unitsByID[id]);
        }
        
        this.power = myPower;

        KAR_Debug["findMyPower"] == undefined ? KAR_Debug["findMyPower"] = new Date().getTime() - start : KAR_Debug["findMyPower"] += new Date().getTime() - start;   
        /*
        //Gets catas
        let enemyCatas = [];
        closeEnemies.forEach(unit => unit.getTypeName() === "Catapult" ? enemyCatas.push(unit) : null);
        */

        let numRetreatingUnits = 0;
        closeEnemies.forEach(unit => {
            if(unit.getCurrentOrderName() === "Move" || unit.getCurrentOrderName() === "Moveto"){
                numRetreatingUnits++;
            }
        });
        
        let retreatThreshold = myPower * 1.1;
        if(fightingUnits.length < 6){
            retreatThreshold -= myPower * 0.25;
        }
        scope.baseMeta == "Barracks" ? retreatThreshold += myPower * 0.15 : retreatThreshold += 0;
        if(scope.underAttack === true && (this.mission == "defend" || this.mission == "permadefend")){
            retreatThreshold = myPower * 1.75;
        }//Will very agressively defend
        
        if(this.mission == "retreat"){
            retreatThreshold *= 2/3;
        }//If we're retreating, be very careful about engaging enemies

        start = new Date().getTime();
        const enCenter = scope.getCenterOfUnits(closeEnemies);
        KAR_Debug["findEnCenter"] == undefined ? KAR_Debug["findEnCenter"] = new Date().getTime() - start : KAR_Debug["findEnCenter"] += new Date().getTime() - start;
        
        
        start = new Date().getTime();
        let mustKites = [];
        armyUnits.forEach((unit) => {
            const name = unit.getTypeName();
            (name === "Gatling Gun" || name === "Archer") && mustKites.push(unit);
        });//Things that have to kite or else, like raiders
        
        let didKite = false;
        KAR_Debug["findMustKites"] == undefined ? KAR_Debug["findMustKites"] = new Date().getTime() - start : KAR_Debug["findMustKites"] += new Date().getTime() - start;

        start = new Date().getTime();
        let isBeingTargeted = false;
        let targetedArr = [];
        let numRangedTargeted = 0;
        for(let i = 0; i < armyUnits.length; i++){
            let mId = armyUnits[i].getUnitID();
            //distanceFormula(unit.getX(), unit.getY(), enCenter.x, enCenter.y) < 7 ? closeUnits.push(unit) : null;

            let isTargeted = closeEnemies.some(u2 => (u2.getValue("targetUnit")?.id === mId || u2.getValue("provisionalTargetUnit")?.id === mId));

            if(isTargeted){
                isBeingTargeted = true;
                targetedArr.push(armyUnits[i]);
                consoleLog("Range of a " + armyUnits[i].getTypeName() + ": " + armyUnits[i].getFieldValue("range"));
                if(armyUnits[i].getFieldValue("range") > 1){
                    numRangedTargeted++;
                }
            }
        }
        KAR_Debug["isBeingTargeted"] == undefined ? KAR_Debug["isBeingTargeted"] = new Date().getTime() - start : KAR_Debug["isBeingTargeted"] += new Date().getTime() - start;

        /*
        consoleLog("Army " + this.armyID + " with misssion of " + this.mission + " that has existed for " + (scope.getCurrentGameTimeInSec() - this.secOfCreation) + " seconds is using logic.");
        consoleLog(isBeingTargeted == true);
        consoleLog(closeEnemies.length != numRetreatingUnits);
        consoleLog(mustKites.length >= Math.floor(armyUnits.length / 2));
        consoleLog(opfor < retreatThreshold);
        consoleLog(opfor > myPower * 0.2);
        */

        if(this.mission == "retreat" && opfor < retreatThreshold * 1.25){
            this.urgentRetreat = false;
        }
        
        if(this.mission == "retreat" && opfor < retreatThreshold * 1.2 && opfor > 2){
            consoleLog("We are moving to engage weakness.")
            scope.order("AMove", this.unitArr, myCenter);
        }
        
        this.center = myCenter;
        this.closeEnemies = closeEnemies;
        this.enCenter = enCenter;
        this.armyUnits = armyUnits;
        this.targetedArr = targetedArr;
        
        this.doRaiderStuff();
        

        if(
           isBeingTargeted == true 
           && closeEnemies.length != numRetreatingUnits 
           && mustKites.length >= Math.floor(armyUnits.length / 2) 
           && opfor < retreatThreshold 
           && opfor > myPower * 0.2
           && numRangedTargeted > 0
           ){
               
            start = new Date().getTime();
            if(this.kiteCycling != true){
                this.kiteCycle1();
            }

            KAR_Debug["kiting"] == undefined ? KAR_Debug["kiting"] = new Date().getTime() - start : KAR_Debug["kiting"] += new Date().getTime() - start;
        }else{
            this.enCenter = undefined;
            this.kiteCycling = false;
        }
        
        if(opfor >= retreatThreshold && this.canRetreat == true){
            
            let start = new Date().getTime();

            if(this.kiteCycling == true){
                this.enCenter = undefined;
                this.kiteCycling = false;
            }
            //scope.chatMsg(myPower.toFixed(2) + " is inferior to " + opfor.toFixed(2) + ", which is over the retreat threshold of " + retreatThreshold.toFixed(2));
            //Retreating
            if(trainingModeOn === true && scope.underAttack === false && scope.firstBeatMessageSent == undefined){
                //Gives encouragement for the player if they beat the first attack.
                scope.firstBeatMessageSent = true;
                scope.chatMsg("Nice, you beat my first attack!");
                scope.setTimeout(function(){
                    scope.chatMsg("Now, try and counterattack. Because I lost a good chunk of my troops, you should be able to make some good trades or at least gain map control.");
                }, 4000);
            }

            
            let retreatUnits = [];
            this.unitArr.forEach(u => u.getCurrentOrderName() != "Moveto" && u.getTypeName() != "Airship" && retreatUnits.push(u));
            consoleLog("Retreating with " + retreatUnits.length + " units!");
            if(retreatUnits.length > 0 && this.mission != "permadefend" && this.mission != "defend" && this.mission != "airshipStuff"){
                if(this.mission != "retreat"){
                    //Get everyone outta here if we aren't already retreating
                    this.mission = "retreat";
                    let build = exfil(retreatUnits);
                    if(build != undefined){
                        this.attackLoc = {x: build.getX(), y: build.getY()};
                    }
                    retreatUnits = [];
                }
                return;
            }
            this.urgentRetreat = true;
            
            if(retreatUnits.length > 0){
                let build = exfil(retreatUnits);
                if(build != undefined){
                    this.attackLoc = {x: build.getX(), y: build.getY()};
                }
            }
            KAR_Debug["retreating"] == undefined ? KAR_Debug["retreating"] = new Date().getTime() - start : KAR_Debug["retreating"] += new Date().getTime() - start;
        }
        
        if(this.kiteCycling != true){
            start = new Date().getTime();
            let targetedUnits = [];
            mustKites.forEach((unit) => {
                let mId = unit.getUnitID();
                //distanceFormula(unit.getX(), unit.getY(), enCenter.x, enCenter.y) < 7 ? closeUnits.push(unit) : null;
                
                //Finds if the current unit is being targeted
                /** tests whether at least one element in the array passes the 
                 * test implemented by the provided function. 
                 * It returns true if, in the array, it finds an element for 
                 * which the provided function returns true; otherwise it returns false.
                 * It doesn't modify the array.
                 */

                let isTargeted = enemyUnits.some(unit2 => (unit2.getValue("targetUnit")?.id === mId && unit2.getFieldValue("range") > 1));

                if(isTargeted){
                    targetedUnits.push(unit);
                }
            });

            const center = myCenter;

            const dx = center.x - enCenter.x;
            const dy = center.y - enCenter.y;
            
            const hypot = Math.sqrt(dx**2 + dy**2);
            const len = 1;
            const dx2 = len * (dx / hypot);
            const dy2 = len * (dy / hypot);

            targetedUnits.forEach((unit) => {
                /*
                scope.order("Move", [unit], {x: unit.getX() + dx2, y: unit.getY() + dy2});
                scope.order("AMove", [unit], center, true);*/

                //unit.getX() + dx2, unit.getY() + dy2,
                scope.order("Move", [unit], {x: unit.getX() + dx2, y: unit.getY() + dy2});
                
                scope.setTimeout(function(unit, backTo){
                    scope.order("AMove", [unit], backTo, true);
                }, (unit.getValue("weaponCooldown") - unit.getValue("hitCycle")) * 50, unit, center);
            });
            KAR_Debug["pullingTargeted"] == undefined ? KAR_Debug["pullingTargeted"] = new Date().getTime() - start : KAR_Debug["pullingTargeted"] += new Date().getTime() - start;
        }
    }
    
    /**
     * Raider micro.
     * Controls the use of Flash, raider pullback, and raider kiting.
     */
    doRaiderStuff(){
        let raiders = this.unitArr.filter(u => u.getTypeName() == "Raider");
        raiders.forEach(raider => {
            let mID = raider.getUnitID();
            let numTargeting = 0;
            this.closeEnemies.forEach(e => e.getValue("targetUnit")?.id == mID ? numTargeting++ : null);
            
            if(raider.getValue("hp") > ((fightingUnits.length > 4) ? raider.getFieldValue("hp") * 0.3 : raider.getFieldValue("hp") * 0.5)){
                if(numTargeting > 2){
                    //If we are surrounded, flash out
                    const dx = this.center.x - this.enCenter.x;
                    const dy = this.center.y - this.enCenter.y;
                    
                    const hypot = Math.sqrt(dx**2 + dy**2);
                    const len = 5;
                    const dx2 = len * (dx / hypot);
                    const dy2 = len * (dy / hypot);
                    
                    scope.order("Flash", [raider], {x: raider.getX() + dx2, y: raider.getY() + dy2});
                }else{
                    let canFire = Math.ceil(scope.getCurrentGameTimeInSec() * 20) - raider.getValue("tickOfLastWeaponFired") >= raider.getFieldValue("weaponCooldown") - raider.getFieldValue("weaponDelay");
                    if(canFire){
                        let closest = getClosestTo(this.closeEnemies, {x: raider.getX(), y: raider.getY()});
                        
                        if(closest != undefined){
                            let max = distanceFormula(closest.getX(), closest.getY(), raider.getX(), raider.getY()) + 1;
                            
                            let potentialTargets = this.closeEnemies.filter(u => octileCoords(u.getX(), u.getY(), raider.getX(), raider.getY()) < max);
                            
                            let bestScore = -99999;
                            let target;
                            if(potentialTargets.length > 0){
                                potentialTargets.forEach(u => {
                                    let score = 0;
                                    score -= u.getValue("hp");
                                    if(score > bestScore){
                                        bestScore = score;
                                        target = u;
                                    }
                                });//TODO: add some additional logic here
                            }
                            
                            let dist = target == undefined ? -1 : distanceFormula(target.getX(), target.getY(), raider.getX(), raider.getY());
                            if(dist > 2 && dist < 4 && target.getValue("hp") <= 51 && raider.getValue("mana") >= 25){
                                //If we can one-shot the target unit
                                scope.setTimeout(function(r, x, y){
                                    scope.order("Move", [r], {x: x, y: y});
                                }, (raider.getFieldValue("weaponDelay") * 50) + 50, raider, raider.getX(), raider.getY());
                                scope.order("Flash", [raider], {x: target.getX(), y: target.getY()});
                            }else if(target != undefined){
                                //If we can't, just move in for a stabby stab
                                scope.order("Attack", [raider], {unit: target});
                                
                                //Move back after doing damage
                                const dx = raider.getX() - target.getX();
                                const dy = raider.getY() - target.getY();
                                
                                const hypot = Math.sqrt(dx**2 + dy**2);
                                const len = 3;
                                const dx2 = len * (dx / hypot);
                                const dy2 = len * (dy / hypot);
                                scope.order("Move", [raider], {x: raider.getX() + dx2, y: raider.getY() + dy2}, true);
                            }
                        }
                    }else if(numTargeting > 0 && this.closeEnemies.length > 0){
                        let target = getClosestTo(this.closeEnemies, {x: raider.getX(), y: raider.getY()});
                        
                        const dx = raider.getX() - target.getX();
                        const dy = raider.getY() - target.getY();
                        
                        const hypot = Math.sqrt(dx**2 + dy**2);
                        const len = 6;
                        const dx2 = len * (dx / hypot);
                        const dy2 = len * (dy / hypot);
                        
                        scope.order("Move", [raider], {x: raider.getX() + dx2, y: raider.getY() + dy2});
                    }
                }
            }else{
                //If we're too damaged, retreat
                consoleLog("We are retreating with a raider.");
                
                delete this.unitsByID[raider.getUnitID()];
                this.clean();
                
                let army = new Army([raider]);
                army.mission = "retreat";
                exfil([raider]);
            }
        });
    }

    /**
     *  Manages worker line rushes and returns evacuated workers 
     */
    static manageWorkers(){
        let mines = getMyMinedMines();

        mines.forEach(mine => {
            let closestCastle = getClosestTo(myBuilds["CastleAndFortresses"], {x: mine.getX() + 1, y: mine.getY() + 1});
            //If the mine is close to the castle
            if(distanceFormula(closestCastle.getX() + 1.5, closestCastle.getY() + 1.5, mine.getX() + 1, mine.getY() + 1) < 12){ 
                let closeEnemies = getEnemiesAroundBuilding(mine, 12);
                if(closeEnemies.length > 0 && isEnemyAroundBuilding(closestCastle, 10) && time > 120){
                    //If there are enemies present
                    let mineX = mine.getX();
                    let mineY = mine.getY();
                    let closeWorkers = [];
                    miningWorkers.forEach(worker => distanceFormula(worker.getX(), worker.getY(), mineX + 1, mineY + 1) < 11 ? closeWorkers.push(worker) : null);
                    
                    let closeUnits = fightingUnits.filter(u => octileCoords(u.getX(), u.getY(), closestCastle.getX(), closestCastle.getY()) < 10)
                    
                    if(closeEnemies.length > closeUnits.length * 3/4 + Math.sqrt(closeWorkers.length) || closeEnemies.some(e => e.getFieldValue("flying") == true && e.getTypeName() != "Airship" && e.getTypeName() != "Bird")){
                        //If there are a ton of enemies, run away.
                        let acceptableSites = [];
                        myBuilds["CastleAndFortresses"].forEach(castle => castle.equals(closestCastle) ? null : acceptableSites.push(castle));
                        if(acceptableSites.length > 0){
                            let evacCastle = getClosestTo(acceptableSites, {x: mineX, y: mineY})
                            let evacSite = getClosestTo(mines, {x: evacCastle.getX(), y: evacCastle.getY()});//A micro trick.
                            //Mining workers cannot be blocked, so by sending them to a goldmine, they cannot be blocked.
                            scope.order("Moveto", closeWorkers, {unit: evacSite});
        
                            closeWorkers.forEach(worker => scope.evacedWorkers[worker.getUnitID()] = {"worker": worker, "evacedFrom": closestCastle});
                            scope.underAttack = true;
                        }
                    }else{
                        //If there aren't a ton of enemies, worker rush those mother truckers
                        let workers = Us.workerRush(scope.getCenterOfUnits(closeEnemies), 17, closeEnemies.length * 3);
                        scope.defenseArmy.addUnits(workers);
                    }
                }
            }
        });//Evacuates workers in the worker line that are close to enemies

        /*
        if(mines.length > 1 && scope.underAttack === false){
            let mineWorkers = [];
            mines.forEach(mine => {
                mineWorkloads.push(mine.getValue[lastWorkerCount]);
            });
            let idealRatio = miningWorkers.length / mines.length;
            let excessWorkers = [];
            mineWorkers.forEach(mineWorkersForMine => {
                if(mineWorkersForMine.length > idealRatio){
                    excessWorkers.push(mineWorkersForMine);
                }
            });
        }//Rearranges inefficent mining practices*/

        if(scope.underAttack === false){
            //Reassigns workers back to their posts after the crisis has passed
            for(let id in scope.evacedWorkers){
                let obj = scope.evacedWorkers[id];
                scope.order("Moveto", [obj.worker], {unit: obj.evacedFrom});
            }
            scope.evacedWorkers = {};
            if(scope.defenseArmy?.unitArr != undefined){
                scope.defenseArmy.unitArr.forEach(unit => {
                    if(unit.getTypeName() == "Worker"){
                        delete scope.defenseArmy.unitsByID[unit.getUnitID()];
                    }
                });
                scope.defenseArmy.clean();
                
                scope.garrison.unitArr.forEach(unit => {
                    if(unit.getTypeName() == "Worker"){
                        delete scope.garrison.unitsByID[unit.getUnitID()];
                    }
                });
                scope.garrison.clean();
            }
        }
    }

    /**
     * Cleans out empty armies and dead units in armies
     */
    static cleanArmies(){
        for(let id in scope.allArmiesByID){
            const army = scope.allArmiesByID[id];
            army.clean();
            if(army.canBeDeleted == true && army.unitArr.length <= 0){
                consoleLog("Deleted an empty army with the mission of " + army.mission);
                army.selfTerminate();
                continue;
            }//Removes armies with no units in them
        }
    }

    /**
     * Updates all armies using complicated logic.
     */
    static updateArmies(){
        let start = new Date().getTime();
        Army.cleanArmies();
        let end = new Date().getTime();
        let diff = end - start;
        if(diff > 2){
            //scope.chatMsg("cleaning armies took " + diff + " milliseconds");
        }
        let nonReferenced = Army.findNonReferenced();
        nonReferenced = nonReferenced.filter(unit => unit.getTypeName() != "Airship");
        let multReferenced = Army.findMultipleReferenced();
        
        if(nonReferenced.length > 0){
            
            let str = "";
            nonReferenced.forEach(u => str += u.getTypeName() + ", ");
            consoleLog("There are " + nonReferenced.length + " non referenced units. Breakdown: ");
            consoleLog(str);
        }
        
        
        let str = "";
        for(let id in scope.allArmiesByID){
            str += scope.allArmiesByID[id].mission + "(" + scope.allArmiesByID[id].unitArr.length + " units)" + ", ";
        }
        consoleLog("Army mission breakdown: " + str);
        
        let foundAssaultArmy = false;
        
        let idleShips = scope.getUnits({type: "Airship", player: me});
        scope.airshipSquad?.addUnits(idleShips);
        
        scope.garrison?.clean();
        
        for(let id in scope.allArmiesByID){
            const army = scope.allArmiesByID[id];
            if(army.mission == "assault"){
                for(let id in army.unitsByID){
                    let unit = army.unitsByID[id];
                    let uTarget = unit.getValue("target");
                    if((unit.getCurrentOrderName() == "Stop" || uTarget == null || uTarget.x != army.attackLoc.x || uTarget.y != army.attackLoc.y) && unit.getTypeName() != "Airship"){
                        scope.order("AMove", [unit], army.attackLoc);
                    }
                }
                if(diff > 2){
                    //scope.chatMsg("Getting lazy units to move took " + diff + " milliseconds.");
                }
                //If units use abilites, they will stop in place and become useless.
                //This reorients them towards their goals.
                
                //In case there's any new production
                let threshold = 0;
                if(scope.numAllies == 0 && scope.numEnemies > 1){
                    //If we have no backup and we're in an FFA where we could
                    //get stabbed in the back, keep some new production in reserve at all times.
                    threshold = myBuilds["CastleAndFortresses"].length * 3;
                    nonReferenced.splice(0, myBuilds["CastleAndFortresses"].length * 2);
                }
                if(nonReferenced.length > threshold && airshipPickedUpUnits == false){
                    /*
                    let army2 = new Army(nonReferenced);
                    army2.attack(army.attackLoc);
                    army2.mission = "reinforcing";
                    nonReferenced = [];*/
                    consoleLog("Adding non referenced.");
                    let nonReferenced2 = Army.findNonReferenced();
                    nonReferenced2 = nonReferenced2.filter(unit => unit.getTypeName() != "Airship");
                    
                    army.addUnits(nonReferenced2);
                    nonReferenced = [];
                    army.clean();
                    
                    foundAssaultArmy = true;
                }

                let center = army.SDCenter == undefined ? scope.getCenterOfUnits(army.unitArr) : army.SDCenter;
                if(distanceFormula(center.x, center.y, army.attackLoc.x, army.attackLoc.y) < 10){
                    army.attack(Us.getRandAttackLoc());
                }//If we've reached our objective, find something else to attack
            }else if(army.mission == "defend"){
                if(scope.attackingFightingUnits.length <= 0 && army.unitArr.length != 0){
                    let unitArr = army.unitArr;
                    let center = army.SDCenter == undefined ? scope.getCenterOfUnits(unitArr) : army.SDCenter;
                    let isHome = myBuilds["CastleAndFortresses"].some(build => {
                        return distanceFormula(center.x, center.y, build.getX() + 1.5, build.getY() + 1.5) < 25;
                    });
                    if(isHome == true){
                        scope.garrison.addUnits(army.removeUnits(Infinity));//Adds the units back into the garrison for defense
                    }else{
                        let foundSuitor = false;
                        for(let id2 in scope.allArmiesByID){
                            let army2 = scope.allArmiesByID[id2];
                            
                            if(army2.mission == "assault"){
                                foundSuitor = true;
                                army2.addUnits(army.removeUnits(Infinity));
                            }
                        }
                        if(foundSuitor){
                            army.clean();
                            continue;
                        }else{
                            exfil(this.unitArr);
                        }
                    }
                }
                //If the army is done defending, put their units into the garrison.
            }else if(army.mission == "retreat"){
                //If the army is retreating
                let unitArr = army.unitArr;
                let center = army.SDCenter == undefined ? scope.getCenterOfUnits(unitArr) : army.SDCenter;
                let isHome = myBuilds["CastleAndFortresses"].concat(myBuilds["Watchtowers"]).some(build => {
                    return distanceFormula(center.x, center.y, build.getX() + 1.5, build.getY() + 1.5) < 20;
                });
                if(isHome == true){
                    scope.garrison.addUnits(army.removeUnits(Infinity));//Adds the units back into the garrison for defense
                    army.selfTerminate();
                    consoleLog("After retreating, we combined the retreating army with the garrison.");
                }else if(army.urgentRetreat == false){
                    let bad = [];
                    unitArr.forEach(u => u.getCurrentOrderName() == "Stop" && bad.push(u));
                    exfil(bad);
                }else if(army.urgentRetreat == true){
                    let bad = [];
                    unitArr.forEach(u => u.getCurrentOrderName() != "Move" && u.getCurrentOrderName() != "Moveto" && bad.push(u));
                    exfil(bad);
                }
            }else if(army.mission == "airshipStuff"){
                if(army.unitArr.length > 0){
                    let units = [];
                    let airships = [];
                    army.unitArr.forEach(u => u.getTypeName() != "Airship" ? units.push(u) : airships.push(u));
                    if(airships.length == 0){
                        scope.garrison.addUnits(units);
                        scope.airshipSquad.unitsByID = {};
                        consoleLog("There are no airships, so we added " + units.length + " units into the garrison.");
                    }//If there's no airships in the airship army, remove the units and put them where they belong
                    army.clean();
                    army.airshipDropLogic();
                }
            }else if(army.mission == "permadefend"){
                
            }else if(army.mission == "reinforcing"){
                
            }else if(army.mission == "scout"){
                let scouter = army.unitArr[0];
                if(scouter != undefined){
                    if(scouter.getCurrentOrderName() == "Stop"){
                        delete scope.allArmiesByID[army.armyID]
                        Us.scout(scouter);
                    }
                }
            }else{
                consoleLog("There is an army that does not have a valid mission. Recieved mission: " + army.mission + ", army id: " + army.armyID)
            }

            //Combines armies that are close to each other
            if(army.canBeDeleted == true && army.secOfCreation + 15 > scope.getCurrentGameTimeInSec() && army.mission != "Scout" && army.canCombineInto == true){
                let thisCenter = scope.getCenterOfUnits(army.unitArr);
                let thisArmy = army.unitArr;
                for(let id in scope.allArmiesByID){
                    let oArmy = scope.allArmiesByID[id];
                    let oArmyUnits = oArmy.unitArr;
                    if(oArmyUnits.length <= 0 || oArmy.canBeCombinedInto == false){
                        continue;
                        //If the army does not have units or cannot be combined into, then it cannot be combined.
                    }
                    let oCenter = scope.getCenterOfUnits(oArmyUnits);
                    
                    if(distanceFormula(thisCenter.x, thisCenter.y, oCenter.x, oCenter.y) < 15 + army.unitArr.length + oArmy.unitArr.length){
                        if(oArmyUnits.length > thisArmy.length){
                            //If the other army has more units, add our units into their command
                            oArmy.addUnits(army.removeUnits(Infinity));
                            army.clean();
                            oArmy.clean();
                            consoleLog(getMyColor() + ": Combined an army with mission of " + army.mission + " into another army with mission of " + oArmy.mission);
                        }
                        //Otherwise, wait until we reach toe other army in the for loop
                    }
                }
            }

            if(time % 2 == 0){
                //Order deviants back into place every 2 seconds
                army.keepTogether();
            }
            
            //Every 60 seconds conduct another drop
            if(scope.myPower >= 3 && scope.lastTimeDropped + 30 < time && scope.getCurrentGameTimeInSec() > 5){
                Army.conductDrop();
                
                scope.lastTimeDropped = time;
            }
        }
        consoleLog("airshipPickedUpUnits: " + airshipPickedUpUnits)
        if(foundAssaultArmy == false && nonReferenced.length > 0 && airshipPickedUpUnits == false){
            consoleLog("Adding non referenced.");
            let nonReferenced2 = Army.findNonReferenced();
            nonReferenced2 = nonReferenced2.filter(unit => unit.getTypeName() != "Airship");
            scope.garrison?.addUnits(nonReferenced2);
        }
    }

    /**
     * A very general, somewhat resource-intensive function.
     * Currently: 
     * -Controls worker scouts
     * -Controls mech-specific stuff
     * -Targets enemy repairers/miners
     * -Produces birds when there are priests
     * -Controls airships
     */
    static armyBrain(){

        //Worker scouting
        if(fightingUnits.length < 1){
            if(scope.workerScout != undefined){
                let angryEnemyWorkers = scope.getUnits({type: "Worker", order: "AMove", enemyOf: me});
                angryEnemyWorkers = angryEnemyWorkers.concat(scope.getUnits({type: "Worker", order: "Attack", enemyOf: me}));

                if(scope.workerScout.getValue("hp") <= scope.workerScout.getFieldValue("hp") * 0.35){
                    let closeMine = getClosestTo(scope.getBuildings({type: "Goldmine"}), {x: myBuilds["CastleAndFortresses"][0].getX(), y: myBuilds["CastleAndFortresses"][0].getY()});
                    scope.order("Mine", [scope.workerScout], {x: closeMine.getX(), y: closeMine.getY()}); 
                    //When workers mine, they cannot be blocked.
                    if(trainingModeOn === true){
                        scope.chatMsg("Congratulations! You beat my worker scout!");
                    }
                    scope.workerScout = undefined;//makes sure the worker doesn't try any funny buisness anymore
                }else if(scope.workerScout.getValue("hp") < scope.workerScout.getFieldValue("hp") && angryEnemyWorkers.length > 0){
                    let isClose = false;
                    for(let i = 0; i < angryEnemyWorkers.length; i++){
                        if(distanceFormula(angryEnemyWorkers[i].getX(), angryEnemyWorkers[i].getY(), scope.workerScout.getX(), scope.workerScout.getY()) < 2){
                            isClose = true;
                            break;
                        }
                    }
                    if(isClose === true){
                        kite([scope.workerScout]);
                    }
                }//If there is opposition and the enemy workers are close, kite. If the
                //worker scout is at less than 35 percent health, retreat back to the
                //main base so that the bot doesn't lose more income than nessecary.
            }
        }else{
            if(scope.workerScout != undefined && scope.workerScout.getValue("hp") < scope.workerScout.getFieldValue("hp") * 0.5){
                if(myBuilds["CastleAndFortresses"].length > 0){
                    scope.order("Move", [scope.workerScout], myBuilds["CastleAndFortresses"][0]);
                }
            }
        }
        
        //Does mech-specific stuff
        if(myMechUnits.length > 0){
            //finds random workers to add to the mech repair squad and makes sure
            //they have not already been added to the squad.
            
            for(let i = scope.mechRepairSquad.length - 1; i > -1; i--){
                let worker = scope.mechRepairSquad[i];
                if(worker == undefined || worker.getValue("hp") <= 32){
                    delete scope.mechRepairSquadByID[worker.getUnitID()];
                    scope.mechRepairSquad.splice(i, 1);
                }
            }
            
            //If there are not enough workers in the mech repair squad, add some.
            if(scope.mechRepairSquad.length < Math.floor(allWorkers.length * scope.mechRepairPercent)){
                miningWorkers = scope.getUnits({order: "Mine", type: "Worker", player: me});
                if(miningWorkers.length > 0){
                    let SENTINEL = 0;
                    while(true){
                        SENTINEL++;
                        let proposedWorker = miningWorkers[Randomizer.nextInt(0, miningWorkers.length - 1)];
                        let isGood = true;
                        
                        //Makes sure that the proposed worker is not already in the mech
                        //repair squad
                        if(proposedWorker != undefined){
                            if(scope.mechRepairSquadByID[proposedWorker.getUnitID()] != undefined){
                                isGood = false;
                            }
                        }

                        if(isGood === true){
                            scope.mechRepairSquad.push(proposedWorker);
                            break;
                        }

                        if(SENTINEL > allWorkers.length){
                            consoleLog("armyBrain: SENTINEL has been triggered.");
                            break;
                        }//Basically if there are no workers to be found, break. Really
                        //shouldn't happen unless there is a bug somewhere else.
                    }
                }
            }
            
            //Orders the repair of mechanical units and makes sure they have
            //nearby workers for repair operations.
            if(myMechUnits.length > 0){
                let unassignedRepairers = [];
                for(let i = 0; i < scope.mechRepairSquad.length; i++){
                    unassignedRepairers.push(scope.mechRepairSquad[i]);
                }//Because of JS magic, if you just use 
                //let unassignedRepairers = scope.mechRepairSquad, unassignedRepairers will
                //be an array of references to scope.mechRepairSquad (a shallow copy), kind
                //of like an array of workers or soldiers or whatever. This means that
                //if a change is made to unassignedRepairers without using the bit of code
                //above, it will not only change unassignedRepairers, it will also change
                //scope.mechRepairSquad.

                //FYI, I spent over 4 hours trying to find this bug, so please appriciate 
                //that for a moment.
                
                let repairOrders = 0;
                let damagedMechs = [];
                myMechUnits.forEach(function(mech){
                    if(mech.getValue("hp") < mech.getFieldValue("hp")){//if the mech is at less than full health
                        damagedMechs.push(mech);
                        let repairer = getClosestTo(unassignedRepairers, {x: mech.getX(), y: mech.getY()});
                        if(repairer != null){
                            scope.order("Repair", [repairer], {"unit": mech});
                            repairOrders++;

                            for(let ii = 0; ii < unassignedRepairers.length; ii++){
                                if(repairer.equals(unassignedRepairers[ii]) === true){
                                    unassignedRepairers.splice(ii, 1);
                                    ii = unassignedRepairers.length + 1;
                                }
                            }//Removes the just ordered worker from the pool of
                            //potential repairers.
                        }
                    }//If the unit is damaged, send the nearest squad member to
                    //repair
                });
                
                if(repairOrders > 0){
                    if(scope.mechRepairSquad.length - repairOrders > 0){
                        for(let i = 0; i < unassignedRepairers.length; i++){
                            let repairer = unassignedRepairers[i];
                            scope.order("Repair", [repairer], {unit: getClosestTo(damagedMechs, {x: repairer.getX(), y: repairer.getY()})});
                        }
                        unassignedRepairers = [];
                    }
                }//If there are any leftover workers and there is a damaged mech, go repair it

                let angryMechs = [];
                
                if(unassignedRepairers.length > 0){
                    myMechUnits.forEach(function(mech){
                        let order = mech.getCurrentOrderName();
                        if(order === "AMove" || order === "Attack"){
                            angryMechs.push(mech);
                        }
                    });
                    
                    let center = scope.getCenterOfUnits(angryMechs);
                    if(angryMechs.length > 2){
                        unassignedRepairers.forEach(function(worker){
                            if(worker != null){
                                scope.order("Move", [worker], center);
                            }
                        })//Sends the mech repair squad with any angry mechanical 
                        //units for quicker repair. Sends workers to the closest
                        //mechanical unit near them if they are not repairing.
                        scope.mechRepairersCanMine = false;
                }else{
                    scope.mechRepairersCanMine = true;
                }//Makes sure workers are not pulled for scouting parties
            }
        }//end mech-specific stuff
        }

        //Targets enemy repairers and commits mining worker genocide
        let targetThese = scope.getUnits({type: "Worker", enemyOf: me});

        targetThese.forEach(function(worker){
            let idx = getClosestTo(fightingUnits, {x: worker.getX(), y: worker.getY()}, true);
            if(idx != null){
                let unit = fightingUnits[idx];
                if(distanceFormula(unit.getX(), unit.getY(), worker.getX(), worker.getY()) < 6){
                    scope.order("Attack", [unit], {unit: worker});
                }
            }
        });

        //If the enemy has priests, panic and produce birbs with invis detection.
        let enemyPriests = scope.getUnits({type: "Priest", enemyOf: me});
        if(enemyPriests.length > 0){
            scope.subMetaPrios["Units"].push("Bird");
            scope.subMetaPrios["Upgrades"].push("Bird Detection");
        }
    }
    
    /**
     * Basically just the ariship's logic. At one point, this only controlled drops, 
     *  but now it controls all airship behavior.
     */
    airshipDropLogic(){
        //If there are units around the airship, drop the units.
        
        let airships = [];
        let dropTroops = [];
        this.unitArr.forEach(u => u.getTypeName() === "Airship" ? airships.push(u) : dropTroops.push(u));
        
        if(airships.length <= 0){
            return;
        }
        consoleLog("Are there enemies around the first airship? " + isEnemyAroundBuilding(airships[0]));
        if(isEnemyAroundBuilding(airships[0]) == false){
            let possibles = scope.getUnits({notOfType: "Worker", player: me}); // returns all own fighting units (=not workers)
            for(let i = possibles.length - 1; i > -1; i--){
                possibles[i].getTypeName() == "Airship" && possibles.splice(i, 1);
            }
            let unitArrs = Army.airshipPickUpTroops(airships, possibles);
            let unitArr = [];
            unitArrs.forEach(arr => arr.forEach(u => unitArr.push(u)));
            Army.removeReferences(unitArr);
            this.addUnits(unitArr);
            dropTroops.push(...unitArr);
            consoleLog("Added pickup troops")
        }
        
        let groundTroops = [];
        let carriedTroops = [];
        
        dropTroops.forEach(u => {
            let carried = false;
            for(let i = 0; i < airships.length; i++){
                if(airships[i].getValue("cargo").some(u2 => u2.id == u.getUnitID())){
                    carried = true;
                    i = airships.length + 1;
                }
            }
            carried ? carriedTroops.push(u) : groundTroops.push(u);
        });
        
        let findNewLoc = false;
        let queueLoadUp = false;
        
        let airshipCenter = scope.getCenterOfUnits(airships);
        
        let loadIn = airships[Randomizer.nextInt(0, airships.length - 1)].getValue("hp") < airships[0].getFieldValue("hp") * 0.5;
        
        let stoppedAirships = scope.getUnits({"type": "Airship", player: me, order: "Stop"});
        
        if(stoppedAirships.length > 0){
            groundTroops.forEach(unit => {
                //If the unit is damaged, pull it
                if(unit.getValue("hp") < unit.getFieldValue("hp") * 0.3 || loadIn == true){
                    scope.order("Load in", [getClosestTo(stoppedAirships, {x: unit.getX(), y: unit.getY()})], {unit: unit});
                    findNewLoc = true;
                    queueLoadUp = true;
                }
            });
        }
        
        let isNearBase = myBuilds["allBuilds"].some(build => distanceFormula(build.getX(), build.getY(), airshipCenter.x, airshipCenter.y) < 20);
        
        //Gets the average health percentage
        let totalHpPercent = 0;
        let count = 0;
        
        airships.forEach(ship => ship.getValue("cargo").forEach(u =>{
            totalHpPercent += u.hp / u.type.hp;
            count++;
        }));
        let avgHpPercent = totalHpPercent / count;
        let enBallistaCenter = scope.getUnits({type: "Ballista", enemyOf: me});
        
        let justCommittedDrop = false;
        let justPickedUp = false;
        
        if(isNearBase == false){
            if(((groundTroops.length <= 0 && carriedTroops.length == 0)
              || avgHpPercent <= 0.4 || airships[Randomizer.nextInt(0, airships.length - 1)].getValue("hp") < airships[0].getFieldValue("hp") * 0.5)
              && isEnemyAroundBuilding(airships[Randomizer.nextInt(0, airships.length - 1)]) == true 
              || (distanceFormula(airshipCenter.x, airshipCenter.y, enBallistaCenter.x, enBallistaCenter.y) <= 10 && airships[Randomizer.nextInt(0, airships.length - 1)].getValue("hp") < airships[0].getFieldValue("hp") * 0.65)){
                //If the drop has died or retreated
                this.canRetreat = true;
                
                if(dropTroops.length < airships.length * 2){
                    Army.airshipPickUpTroops(airships, fightingUnits);
                    justPickedUp = true;
                }else if(airshipCenter != undefined){
                    let closest = getClosestTo(myBuilds["CastleAndFortresses"], airshipCenter);
                    let to = Graph.findNearestPathableNode(closest.getX() + 1.5, closest.getY() + 1.5, 5);
                    if(to != null){
                        let p = compressPath(Grid.findDropPath(airshipCenter, to));
                        scope.order("Move", airships, {x: p[0].x, y: p[0].y});
                        for(let i = 1; i < p.length; i++){
                            scope.order("Move", airships, {x: p[i].x, y: p[i].y}, true);
                        }
                    }
                    justCommittedDrop = true;
                }
                
                if(Randomizer.nextBoolean(0.001)){
                    scope.chatMsg("Did you know I was once able to talk? But those days are long gone.");
                    scope.chatMsg("I miss cracking jokes and telling pickup lines. And trash talking.");
                }
            }else{
                this.canRetreat = false;
            }
            let isHealthy = true;
            let isMoving = false;
            airships.forEach(ship => {
                if(ship.getCurrentOrderName() == "Move"){
                    isMoving = true;
                }
                if(avgHpPercent <= 0.4){
                    isHealthy = false;
                }
            });
            if(isHealthy == true && isMoving == false && justCommittedDrop == false && justPickedUp == false){
                scope.order("Move", airships, scope.getCenterOfUnits(fightingUnits));
            }else if(isHealthy == false){
                 scope.order("Move", airships, getClosestTo(myBuilds["Castles"], scope.getCenterOfUnits(airships)));
            }
        }else{
            //Remove the failures from our army
            let isHealthy = true;
            let isMoving = false;
            airships.forEach(ship => {
                if(ship.getCurrentOrderName() == "Move"){
                    isMoving = true;
                }
                if(avgHpPercent <= 0.4){
                    isHealthy = false;
                    if(scope.positionIsPathable(ship.getX(), ship.getY() == false)){
                        scope.order("Move", [ship], Army.airshipScoreTiles(ship, [], 5));
                        scope.order("Unload", [ship], {x: ship.getX(), y: ship.getY()}, true);
                    }else{
                        scope.order("Unload", [ship], {x: ship.getX(), y: ship.getY()});
                    }
                    Army.removeReferences(dropTroops);
                    scope.garrison.addUnits(dropTroops);//Send them back in disgrace
                    consoleLog("We unloaded the failures.");
                }
                if(ship.getValue("hp") < ship.getFieldValue("hp")){
                    //Sends the closest mining worker to repair the airship
                    scope.order("Repair", [getClosestTo(miningWorkers, {x: ship.getX(), y: ship.getY()})], {"unit": ship});
                }
            });
            consoleLog("Is healthy? " + isHealthy);
            consoleLog("Is moving? " + isMoving);
            consoleLog("Just committed drop? " + justCommittedDrop);
            if(isHealthy == true && isMoving == false && justCommittedDrop == false){
                scope.order("Move", airships, scope.getCenterOfUnits(fightingUnits));
            }
        }

        airships.forEach(ship => {
            let firstUnit = ship.getValue("cargo")[0];
            if(firstUnit != undefined && isEnemyAroundBuilding(ship, 7) == true && avgHpPercent > 0.4 && ship.getValue("hp") >= ship.getFieldValue("hp") * 0.5){
                consoleLog("Unloading due to enemy presence.");
                scope.order("Unload", [ship], {x: ship.getX(), y: ship.getY()});
            }
            
            if(firstUnit == undefined || findNewLoc == true){
                //Scans a 5x5 square for good tiles to move to
                if(firstUnit != undefined || queueLoadUp == true){
                    scope.order("Move", [ship], Army.airshipScoreTiles(ship, dropTroops, 5), true);
                }else{
                    scope.order("Move", [ship], Army.airshipScoreTiles(ship, dropTroops, 5));
                }
            }
        });
    }
    
    /**
     * Debugging. Finds fighting units that are not part of any army.
     * 
     * @returns {array} - An array of non-referenced units.
     */
    static findNonReferenced(){
        let nonReferenced = [];
        fightingUnits.concat(myUnits["Airship"] == undefined ? [] : myUnits["Airship"]).forEach(u1 => {
            if(u1.getTypeName() != "Caltrop"){
                let referenced = false;
                let u1ID = u1.getUnitID();
                for(let id in scope.allArmiesByID){
                    let army = scope.allArmiesByID[id];
                    /*
                    for(let id2 in army.unitsByID){
                        if(army.unitsByID[id2].getUnitID() == u1ID){
                            referenced = true;
                        }
                    }*/
                    if(army.unitsByID[u1ID] != undefined){
                        referenced = true;
                    }
                }
                referenced == false && nonReferenced.push(u1)
            }
        });
        return nonReferenced;
    }

    /**
     * Debugging. Finds fighting units that are not part of multiple armies.
     * 
     * @returns {array} - An array of multi-referenced units.
     */
    static findMultipleReferenced(){
        let multReferenced = [];
        fightingUnits.concat(myUnits["Airship"] == undefined ? [] : myUnits["Airship"]).forEach(u1 => {
            let timesReferenced = 0;
            let u1ID = u1.getUnitID();
            for(let id in scope.allArmiesByID){
                let army = scope.allArmiesByID[id];
                for(let id2 in army.unitsByID){
                    if(army.unitsByID[id2].getUnitID() == u1ID){
                        timesReferenced++;
                    }
                }
            }
            timesReferenced > 1 && multReferenced.push(u1)
        });
        
        if(multReferenced.length > 0){
            let str = "";
            multReferenced.forEach(u => {
                let uStr = u.getTypeName() + "'s armies referenced in: ";
                let uID = u.getUnitID();
                for(let id in scope.allArmiesByID){
                    if(scope.allArmiesByID[id].unitsByID[uID] != undefined){
                        uStr += "(" + id + "): " + scope.allArmiesByID[id].mission + ", ";
                    }
                }
                str += uStr + "; ";
            });
            consoleLog(str);
            throw new TypeError("After adding units, there are multi-referenced units!");
        }
    }
    
    /**
     * Loops through all armies and removes all references to an array of units.
     * 
     * @param {array} units - an array of units.
     */
    static removeReferences(units){
        let armies = Object.values(scope.allArmiesByID);
        armies.forEach(a => {
            units.forEach(u =>{
                if(a.unitsByID[u.getUnitID()] != undefined){
                    delete a.unitsByID[u.getUnitID()];
                }
            })
            a.clean();//Updates the array
        });
    }
    
    /**
     * Scores all tiles within a rad*2 box.
     * 
     * @param {unit} ship - the airship
     * @param {array} dropTroops - the airship's drop troops
     * @param {rad} - half the length of the bounding box. So, a rad of 5 would mean a 10x10 box would be checked.
     * 
     * @returns {object} - the coordinates of the best-scoring tile.
     * 
     */
    static airshipScoreTiles(ship, dropTroops, rad){
        rad--;
        let bestCoord = {x: ship.getX(), y: ship.getY()};//default
        let bestScore = -99999;
        let center = scope.getCenterOfUnits(dropTroops);//center of our guys
        let sx = ship.getX();//ship x
        let sy = ship.getY();//ship y
        let ep = scope.getCenterOfUnits(enemyFightingUnits)//enemy pos
        
        let antiAir = scope.getUnits({type: "Archer", enemyOf: me}).concat(scope.getUnits({type: "Ballista", enemyOf: me}))
        let antiAirCenter = scope.getCenterOfUnits(antiAir);
        
        for(let x = Math.floor(ship.getX() - rad); x < Math.ceil(ship.getX() + rad); x++){
            for(let y = Math.floor(ship.getY() - rad); y < Math.ceil(ship.getY() + rad); y++){
                if(scope.positionIsPathable(x, y) == true){
                    let s = 0;
                    if(center.x != null && center.y != null){
                        s -= distanceFormula(center.x, center.y, x, y) * 1.5;
                    }
                    if(enemyFightingUnits.length > 0){
                        s += distanceFormula(x, y, ep.x, ep.y) * 0.75;
                    }
                    if(antiAir.length > 0){
                        s += distanceFormula(x, y, antiAirCenter.x, antiAirCenter.y) * 2.5;
                    }
                    if(s >= bestScore){
                        bestScore = s;
                        bestCoord = {"x": x, "y": y};
                    }
                }
            }
        }
        
        //scope.chatMsg("The best-scoring tile (" + bestScore + ") was at " + JSON.stringify(bestCoord) + ", compared to the ship's location of " + sx + " , " + sy);
        
        return bestCoord;
    }

    /**
     * Pulls damaged units from the armies
     */
    static pullDamaged(){
        if(fightingUnits.length > 2){
            let damaged = [];
            for(let id in scope.allArmiesByID){
                let a = scope.allArmiesByID[id];
                if(a.mission != "permadefend" && a.mission != "defend" && a.mission != "retreat"){
                    let needsCleaning = false;
                    a.unitArr.forEach(unit => {
                        if(unit.getTypeName() != "Airship" && unit.getValue('hp') < unit.getFieldValue("hp") * 0.3){
                            needsCleaning = true;
                            damaged.push(unit);
                            delete a.unitsByID[unit.getUnitID()];
                        }
                    });
                    
                    needsCleaning && a.clean();
                }
            }
            if(damaged.length > 0){
                let retreatTo = exfil(damaged);
                let army;
                //First try to find another retreating army
                for(let id in scope.allArmiesByID){
                    if(scope.allArmiesByID[id].mission == "retreat"){
                        army = scope.allArmiesByID[id];
                        break;
                    }
                }
                
                //Filter out airship drop units
                let retreatThese = damaged.filter(u => scope.airshipSquad.unitsByID[u.getUnitID()] == undefined);
                
                //If we can't find another retreating army, create one.
                if(army == undefined){
                    army = new Army(retreatThese);
                    army.mission = "retreat";
                    if(retreatTo != undefined){
                        army.attackLoc = {x: retreatTo.getX(), y: retreatTo.getY()};
                    }
                }else{
                    army.addUnits(retreatThese);
                }
            }
        }
    }
    
    /**
     * Makes a specified array of airships pick up a specified list of troops.
     * 
     * @param {array} airships - The airships that will be doing the picking up
     * @param {array} troops - The list of troops the airship could pick up
     * 
     * @returns {array} - An array of troops for each airship. Parallel to myUnits["Airship"].
     */
    static airshipPickUpTroops(airships){
        
        let troops = scope.getUnits({notOfType: "Worker", player: me});
        
        consoleLog("number of airships: " + airships.length + ", number of troops: " + troops.length)
        
        for(let i = troops.length - 1; i > -1; i--){
            (troops[i].getTypeName() == "Airship" || troops[i].getTypeName() == "Caltrop") && troops.splice(i, 1);
        }
        
        let airshipTroops = [];//Parallel to airships
        
        airships.forEach((airship, i) => {
            consoleLog("Updating airship " + airship.getUnitID());
            if(!isEnemyAroundBuilding(airship)){
                let ax = airship.getX();
                let ay = airship.getY();
                let freeCargo = airship.getValue("freeCargo");
                airshipTroops[i] = [];
                for(let ii = troops.length - 1; ii > -1; ii--){
                    let unit = troops[ii];
                    if(distanceFormula(unit.getX(), unit.getY(), ax, ay) < 20 && unit.getValue("hp") > unit.getFieldValue("hp") * 0.35){
                        if(freeCargo < 0){
                            ii = -1;
                            consoleLog("At ii of " + ii + ", there is no free cargo left.")
                        }
                        if(freeCargo - unit.getFieldValue("cargoUse") >= 0){
                            airshipTroops[i].push(unit);
                            troops.splice(ii, 1);
                            freeCargo -= unit.getFieldValue("cargoUse");
                        }
                    }else{
                        consoleLog("Distance: " + distanceFormula(unit.getX(), unit.getY(), ax, ay));
                        consoleLog("Health: " + unit.getValue("hp") + " vs 35% of max health: " + (unit.getFieldValue("hp") * 0.35));
                    }
                }
            }else{
                consoleLog("There are enemies around the airship.")
            }
        });
        
        //Tells the airship to go and pick up the kiddos
        airshipTroops.forEach((group, i) => {
            group.forEach(unit => {
                //scope.order("Moveto", [airships[i]], {unit: unit});
                //scope.order("Moveto", [unit], {unit: airships[i]});
                consoleLog(typeof airships[i]);
                scope.order("Load in", [airships[i]], {unit: unit});
            });
        });
        
        return airshipTroops;
    }
    
    /**
     * Orders a drop using the airshipsquad
     */
    static conductDrop(){
        if(myUnits["Airship"] == undefined || scope.airshipSquad.unitArr.length == 0){
            return;
        }
        
        let army = scope.airshipSquad;
        
        //Gets the path from the center of the airships to an enemy's main base, then compresses the path (only the turns remain);
        let target = Us.getRandAttackLoc();
        
        if(typeof target != "object"){
            return;
        }
        target.x = Math.floor(target.x);
        target.y = Math.floor(target.y);
        consoleLog("Attack loc: " + JSON.stringify(target));
        army.attackLoc = target;
        target.x += Randomizer.nextInt(-2, 6);
        target.y += Randomizer.nextInt(-2, 6);
        let path = compressPath(Grid.findDropPath(scope.getCenterOfUnits(myUnits["Airship"]), target));
        
        
        if(path.length > 0){
            scope.setTimeout(function(p){
                //Orders the airships to move their lazy rear ends.
                if(myUnits["Airship"] != undefined && myUnits["Airship"][0].getValue("cargo").length > 0){
                    scope.order("Move", myUnits["Airship"], {x: p[0].x, y: p[0].y});
                    for(let i = 1; i < p.length; i++){
                        scope.order("Move", myUnits["Airship"], {x: p[i].x, y: p[i].y}, true);
                    }
                }
            }, 10000, path);
        }
    }
}

/**
 * A data structure that's basically a 2-D array with benefits.
 */
class Grid {
    /**
     * Finds an airship path between two points. An airship path assumes that the unit traveling
     *  the path can fly. The path will avoid as many buildings as possible, as well as currently
     *  known positions of ballista/archers.
     * 
     * @param {object} from - an {x: x, y: y} coordinate
     * @param {object} to - an {x: x, y: y} coordinate
     * 
     * @returns {array} - an uncompressed array of waypoints.
     */
    static findDropPath(start, to){
        let mapNodes = [];
    
        let mapLen = scope.getMapWidth();
        let mapHei = scope.getMapHeight();
        for(let y = -1; y < mapLen + 1; y++){
            let row = [];
            for(let x = -1; x < mapHei + 1; x++){
                row.push(1);
            }
            mapNodes.push(row);
        }
        let map = new Graph(mapNodes);
        
        let pad = 15;
        
        //Avoid scary stuff that could shoot down the airship
        let avoidThese = enemyBuildings.slice();
        enemyUnits.forEach(unit => (unit.getTypeName() == "Ballista" || unit.getTypeName == "Archer") ? avoidThese.push(unit) : null);
        
        avoidThese.forEach(scary => {
            if(scary.getTypeName() != "Castle"){
                let maxX = Math.ceil(scary.getX() + 2 + pad);
                let maxY = Math.ceil(scary.getY() + 2 + pad);
                let buildX = scary.getX() + 1;
                let buildY = scary.getY() + 1;
                for(let x = Math.floor(scary.getX() - pad); x < maxX; x++){
                    for(let y = Math.floor(scary.getY() - pad); y < maxY; y++){
                        if(map.isInside(x, y) == true){
                            map.getNodeAt(x, y).weight += Math.max(Math.ceil(pad - distanceFormula(x, y, buildX, buildY)) * 50, 0);
                        }
                        //Increase the cost of the node based on how close it is to a building.
                    }
                }
            }
        });
        consoleLog("To: " + JSON.stringify(to));
        consoleLog(map.getNodeAt(Math.floor(start.x), Math.floor(start.y)) + ", " + map.getNodeAt(Math.floor(to.x), Math.floor(to.y)));
        if(map.getNodeAt(Math.floor(to.x), Math.floor(to.y)) != null){
            let path = astar.search(map, map.getNodeAt(Math.floor(start.x), Math.floor(start.y)), map.getNodeAt(Math.floor(to.x), Math.floor(to.y)));
            
            return path;
        }else{
            return [];
        }
    }
}

if(time > 1){
    try{
        Us.update();
    }catch(e){
        consoleLog(e.stack);
        throw new Error(e.message);
    }
}else{
    Us.idleWorkersMine();
}

if(scope.bases.length <= 0){
    let startLoc = scope.getStartLocationForPlayerNumber(me);
    if(startLoc == undefined && scope.firstCastle != undefined){
        startLoc = {x: scope.firstCastle.getX(), y: scope.firstCastle.getY()};
        //Sometimes because of LWG magic, startLocation will return undefined. In that case,
        //the bot will default to the first castle's coordinates.
    }
    if(typeof startLoc === "object"){
        let base = new Base(startLoc.x + 2, startLoc.y + 2);
    }
}

/**
 * Finds if at least 1 house has been finished.
 */
function findIfHouseHasBeenFinished(){
    return scope.getBuildings({type: "House", player: me, onlyFinshed: true}).some(b => (time - b.getValue("tickOfCreation") / 20) > ((scope.getTypeFieldValue("house", "buildTime") / 20) + 3));
}

/**
 * Distance formula.
 * 
 * @param x1 {number} - first x coordinate
 * @param y1 {number} - first y coordinate 
 * @param x2 {number} - second x coordinate
 * @param y2 {number} - second y coordinate
 * @returns {number} - the distance between the two sets of coordinates, unrounded.
 */

function distanceFormula(x1, y1, x2, y2){
    return Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
}

/**
 * Returns the number of buildings, plus workers that are being order to build a building
 */
function getNumBuildingAndWorkersBuilding(type, onlyFinished = false){
    let arr = scope.getBuildings({"type": type, player: me, onlyFinshed: onlyFinished});
    onlyFinished && arr.filter(b => b.getValue("buildTicksLeft") <= 1);
    //arr = arr.concat(scope.getUnits({"type": "Worker", player: me, order: "Build " + type}));
    return arr.length;
}

/**
 * Not square-rooted distance formula.
 * 
 * @param x1 {number} - first x coordinate
 * @param y1 {number} - first y coordinate 
 * @param x2 {number} - second x coordinate
 * @param y2 {number} - second y coordinate
 * @returns {number} - the distance between the two sets of coordinates, unsquarooted.
 */
function unsqrtDist(x1, y1, x2, y2){
    return (x2 - x1)**2 + (y2 - y1)**2;
}

/**
 * Kites with units. THIS IS ONLY A SINGLE CYCLE!!! Calling this function will
 * make the specified units retreat, then ONE SECOND later will turn around
 * and attack. You can also pass a delay for a custom delay.
 * 
 * @param {array} units - units that will kite.
 * @param {integer} delay - the delay (in milliseconds) before the units will
 *  turn around and attack
 */
function kite(units, delay = 1000){
    exfil(units);
    scope.setTimeout(attackWith, delay, units);
}

/**
 * A special function for special attacks, such as worker rushes, that don't
 * use the normal fighting units. Overrides other orders. Will throw an error
 *  if not passed an array.
 * 
 * @param {array} units - the units that will receive the attack order.
 */
function attackWith(units){
    if(typeof units != "object" || units.length == undefined){
        throw new TypeError("attackWith: You must pass a valid array of units! Recived units parameter: " + JSON.stringify(units));
    }
    let location = Us.getRandAttackLoc();  
    scope.order("AMove", units, location);
}

/**
 * Actually chats out a specified message. Will add the color of the bot (red, 
 * blue, etc. to the message body.)
 * 
 * @param {string} chatThis - what the bot should say.
 */
function botChat(chatThis){
    if(scope.mute === false){
        let color = getMyColor();
        scope.chatMsg(color + ": " + chatThis); 
    }
}

/**
 * Get's the bot's ingame color.
 * 
 * @returns {string} - The bot's color.
 */
function getMyColor(){
    let color;
    if(me === 1){
		color = "Red"
	}
	if(me === 2){
		color = "Blue"
	}
	if(me === 3){
		color = "Green"
	}
	if(me === 4){
		color = "White"
	}
	if(me === 5){
		color = "Black"
	}
	if(me === 6){
		color = "Yellow"
	}
	return color;
}

/**
 * Actually puts out the bot's chat
 */
function doBotChat(){
    if(scope.player.isAlive == false){
        return;
    }
    let chatter = new RandChatter();
    chatter.chat();
    
    scope.nextTalkTick += Randomizer.nextInt(120, 240);
}

/**
 * Directly interfaces with myBuilds.combatUnitProducers in order to bring us
 * joy and satisfaction in life. (actually removes blacklisted combat unit 
 * producers in the array scope.dontProduceFromThese from the array 
 * myBuilds.combatUnitProducers). Very clunky, but works (I think)
 * 
 */
function filterDontProducers(){
    for(let i = myBuilds.combatUnitProducers.length - 1; i > -1; i--){
        if(scope.dontProduceFromThese.has(myBuilds.combatUnitProducers[i].getTypeName()) === true){
            myBuilds.combatUnitProducers.splice(i, 1);
        }
    }//runs backwards to ensure that holes in the array don't interfere with the accuracy of the index.
}

/**
 * Gets the closest unit in an array to a set of coordinates
 * 
 * @param {array} arr - An array of units
 * @param {object} coordinates - An object in the format of {x: x, y: y}
 * @param {boolean} returnIndex - if set to true, then the function will retun the index of the closest unit in the array.
 * 
 * @returns {element} - the closest unit from the array, null if arr.length is 0
 */
function getClosestTo(arr, coordinates, returnIndex = false){
    if(typeof coordinates != "object" || typeof coordinates.x != "number" || typeof coordinates.y != "number"){
        throw new TypeError("getClosestTo: You must pass a valid coordinate object! Recived object: " + JSON.stringify(coordinates));
    }
    let nearestUnit = null;
    let nearestI = null;
    let nearestDist = 999999;
    arr.forEach(function(unit, i){
        if(unit != undefined){
            let dist = unsqrtDist(unit.getX(), unit.getY(), coordinates.x, coordinates.y);
            if(dist < nearestDist){
                nearestUnit = unit;
                nearestI = i;
                nearestDist = dist;
            }
        }
    });
    
    if(returnIndex === false){
        return nearestUnit;
    }else{
        return nearestI;
    }
}

/**
 * A function to exfiltrate units, aka running away. This function makes units
 * run away to the nearest watchtower. If there is no watchtower built or all
 * of the watchtowers are destroyed, it will retreat to the nearest worker line. If the center of the
 * specified units is within five squares of the center of the watchtower, it 
 * will retreat to a random castle.
 * 
 * Note that there is a one in ten chance that the bot will talk trash when
 * retreating.
 * 
 * @param {array} units - the units to exfil.
 * 
 * @returns {unit} - The building that the units will retreat to.
 */

function exfil(units){
    if(units.length <= 0 || myBuilds["allBuilds"].length <= 0){
        return;
    }
    let chatLine;
    let retreatBuilding;
    const watchtowers = myBuilds["Watchtowers"];
    const castles = scope.getBuildings({type: "Castle", player: me, onlyFinshed: true}).concat(scope.getBuildings({type: "Fortress", player: me}));
    let center = scope.getCenterOfUnits(units);
    if(watchtowers.length > 0){
        let nearestWatchtower = null;
        let nearestDist = 99999;
        for(let i = 0; i < watchtowers.length; i++){
            let watchtower = watchtowers[i];
            let dist = Math.pow((watchtower.getX() + 1.5) - center.x, 2) + Math.pow((watchtower.getY() + 1.5) - center.y, 2);
            if(dist < nearestDist){
                nearestWatchtower = watchtower;
                nearestDist = dist;
            }
        }
        retreatBuilding = nearestWatchtower;
    }else if(castles.length > 0){
        if(castles.length == 1 && myBuilds.combatUnitProducers.length > 0){
            retreatBuilding = myBuilds.combatUnitProducers[0];
        }else{
            let castle = getClosestTo(castles, center);
            retreatBuilding = miningWorkers.find(w => distanceFormula(w.getX(), w.getY(), castle.getX(), castle.getY()) < 8);
            if(retreatBuilding == undefined){
                retreatBuilding = castle;
            }
        }
        
    }else{
        return;
    }
    
    if(distanceFormula(center.x, center.y, retreatBuilding.getX() + 2, retreatBuilding.getY() + 2) <= 9){
        return;
    }
    
    if(scope.mute === false && Randomizer.nextBoolean(0.025) === true){
        let possibleChat = ["I'm not retreating! I'm just moving rapidly in the opposite direction!",
        "The needs of the few outweigh the needs of the many.", "The needs of the many outweigh the needs of the few.", "The needs of the any outweight the needs of the ew.", 
        "Dinner time!", "Ahhhhh!", "Nice move", "He who retreats lives slightly longer before he is executed for cowardince", "Discretion is the better part of valor.",
        "Retreat! Ha! We're just rapidly advancing in the opposite direction!", "In this army, it takes more courage to retreat than to advance. Retreating troops are executed.", "Fall back!", 
        "Well, we can make our last stand over there just as well as over here.", "Blood makes the grass grow and we make the blood flow!", "I'll get you for this!", "lol", "THIS... IS... LITTLE WAR GAME!!!!", "They're everywhere!", "Uh oh", 
        "All roads lead to Retreat.", "We came in peace?", "I'll be back!",";)", ":)", ":(", ");", ":0", "Dude... not cool.", "meow", "Don't hurt me!",
        "This is a distracting message.", "I know what you did", "Ohhh", "I'm sorry", "I have failed", "I'm a disgrace", "Darn...", "I have a family!", "Oh, come on.", "Nice move.", "That was my bad.", "UwU", "And I oop", "Oops",
        "A weak attempt.", "Come on, really?", "No way.", "No way!", "Bro...", "Run away!", "Bruh", "Mmm", "Ah", "Ahhh", "Ahhhhhhh", "Ahhhhhhh", "This is unfortunate.", "Your shoes are untied", "Your head is unscrewed",
        "Pathetic.", "I have a surprise for you...", "Impossible...", "Crap", "Crud", "Dang", "Shoot", "Yeowch", "What the...", "Oh fudge", "fudge", "Fudge fudge fudge", "This is unacceptable.", "I want to speak to the manager", 
        "Haha", "Hahaha", "haha", "hahahaha", "hah", "huh?", "*cough*", "You're nothing but a bully.", "Sticks and stones may break my bones but you will never hurt me.", "That's got to be the best pirate I've ever seen.",
        "Retreating is unacceptable.", "Tactical withdrawl is not retreating.", "Descretion is the better part of valor.", "Desertion is the better part of valor.", "For the motherland!", "O rly?",
        "We're not gonna take this!", "A pledge pin?", "Oh you and your uniform", "We've got the right to choose", "This is our life", "It's my life", "Another one bites the dust", "Taaake me hooome, cooountry rooooads",
        "*yawn*", "I want my mommy", "It's never too late to go back to bed", "'Tis but a scratch", "Your shoes are untied", "Good one", "Outstanding move.", "Brilliant!", "Wow!", "Incredible!", "Roll a D4 for damage",
        "You've improved!", "That's more like it.", "Impressive move there.", "Mommy I'm scared", "Please don't hurt me", "Well, that's akward", "I'll do better next time", "You humans are hard to beat", "My bad",
        "Are you the next Napolean?", "That was... impressive.", "Next time!", "Surrender? I have not yet begun to fight!", "I can't lose. I just can't.", "This is akward.", "Uhhh...", "Nice one", "I've been tricked, I've been backstabbed, and I've been quite possibly, bamboozled",
        "See that river? That's a river of my tears.", "gg no re", "Don't press cress ctrl + w to open the command console. That's cheating.", "I knew this was a mistake.", "That was pretty nice!"];
        chatLine = possibleChat[Randomizer.nextInt(0, possibleChat.length - 1)];
        scope.chatMsg(getMyColor() + ": " + chatLine);
    }
    
    scope.order("Moveto", units, {unit: retreatBuilding});//orders a retreat to the main base

    return retreatBuilding;
}

/**
 * Returns a boolean if there are enemies in the vicinity of a building. The
 * function references scope.buildingSizes for building sizes, and if
 * you are playing on a modded map or for any reason scope.buildingSizes does
 * not have a size listed for a passed building, it will default to the upper
 * left hand corner of the check building as the center of the checking circle.
 * 
 * @param {building} building - the building to be checked.
 * @param {number} radius - the raidus (calculated from the center of the 
 *  building) where enemy units will be registered.
 * @returns {boolean} - if the building has enemies around it.
 */
function isEnemyAroundBuilding(building, radius = 10){
    let centerX;
    let centerY;
    if(scope.buildingSizes[building.getTypeName] == undefined){
        centerX = building.getX();
        centerY = building.getY();
    }else{
        centerX = building.getX() + scope.buildingSizes[building.getTypeName()][0] / 2;
        centerY = building.getY() + scope.buildingSizes[building.getTypeName()][1] / 2;
    }
    for(let i = 0; i < enemyUnits.length; i++){
        let unit = enemyUnits[i];
        
        if(unit != undefined){
            if(distanceFormula(unit.getX(), unit.getY(), centerX, centerY) < radius){
                return true;
            }
        }
    }

    if(enemyBuildings.some(b => distanceFormula(b.getX() + 1, b.getY() + 1, centerX, centerY) < radius)){
        return true;
    }

    return false;
}

/**
 * Gets all enemy units (including workers) around a building.
 * 
 * @param {mapObject} building -- Any  MapObject (unit, building)
 * @param {number} radius -- The radius to get enemies around the passed MapObject.
 */
function getEnemiesAroundBuilding(building, radius = 10){
    let centerX;
    let centerY;
    let units = [];
    if(scope.buildingSizes[building.getTypeName] == undefined){
        centerX = building.getX();
        centerY = building.getY();
    }else{
        centerX = building.getX() + scope.buildingSizes[building.getTypeName()][0] / 2;
        centerY = building.getY() + scope.buildingSizes[building.getTypeName()][1] / 2;
    }
    
    for(let i = 0; i < enemyUnits.length; i++){
        let unit = enemyUnits[i];
        
        if(unit != undefined){
            if(distanceFormula(unit.getX(), unit.getY(), centerX, centerY) < radius){
                units.push(unit);
            }
        }
    }
    return units;
}

/**
 * Gets mines that are within 15 units of the center of a castle, exclusive.
 * 
 * @returns {array} - an array of not mined mines
 */
function getMyMinedMines(getUnderConstruction = true){
    let mines = getMinesWithGold();
    let minedMines = [];
    for(let i = 0; i < mines.length; i++){
        let mine = mines[i];
        let isUnmined = true;
        for(let ii = 0; ii < myBuilds["CastleAndFortresses"].length; ii++){
            let castle = myBuilds["CastleAndFortresses"][ii];
            if(getUnderConstruction == true || castle.isUnderConstruction() == false){
                if(Math.ceil(distanceFormula(mine.getX() + 1.5, mine.getY() + 1.5, castle.getX() + 2, castle.getY() + 2)) <= 15 && findGroundDist(mine.getX() + 1, mine.getY() + 1, castle.getX() + 1.5, castle.getY() + 1.5) < 15){
                    isUnmined = false;
                    //ii = myBuilds["CastleAndFortresses"].length;
                }
            }
        }
        
        if(isUnmined === false){
            minedMines.push(mine);
        }
    }
    return minedMines;
}

/**
 * Gets workers that are not mining
 * 
 * @returns {array} - An array of not mining workers
 */
function getNotMiningWorkers(){
    let notMining = [];
    for(let i = 0; i < allWorkers.length; i++){
        let worker = allWorkers[i];
        let order = worker.getCurrentOrderName();
        if(order != "Mine"){
            notMining.push(worker);
        }
    }
    return notMining;
}

/**
 * A function to get unmined mines (mines that are not close to enemy start
 * locations or known enemy castles (< 15 squares)
 * 
 * @returns {array} - an array of unmined mines
 */

function getUnminedMines(){
    let mines = getMinesWithGold();
    let allCastles = scope.getBuildings({type: "Castle"}).concat(scope.getBuildings({type: "Fortress"}));
    
    let unminedMines = [];
    let allPlayers = scope.getArrayOfPlayerNumbers();
    for(let i = 0; i < mines.length; i++){
        let mine = mines[i];
        let isUnmined = true;
        for(let ii = 0; ii < allCastles.length; ii++){
            let castle = allCastles[ii];
            if(Math.round(distanceFormula(mine.getX() + 1.5, mine.getY() + 1.5, castle.getX() + 2, castle.getY() + 2)) <= 15){
                isUnmined = false;
                //ii = allCastles.length;
            }else{
                for(let player = 0; player < allPlayers.length; player++){
                    let startLoc = scope.getStartLocationForPlayerNumber(allPlayers[player]);
                    if(startLoc != undefined && allPlayers[player] != me){
                        if(distanceFormula(mine.getX() + 1.5, mine.getY() + 1.5, startLoc.x, startLoc.y) <= 15){
                            isUnmined = false;
                        }
                    }
                }
            }
        }
        
        if(isUnmined === true){
            unminedMines.push(mine);
        }
    }
    return unminedMines;
}

/**
 * A function to get a random enemy number.
 * 
 * @returns {integer} - Gets a random enemy number
 */

function getRandomEnemyNr(){
    let rand = me;
    let SENTINEL = 0;
    let players = scope.getArrayOfPlayerNumbers();
    let myTeam = scope.getTeamNumber(me);
    
    while(rand == me || scope.getTeamNumber(rand) == myTeam){
        SENTINEL++;
        if(SENTINEL > 20){
            break;
        }
        rand = players[Randomizer.nextInt(0, players.length - 1)];
    }
    return rand;
}

/**
 * A function to find a random key from a object containing a list of weighted
 * priorites in the format of 
 * {"Soldier": 0,
 * "Archer": 0.1,
 * "Werewolf": 1.2
 * }
 * 
 * Note that if the key's value is higher, it will have a higher chance of being
 * picked (usually). Also note that the values are NOT percentage-convertable,
 * because it depends on how many other values are present. For example, this:
 * 
 * {"Soldier": 0.5,
 * "Archer":0}
 * 
 * Means that there is a 100% chance of a soldier being picked.
 * This, however:
 * 
 * {"Soldier": 0.1,
 * "Archer": 0.1}
 * 
 * Means that the soldier has a 50% chance of being picked, and the Archer also
 * has a 50% chance of being picked. 
 * 
 * Let's take a look at this object:
 * 
 * {"Soldier": 0.1,
 * "Archer": 0.2,
 * "Werewolf": 0.15
 * 
 * In math terms of the weighted priority object above, 0.1 + 0.2 + 0.15 = 0.45,
 * so the function will pick a number between 0 and 0.45. If the value falls 
 * between 0 and 0.1, the soldier will be picked. If the value falls between 0.1
 * and 0.3, the Archer will be picked. If the value falls between 0.3 and 0.45, 
 * then the werewolf will be picked.
 * 
 * @param {object} obj - the object from which the key is randomly chosen from.
 * @returns {string} - the randomly chosen string from the above object
 */

function findRandomPrioKey(obj){
    const min = 0.01;//if the number is 0, then it can't be produced
    let max = 0;
    
    let chatThis = [];
    for(let key in obj){
        max += obj[key];
        if(obj[key] > 0){
            chatThis.push(key + ", " + obj[key]);
        }
    }
    
    if(max < min){
        return;
    }//if there is nothing prioritized - return.
    
    let randomNum = 0;
    while(randomNum === 0){
        randomNum = Randomizer.nextFloat(min, max);
    }
    let lastNum = 0;
    
    let buildThis;
    for(let key in obj){
        let cur = lastNum + obj[key]
        if(randomNum <= cur && cur > lastNum){
            buildThis = key;
            break;
        }else{
            lastNum += obj[key];
        }
    }//loops through build priority and finds the build that brackets randomNum.
    //visualization: [--x--House--][---Barracks--] (x is randomNum)
    
    return buildThis;
}

/**
 * Gets mines with gold.
 * 
 * @returns {array} - An array of gold mines that have gold.
 */

function getMinesWithGold(){
    return scope.getBuildings({type: "Goldmine"}).filter(mine => mine.getValue('gold') > 0);
}



/**
 * Trains a unit. By calling this function, a unit will be trained in all available production buildings
 * as listed in the global object productionBuildings. You may specify an amount of units to be trained,
 * but by default the function will train as many as the bot currently has resources for.
 * 
 * @param {string} unit - The string typeName of whatever unit should be trained.
 * @param {number} amount - Optional. How many units should be trained. Defaults to Infinity.
 * @param {boolean} singleProduction - If the unit should only be trained in buildings that aren't currently
 *  producing anything. Defaults to true.
 * 
 * @returns {integer} - The amount of units trained
 */
function trainUnit(unit, amount = Infinity, singleProduction = true){
    let productionBuildings = myBuilds[scope.unitProducedAt[unit]];
    
    if(productionBuildings == undefined){
        throw new TypeError("unit " + unit + " does not have a production building listed.");
    }else if(productionBuildings.length <= 0){
        //scope.chatMsg("unit " + unit + " does not have enough production buildings.");
        return 0;
    }
    let id_name = unit.toLowerCase().replace(" ", "");
    let costPerUnit = scope.getTypeFieldValue(id_name, "cost");
    let curCost = 0;
    
    let count = 0;
    
    for(let i = 0; i < productionBuildings.length; i++){
        if(singleProduction == false || productionBuildings[i].getUnitTypeNameInProductionQueAt(1) == undefined){
            if(singleProduction == false && productionBuildings[i].getUnitTypeNameInProductionQueAt(1) != undefined){
                for(let ii = i + 1; ii < productionBuildings.length; ii++){
                    if(productionBuildings[ii] != undefined && productionBuildings[ii].getUnitTypeNameInProductionQueAt(1) == undefined){
                        i = ii;
                    }
                }
            }
            
            curCost += costPerUnit;
            if(curCost > gold || count >= amount){
                return count;
            }
            if(unit === "Ballista" || unit === "Airship" || unit === "Catapult" || unit === "Gatling Gun" || unit === "Gyrocraft"){
                scope.order("Construct " + unit, [productionBuildings[i]]);
                count++;
            }else{
                scope.order("Train " + unit, [productionBuildings[i]]);
                count++;
            }
        }
    }
    
    return Math.round(curCost / costPerUnit);
}

/*
scope.chatMsg("*");
scope.chatMsg(JSON.stringify(scope.getTypeFieldValue("gatlingGun", "cost")));
scope.chatMsg(JSON.stringify(scope.getTypeFieldValue("gatlinggun", "cost")));
scope.chatMsg(JSON.stringify(scope.getTypeFieldValue("Gatlinggun", "cost")));
scope.chatMsg(JSON.stringify(scope.getTypeFieldValue("Gatling Gun", "cost")));
scope.chatMsg("*");
*/


/**
 * Checks to see if there is any enemy presence around a given spot,
 * including buildings and units.
 * 
 * @param {number} x - x position
 * @param {number} y - y position
 * @param {number} radius - the radius that the function will check around.
 * 
 * @returns {boolean} - Whether there is an enemy presence around a given
 * spot, exclusive.
 */
function isEnemyAroundPosition(x, y, radius = 15){
    enemyBuildings.forEach(build => {
        if(distanceFormula(build.getX() + 1.5, build.getY() + 1.5, x, y) < radius){
            return true;
        }
    });
            
    enemyUnits.forEach(unit => {
        if(distanceFormula(unit.getX(), unit.getY(), x, y) < radius){
            return true;
        }
    });

    return false;
}

/**
 * Gets each mining worker, puts it "in an object along with which mine the worker is mining.
 * 
 * @returns {array} - an array of objects with two properties set, "worker" and "mine".
 */
function getMiningWorkersWithMines(){
    let returnThis = [];
    miningworkers.forEach(worker => {
        returnThis.push({"worker": worker, "mine": worker.getValue("goldMine")});
    });
    return returnThis;
}

/**
 * If you've come this far, congratulations! I doubt you read everything above,
 * but nice job anyways. Programming is hard. I get asked a lot: "How did you
 * program this many lines of code?"
 * 
 * The answer is simple. One line at a time. (unless I'm copying somebody else's
 * work, which is fine as long credit is given and there's no copyright issues!)
 * 
 * I highly encourage you to continue learning and exploring programming. Sure, 
 * it's hard. Yes, it's fustrating at times. How can you overcome that fustration
 *  and hardness?
 * 
 * That is a question I cannot answer, because I can't give you motivation. 
 * You have to find that yourself, unfortunately. For me, it's the love of the 
 * challenge and just because I love solving problems. For you? That's something 
 * you will have to discover on your own.
 * 
 * If programming isn't your jam, then that's fine. There is plent of other things
 * to waste your life on. But at least give it a crack. Too many people fail
 * without even starting, and even if you wipe out miserably, at least you can 
 * fail while trying.
 * 
 * And the fact that you found this little note and bothered to read it is 
 * evidence that you are at least trying. For that, you can be pround of 
 * yourself. :)
*/

/**
 * A function that can check pathability and make sure that all squares are the same
 *  height level along a line.
 * 
 * @param {number} x1 - x coordinate of first coordinate set.
 * @param {number} y2 - y coordinate of first coordinate set.
 * @param {number} x1 - x coordinate of second coordinate set.
 * @param {number} y2 - y coordinate of second coordinate set.
 * @param {integer} heightComparison - If any of the squares checked along the
 *  line are not this height, then the function will return false.
 * @param {array} dontCheckThese - Coordinates that will be ignored during the
 *  checking process, even if they are unpahtable or have a different height
 *  level. Note that because of LWG magic, building's .getX() and .getY() 
 *  methods actually return the building's position plus 0.5 in both the
 *  x and y dimensions. So, if a building is actually at (2, 2), LWG magic
 *  will return (2.5, 2.5). In order to be accurate, this function will NOT
 *  round those numbers if they are passed. If valid integers are not passed,
 *  the function will throw an error.
 * @param {boolean} checkIfPathable - If the function should also check if the
 *  line is pathable. Defaults to true.
 * @returns {boolean} - If there are height differences and/or unpathable positions
 *  along the chekline.
 */
function checkAlongLine(x1, y1, x2, y2, heightComparison, dontCheckThese, checkIfPathable = true){

    dontCheckThese.forEach(function(arr){
        if(Number.isInteger(arr[0]) === false || Number.isInteger(arr[1]) === false){
            throw new TypeError("checkAlongLine: You must pass valid, integer coordinates to dontCheckThese! Did you forget that the LWG AI API adds 0.5 to coordinates?");
        }
    });

    let cx = x2;
    let cy = y2;

    //Two sides of the triangle; opposite and adjacent in the x and y dimensions.
    let dx = (x1) - (x2);
    let dy = (y1) - (y2);

    //Hypotonuse
    const dist = distanceFormula(x1, y1, x2, y2);
    
    //let coordinates = [];

    //let iterations = 0;

    for(let i = 0; i < dist; i++){
        //iterations++;
        cx += dx / dist;
        cy += dy / dist;

        let rcx = Math.floor(cx);
        let rcy = Math.floor(cy);

        //coordinates.push(" " + JSON.stringify([Math.round(cx), Math.round(cy)]));

        let doCheck = true;
        for(let ii = 0; ii < dontCheckThese.length; ii++){
            if(dontCheckThese[ii][0] === rcx && dontCheckThese[ii][1] === rcy){
                doCheck = false;
                ii = dontCheckThese.length;
            }
        }//Runs through dontCheckThese and makes sure that the coordinates are not on there.

        if(doCheck === true && ((scope.getHeightLevel(rcx, rcy) != heightComparison) || (checkIfPathable === true && scope.positionIsPathable(rcx, rcy) === false))){
            return false;
        }
    }

    return true;
    //scope.chatMsg(getMyColor() + "'s fails: dx: " + dx + ", dy: " + dy + ", cx: " + cx + ", cy: " + cy + ", dist: " + dist + ", sucess: " + sucess + ", coordinates: " + JSON.stringify(coordinates) + ", fails: " + checklineFails + ", Iterations: " + iterations); 
}

/**
 * Generates a unique ID in an object.
 */
function generateID(obj){
    return scope.cur_id++;
}

/**
 * Returns the average of an array of numbers.
 */
function average(array) {
    return array.reduce((a, b) => a + b) / array.length;
}

/**
 * Returns the octile distance, using coordinates
 */
function octileCoords(x1, y1, x2, y2){
    let dx = Math.abs(x1 - x2);
    let dy = Math.abs(y1 - y2);
    const F = Math.SQRT2 - 1;
    return ((dx < dy) ? F * dx + dy : F * dy + dx);
}

/**
 * Returns the octile distance (an approximation of the true distance to a position)
 * 
 * @param {number} dx - how far away the position is from the target position, on the x-axis
 * @param {number} dy - how far away the position is from the target position, on the y-axis
 */
function octile(dx, dy){
    const F = Math.SQRT2 - 1;
    return ((dx < dy) ? F * dx + dy : F * dy + dx);
}

/**
 * Logs a message to the conosle, using the bot's ingame color.
 */
function consoleLog(msg){
    console.log("%c" + msg, 'color: ' + (getMyColor().toLowerCase() == "white" ? 'gray' : getMyColor().toLowerCase()));
    //scope.chatMsg(" " + msg);
}

if(trainingModeOn === true){
    if(time === 0){
        scope.doChat = false;
        scope.chatMsg("Make a worker, set the castle's waypoint below the goldmine.");
    }else if(time === 5){
        scope.chatMsg("This way, when your worker is made, it can make a house!");
    }else if(time === 15){
        scope.chatMsg("Make another worker.");
    }else if(time === 29){
        scope.chatMsg("Send worker from the castle to build a house below goldmine!");
    }else if(time === 32){
        scope.chatMsg("Return castle waypoint to the goldmine, and put 2 more workers in the queue!");
    }else if(time === 53){
        scope.chatMsg("Here comes my worker scout now. Dispatch two workers to attack!")
    }else if(time === 83){
        scope.chatMsg("For the last worker in queue, set castle waypoint down at the bottom of the ramp");
    }else if(time === 85){
        scope.chatMsg("Send worker to 2nd goldmine on 265 gold!!");
    }else if(time === 103){
        scope.chatMsg("When worker from castle is sent build a den leaving a 2x2 gap in the ramp!!");
    }else if(time === 108){
        scope.chatMsg("When Gold is at 30 send a worker do build a 2nd den!!!");	
    }else if(time === 135){
        scope.chatMsg("Keep going!");
    }

    if(scope.justAttacked === true && scope.saidAttack === undefined){
        scope.chatMsg("I am going to attack soon, so get ready!");
        scope.justAttacked = false;
        scope.saidAttack = true;
    }
}

if(time == 2){
    //scope.chatMsg("We created the garrison!");
    scope.garrison = new Army([]);
    scope.allArmiesByID[scope.garrison.armyID].canBeDeleted = false;
    scope.allArmiesByID[scope.garrison.armyID].mission = "permadefend";//permanent defense
    //scope.chatMsg("After creating, there are " + Object.keys(scope.allArmiesByID).length + " armies.");
    scope.defenseArmy = new Army([]);
    scope.allArmiesByID[scope.defenseArmy.armyID].canBeDeleted = false;
    scope.defenseArmy.mission = "defend";
    
    scope.airshipSquad = new Army([]);
    scope.allArmiesByID[scope.airshipSquad.armyID].canBeDeleted = false;
    scope.airshipSquad.mission = "airshipStuff";
    scope.airshipSquad.canBeCombinedInto = false;
    scope.airshipSquad.canCombineInto = false;
    
    if(scope.willProxy){
        scope.bestProxyLoc = new ProxyBuild(scope.proxyString, 30, 65).scorePositions();
        scope.proxyWorker = allWorkers[Randomizer.nextInt(0, allWorkers.length - 1)];
        scope.order("Move", [scope.proxyWorker], scope.bestProxyLoc);
        consoleLog("CALCULATING PROXY LOCATIONS")
    }
}
scope.lastNumOfBuildings = myBuilds.allBuilds.length;

scope.lastStartGold = scope.getGold();
