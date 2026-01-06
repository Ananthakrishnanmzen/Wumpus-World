const GRID_SIZE = 4;
let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(""));
let agentPos = { r: 3, c: 0 };

const gridElement = document.getElementById('grid-container');

function createGrid() {
    gridElement.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            // Add Visual Icons
            if (grid[r][c] === "Wumpus") cell.innerHTML = '<i class="fas fa-skull"></i>';
            if (grid[r][c] === "Pit") cell.innerHTML = '<i class="fas fa-circle-notch"></i>';
            if (grid[r][c] === "Gold") cell.innerHTML = '<i class="fas fa-trophy"></i>';

            // Automatic Percepts (Breeze/Stench)
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
    return [...new Set(p)]; // Remove duplicates
}

// Logic for Run and Reset remains similar to previous version...
document.getElementById('resetBtn').onclick = () => {
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(""));
    agentPos = { r: 3, c: 0 };
    createGrid();
};

document.getElementById('runBtn').onclick = async () => {
    // Simple BFS Pathfinding to Gold
    let queue = [{ r: 3, c: 0, path: [] }];
    let visited = new Set(["3,0"]);
    
    while (queue.length > 0) {
        let { r, c, path } = queue.shift();
        if (grid[r][c] === "Gold") {
            for (let pos of [...path, {r,c}]) {
                agentPos = pos; createGrid();
                await new Promise(res => setTimeout(res, 300));
            }
            return alert("💰 Gold Recovered!");
        }
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && 
                !visited.has(`${nr},${nc}`) && grid[nr][nc] !== "Wumpus" && grid[nr][nc] !== "Pit") {
                visited.add(`${nr},${nc}`);
                queue.push({ r: nr, c: nc, path: [...path, {r,c}] });
            }
        });
    }
    alert("No safe path!");
};

createGrid();
