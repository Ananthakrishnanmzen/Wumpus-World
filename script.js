const GRID_SIZE = 4;
let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(""));
let agentPos = { r: 3, c: 0 };
let hasArrow = true;

const gridElement = document.getElementById('grid-container');

function createGrid() {
    gridElement.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            // Render Icons
            if (grid[r][c] === "Wumpus") cell.innerHTML = '<i class="fas fa-skull"></i>';
            if (grid[r][c] === "DeadWumpus") cell.innerHTML = '<i class="fas fa-skull-crossbones"></i>';
            if (grid[r][c] === "Pit") cell.innerHTML = '<i class="fas fa-circle-notch"></i>';
            if (grid[r][c] === "Gold") cell.innerHTML = '<i class="fas fa-trophy"></i>';

            // Automatic Percepts (Breeze/Stench) - only if Wumpus is alive
            const percepts = getPercepts(r, c);
            if (percepts.length > 0 && !grid[r][c]) {
                const pSpan = document.createElement('span');
                pSpan.className = 'percept';
                pSpan.textContent = percepts.join(", ");
                cell.appendChild(pSpan);
            }

            // Draw Agent
            if (agentPos.r === r && agentPos.c === c) {
                const agent = document.createElement('div');
                agent.className = 'agent';
                agent.innerHTML = '<i class="fas fa-user-ninja" style="font-size:1.2rem; color:white;"></i>';
                cell.appendChild(agent);
            }

            cell.onclick = () => {
                const tool = document.querySelector('input[name="tool"]:checked').value;
                grid[r][c] = (tool === "Clear") ? "" : tool;
                createGrid();
            };
            gridElement.appendChild(cell);
        }
    }
}

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

// SHOOTING LOGIC
function shootArrow() {
    if (!hasArrow) return;
    
    const direction = prompt("Shoot Arrow! Type: up, down, left, or right");
    if (!direction) return;
    
    const dir = direction.toLowerCase();
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
        alert("🎯 A blood-curdling scream echoes... The Wumpus is dead!");
    } else {
        alert("🏹 The arrow hits the wall. Nothing happened.");
    }
    createGrid();
}

function checkWumpus(r, c) {
    if (grid[r][c] === "Wumpus") {
        grid[r][c] = "DeadWumpus";
        return true;
    }
    return false;
}

document.getElementById('shootBtn').onclick = shootArrow;

document.getElementById('resetBtn').onclick = () => {
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(""));
    agentPos = { r: 3, c: 0 };
    hasArrow = true;
    document.getElementById('shootBtn').disabled = false;
    document.getElementById('arrowCount').textContent = "1";
    createGrid();
};

document.getElementById('runBtn').onclick = async () => {
    let queue = [{ r: 3, c: 0, path: [] }];
    let visited = new Set(["3,0"]);
    
    while (queue.length > 0) {
        let { r, c, path } = queue.shift();
        
        if (grid[r][c] === "Gold") {
            for (let pos of [...path, {r,c}]) {
                agentPos = pos; 
                createGrid();
                await new Promise(res => setTimeout(res, 300));
            }
            return alert("💰 Gold Recovered! Victory!");
        }

        const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
        for (let [dr, dc] of neighbors) {
            let nr = r + dr, nc = c + dc;
            let cellState = (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) ? grid[nr][nc] : null;

            // AI considers cell safe if it's empty, gold, or a DEAD Wumpus
            if (cellState !== null && !visited.has(`${nr},${nc}`)) {
                if (cellState !== "Wumpus" && cellState !== "Pit") {
                    visited.add(`${nr},${nc}`);
                    queue.push({ r: nr, c: nc, path: [...path, {r,c}] });
                }
            }
        }
    }
    alert("No safe path to the gold!");
};

createGrid();
