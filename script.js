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

            // Icons for hazards and items
            if (grid[r][c] === "Wumpus") cell.innerHTML = '<i class="fas fa-skull"></i>';
            if (grid[r][c] === "DeadWumpus") cell.innerHTML = '<i class="fas fa-skull-crossbones"></i>';
            if (grid[r][c] === "Pit") cell.innerHTML = '<i class="fas fa-circle-notch"></i>';
            if (grid[r][c] === "Gold") cell.innerHTML = '<i class="fas fa-trophy"></i>';

            // Sensory Percepts
            const percepts = getPercepts(r, c);
            if (percepts.length > 0 && !grid[r][c]) {
                const pSpan = document.createElement('span');
                pSpan.className = 'percept';
                pSpan.textContent = percepts.join(", ");
                cell.appendChild(pSpan);
            }

            // Agent Visualization
            if (agentPos.r === r && agentPos.c === c) {
                const agent = document.createElement('div');
                agent.className = 'agent';
                agent.innerHTML = '<i class="fas fa-user-ninja" style="color:white;"></i>';
                cell.appendChild(agent);
            }

            cell.onclick = () => {
                const toolInput = document.querySelector('input[name="tool"]:checked');
                if (toolInput) {
                    grid[r][c] = (toolInput.value === "Clear") ? "" : toolInput.value;
                    createGrid();
                }
            };
            gridElement.appendChild(cell);
        }
    }
}

// --- PERCEPTION LOGIC ---
function getPercepts(r, c) {
    let p = [];
    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
        let nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
            if (grid[nr][nc] === "Pit") p.push("Breeze");
            if (grid[nr][nc] === "Wumpus") p.push("Stench");
        }
    });
    return [...new Set(p)];
}

// --- COMBAT LOGIC ---
function executeShoot(dir) {
    if (!hasArrow) return;
    hasArrow = false;
    document.getElementById('shootBtn').disabled = true;
    document.getElementById('arrowCount').textContent = "0";

    let hit = false;
    let { r, c } = agentPos;

    const checkKill = (nr, nc) => {
        if (grid[nr][nc] === "Wumpus") {
            grid[nr][nc] = "DeadWumpus";
            hit = true;
        }
    };

    if (dir === "up") for(let i = r-1; i >= 0; i--) checkKill(i, c);
    if (dir === "down") for(let i = r+1; i < GRID_SIZE; i++) checkKill(i, c);
    if (dir === "left") for(let i = c-1; i >= 0; i--) checkKill(r, i);
    if (dir === "right") for(let i = c+1; i < GRID_SIZE; i++) checkKill(r, i);

    if (hit) alert("🎯 A blood-curdling scream echoes... The Wumpus is dead!");
    else alert("🏹 The arrow clattered uselessly against a wall.");
    createGrid();
}

// --- ADVANCED PATHFINDING (BFS) ---
async function findPath(start, target, avoidList) {
    let queue = [{ r: start.r, c: start.c, path: [] }];
    let visited = new Set([`${start.r},${start.c}`]);

    while (queue.length > 0) {
        let { r, c, path } = queue.shift();
        if (r === target.r && c === target.c) return path;

        for (let [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited.has(`${nr},${nc}`)) {
                let cellType = grid[nr][nc];
                // A cell is safe if it's the target OR not in the avoidList
                if (!avoidList.includes(cellType) || (nr === target.r && nc === target.c)) {
                    visited.add(`${nr},${nc}`);
                    queue.push({ r: nr, c: nc, path: [...path, {r, c}] });
                }
            }
        }
    }
    return null;
}

// --- AI SOLVER ---
document.getElementById('runBtn').onclick = async () => {
    const findObj = (val) => {
        for(let r=0; r<GRID_SIZE; r++) 
            for(let c=0; c<GRID_SIZE; c++) 
                if(grid[r][c] === val) return {r, c};
        return null;
    };

    const goldLoc = findObj("Gold");
    const wumpusLoc = findObj("Wumpus");
    const startLoc = { r: 3, c: 0 };

    if (!goldLoc) return alert("Please place the Gold first!");

    // Step 1: Attempt to find a path to the Gold
    let path = await findPath(agentPos, goldLoc, ["Pit", "Wumpus"]);

    // Step 2: Tactical Shooting (If path is blocked by Wumpus)
    if (!path && hasArrow && wumpusLoc) {
        // Find path to a cell adjacent to the Wumpus
        let shootPath = await findPath(agentPos, wumpusLoc, ["Pit", "Wumpus"]);
        if (shootPath) {
            for (let pos of shootPath) {
                agentPos = pos;
                createGrid();
                await new Promise(res => setTimeout(res, 400));
            }
            // Shoot the Wumpus
            let dr = wumpusLoc.r - agentPos.r, dc = wumpusLoc.c - agentPos.c;
            let dir = dr < 0 ? "up" : dr > 0 ? "down" : dc < 0 ? "left" : "right";
            executeShoot(dir);
            // Re-calculate path now that Wumpus is "DeadWumpus" (safe)
            path = await findPath(agentPos, goldLoc, ["Pit", "Wumpus"]);
        }
    }

    // Step 3: Move to Gold
    if (path) {
        for (let pos of [...path, goldLoc]) {
            agentPos = pos;
            createGrid();
            await new Promise(res => setTimeout(res, 400));
        }
        alert("💰 Gold Recovered! Returning to exit...");
        
        // Step 4: Safely Return to Start
        let returnPath = await findPath(agentPos, startLoc, ["Pit", "Wumpus"]);
        if (returnPath) {
            for (let pos of [...returnPath, startLoc]) {
                agentPos = pos;
                createGrid();
                await new Promise(res => setTimeout(res, 400));
            }
            alert("🏠 Mission Complete! Safe at the exit.");
        } else {
            alert("⚠️ Warning: Gold secured but no safe path back to exit!");
        }
    } else {
        alert("❌ Impossible: No safe path to the gold.");
    }
};

document.getElementById('resetBtn').onclick = () => location.reload();
document.getElementById('shootBtn').onclick = () => {
    const d = prompt("Shoot arrow (up, down, left, right):");
    if(d) executeShoot(d.toLowerCase());
};

createGrid();
