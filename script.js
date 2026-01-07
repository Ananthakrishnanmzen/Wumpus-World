 
// --- CONFIGURATION & STATE ---
const GRID_SIZE = 4;
let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(""));
let agentPos = { r: 3, c: 0 }; 
let hasArrow = true;

const gridElement = document.getElementById('grid-container');

// --- GRID RENDERING ---
function createGrid() {
    if (!gridElement) return;
    gridElement.innerHTML = '';
    
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';

            // Render Hazards/Items
            if (grid[r][c] === "Wumpus") cell.innerHTML = '<i class="fas fa-skull"></i>';
            if (grid[r][c] === "DeadWumpus") cell.innerHTML = '<i class="fas fa-skull-crossbones"></i>';
            if (grid[r][c] === "Pit") cell.innerHTML = '<i class="fas fa-circle-notch"></i>';
            if (grid[r][c] === "Gold") cell.innerHTML = '<i class="fas fa-trophy"></i>';

            // Render Percepts (Stench/Breeze) - Only if tile is otherwise empty
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
                agent.innerHTML = '<i class="fas fa-user-ninja" style="color:white;"></i>';
                cell.appendChild(agent);
            }

            // Manual Placement via Click
            cell.onclick = () => {
                const toolInput = document.querySelector('input[name="tool"]:checked');
                if (toolInput) {
                    const tool = toolInput.value;
                    grid[r][c] = (tool === "Clear") ? "" : tool;
                    createGrid();
                }
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
        alert(isAuto ? "🎯 AI Tactical Shot: Wumpus Slain!" : "🎯 A scream echoes... The Wumpus is dead!");
    } else if (!isAuto) {
        alert("🏹 The arrow hits the wall.");
    }
    createGrid();
}

// --- AI NAVIGATION (BFS) ---
async function findPath(start, targetCoords, avoidList) {
    let queue = [{ r: start.r, c: start.c, path: [] }];
    let visited = new Set([`${start.r},${start.c}`]);

    while (queue.length > 0) {
        let { r, c, path } = queue.shift();
        if (r === targetCoords.r && c === targetCoords.c) return path;

        for (let [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited.has(`${nr},${nc}`)) {
                let cellContent = grid[nr][nc];
                // Safe if it's the target OR not in the avoid list
                if (nr === targetCoords.r && nc === targetCoords.c || !avoidList.includes(cellContent)) {
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
    const direction = prompt("Shoot Arrow! (up, down, left, right)");
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
    // Phase 1: Hunt Wumpus if it exists
    if (hasArrow) {
        let wumpusPos = null;
        grid.forEach((row, r) => row.forEach((val, c) => { if(val === "Wumpus") wumpusPos = {r, c}; }));

        if (wumpusPos) {
            const pathToWumpus = await findPath(agentPos, wumpusPos, ["Wumpus", "Pit"]);
            if (pathToWumpus) {
                for (let pos of pathToWumpus) {
                    agentPos = pos;
                    createGrid();
                    await new Promise(res => setTimeout(res, 300));
                }
                let dr = wumpusPos.r - agentPos.r, dc = wumpusPos.c - agentPos.c;
                let dir = dr < 0 ? "up" : dr > 0 ? "down" : dc < 0 ? "left" : "right";
                executeShoot(dir, true);
                await new Promise(res => setTimeout(res, 500));
            }
        }
    }

    // Phase 2: Go to Gold
    let goldPos = null;
    grid.forEach((row, r) => row.forEach((val, c) => { if(val === "Gold") goldPos = {r, c}; }));

    if (goldPos) {
        const finalPath = await findPath(agentPos, goldPos, ["Wumpus", "Pit"]);
        if (finalPath) {
            for (let pos of [...finalPath, goldPos]) {
                agentPos = pos;
                createGrid();
                await new Promise(res => setTimeout(res, 300));
            }
            alert("💰 VICTORY! Gold Recovered!");
        } else {
            alert("❌ No safe path to the gold!");
        }
    }
};

document.getElementById('runBtn').onclick = async () => {
    // Phase 1: Hunt the Wumpus (Only if it's in the way)
    if (hasArrow) {
        let wumpusLoc = null;
        grid.forEach((row, r) => row.forEach((cell, c) => { if(cell === "Wumpus") wumpusLoc = {r, c}; }));

        if (wumpusLoc) {
            let pathToShoot = await findPath(agentPos, wumpusLoc, ["Pit", "Wumpus"]);
            if (pathToShoot) {
                for (let pos of pathToShoot) {
                    agentPos = pos;
                    createGrid();
                    await new Promise(res => setTimeout(res, 300));
                }
                let dr = wumpusLoc.r - agentPos.r, dc = wumpusLoc.c - agentPos.c;
                let dir = dr < 0 ? "up" : dr > 0 ? "down" : dc < 0 ? "left" : "right";
                executeShoot(dir, true);
                await new Promise(res => setTimeout(res, 500));
            }
        }
    }

    // Phase 2: Secure the Gold
    let goldLoc = null;
    grid.forEach((row, r) => row.forEach((cell, c) => { if(cell === "Gold") goldLoc = {r, c}; }));

    if (goldLoc) {
        let pathToGold = await findPath(agentPos, goldLoc, ["Pit", "Wumpus"]);
        if (pathToGold) {
            for (let pos of [...pathToGold, goldLoc]) {
                agentPos = pos;
                createGrid();
                await new Promise(res => setTimeout(res, 300));
            }
            alert("💰 Gold Secured! Now returning to start...");
            await new Promise(res => setTimeout(res, 500));
        } else {
            return alert("❌ MISSION FAILED: No safe path to the gold.");
        }
    }

    // Phase 3: Return to Starting Point (3,0)
    const startLoc = { r: 3, c: 0 };
    // If agent is already at start, mission is over
    if (agentPos.r === startLoc.r && agentPos.c === startLoc.c) {
        return alert("🏆 Mission Accomplished! You are already at the exit.");
    }

    let returnPath = await findPath(agentPos, startLoc, ["Pit", "Wumpus"]);
    if (returnPath) {
        for (let pos of [...returnPath, startLoc]) {
            agentPos = pos;
            createGrid();
            await new Promise(res => setTimeout(res, 300));
        }
        alert("🏠 Safe at Home! Total Victory!");
    } else {
        alert("⚠️ Trapped! Gold secured but no safe way back to the exit!");
    }
};


// Start
createGrid();

