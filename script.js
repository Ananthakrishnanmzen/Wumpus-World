// --- CONFIGURATION & STATE ---
const GRID_SIZE = 4;
let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(""));
let agentPos = { r: 3, c: 0 };
let hasArrow = true;

const gridElement = document.getElementById('grid-container');

// --- GRID RENDERING ---
function createGrid() {
    gridElement.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';

            // Render Icons using FontAwesome
            if (grid[r][c] === "Wumpus") cell.innerHTML = '<i class="fas fa-skull"></i>';
            if (grid[r][c] === "DeadWumpus") cell.innerHTML = '<i class="fas fa-skull-crossbones"></i>';
            if (grid[r][c] === "Pit") cell.innerHTML = '<i class="fas fa-circle-notch"></i>';
            if (grid[r][c] === "Gold") cell.innerHTML = '<i class="fas fa-trophy"></i>';

            // Render Percepts (Stench/Breeze)
            const percepts = getPercepts(r, c);
            if (percepts.length > 0 && !grid[r][c]) {
                const pSpan = document.createElement('span');
                pSpan.className = 'percept';
                pSpan.textContent = percepts.join(", ");
                cell.appendChild(pSpan);
            }

            // Render Agent
            if (agentPos.r === r && agentPos.c === c) {
                const agent = document.createElement('div');
                agent.className = 'agent';
                agent.innerHTML = '<i class="fas fa-user-ninja"></i>';
                cell.appendChild(agent);
            }

            // Manual Placement via Click
            cell.onclick = () => {
                const tool = document.querySelector('input[name="tool"]:checked').value;
                grid[r][c] = (tool === "Clear") ? "" : tool;
                createGrid();
            };
            gridElement.appendChild(cell);
        }
    }
}

// --- LOGIC HELPERS ---
function getPercepts(r, c) {
    let p = [];
    const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
    neighbors.forEach(([dr, dc]) => {
        let nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
            if (grid[nr][nc] === "Pit") p.push("Breeze");
            if (grid[nr][nc] === "Wumpus") p.push("Stench");
        }
    });
    return [...new Set(p)];
}

function checkWumpus(r, c) {
    if (grid[r][c] === "Wumpus") {
        grid[r][c] = "DeadWumpus";
        return true;
    }
    return false;
}

// --- SHOOTING SYSTEM ---
function executeShoot(dir, isAuto = false) {
    if (!hasArrow) return;
    hasArrow = false;
    document.getElementById('shootBtn').disabled = true;
    document.getElementById('arrowCount').textContent = "0";

    let hit = false;
    let { r, c } = agentPos;

    if (dir === "up") for(let i = r-1; i >= 0; i--) if(checkWumpus(i, c)) hit = true;
    if (dir === "down") for(let i = r+1; i < GRID_SIZE; i++) if(checkWumpus(i, c)) hit = true;
    if (dir === "left") for(let i = c-1; i >= 0; i--) if(checkWumpus(r, i)) hit = true;
    if (dir === "right") for(let i = c+1; i < GRID_SIZE; i++) if(checkWumpus(r, i)) hit = true;

    if (hit) {
        alert(isAuto ? "🎯 AI Tactical Shot: Wumpus Slain!" : "🎯 A blood-curdling scream echoes... The Wumpus is dead!");
    } else if (!isAuto) {
        alert("🏹 The arrow hits the wall. Nothing happened.");
    }
    createGrid();
}

// --- AI NAVIGATION & PATHFINDING ---
async function findPath(start, targetCoords, avoidList) {
    let queue = [{ r: start.r, c: start.c, path: [] }];
    let visited = new Set([`${start.r},${start.c}`]);

    while (queue.length > 0) {
        let { r, c, path } = queue.shift();
        
        if (r === targetCoords.r && c === targetCoords.c) return path;

        const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
        for (let [dr, dc] of neighbors) {
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited.has(`${nr},${nc}`)) {
                let cellContent = grid[nr][nc];
                
                // A cell is traversable if it's the final target OR if it's not in the avoid list
                const isTarget = (nr === targetCoords.r && nc === targetCoords.c);
                const isSafe = !avoidList.includes(cellContent);

                if (isTarget || isSafe) {
                    visited.add(`${nr},${nc}`);
                    queue.push({ r: nr, c: nc, path: [...path, {r, c}] });
                }
            }
        }
    }
    return null;
}

// --- BUTTON HANDLERS ---
document.getElementById('shootBtn').onclick = () => {
    const direction = prompt("Shoot Arrow! Type: up, down, left, or right");
    if (direction) executeShoot(direction.toLowerCase());
};

document.getElementById('resetBtn').onclick = () => {
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(""));
    agentPos = { r: 3, c: 0 };
    hasArrow = true;
    document.getElementById('shootBtn').disabled = false;
    document.getElementById('arrowCount').textContent = "1";
    createGrid();
};

document.getElementById('runBtn').onclick = async () => {
    // 1. TACTICAL SHOOTING PHASE
    if (hasArrow) {
        let wumpusPos = null;
        for(let r=0; r<GRID_SIZE; r++) {
            for(let c=0; c<GRID_SIZE; c++) {
                if(grid[r][c] === "Wumpus") wumpusPos = {r, c};
            }
        }

        if (wumpusPos) {
            // Find a path to a square adjacent to Wumpus to shoot it
            const pathToWumpus = await findPath(agentPos, wumpusPos, ["Wumpus", "Pit"]);
            if (pathToWumpus) {
                for (let pos of pathToWumpus) {
                    agentPos = pos;
                    createGrid();
                    await new Promise(res => setTimeout(res, 300));
                }
                // Determine shooting direction
                let dr = wumpusPos.r - agentPos.r;
                let dc = wumpusPos.c - agentPos.c;
                let dir = dr < 0 ? "up" : dr > 0 ? "down" : dc < 0 ? "left" : "right";
                executeShoot(dir, true);
                await new Promise(res => setTimeout(res, 500));
            }
        }
    }

    // 2. GOLD RECOVERY PHASE
    let goldPos = null;
    for(let r=0; r<GRID_SIZE; r++) {
        for(let c=0; c<GRID_SIZE; c++) {
            if(grid[r][c] === "Gold") goldPos = {r, c};
        }
    }

    if (goldPos) {
        const finalPath = await findPath(agentPos, goldPos, ["Wumpus", "Pit"]);
        if (finalPath) {
            for (let pos of [...finalPath, goldPos]) {
                agentPos = pos;
                createGrid();
                await new Promise(res => setTimeout(res, 300));
            }
            return alert("💰 Gold Recovered! Victory!");
        }
    }
    alert("No safe path to the gold!");
};

// Initial Render
createGrid();
