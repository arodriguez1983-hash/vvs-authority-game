const DEFAULT_PRIZES = [
  { name:"3.01 CT MEGA LAB DIAMOND", qty:1, tier:"mega", unlock:90 },
  { name:"1.52 CT MEGA LAB DIAMOND", qty:1, tier:"mega", unlock:80 },
  { name:"0.50 CT LAB DIAMOND", qty:3, tier:"blue", unlock:60 },
  { name:"0.25 CT LAB DIAMOND", qty:6, tier:"green", unlock:45 },
  { name:"0.10 CT LAB DIAMOND", qty:10, tier:"gold", unlock:25 },
  { name:"2.80MM LAB DIAMOND", qty:20, tier:"orange", unlock:0 },
  { name:"2.40MM LAB DIAMOND", qty:40, tier:"green", unlock:0 },
  { name:"2.00MM LAB DIAMOND", qty:19, tier:"red", unlock:0 }
];

let settings = loadSettings();
let game = loadGame();
let adminUnlocked = false;
let adminMode = false;

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem("vvs_pro_settings")) || { totalSpots:100, password:"Aria1217!", prizes:DEFAULT_PRIZES };
  } catch {
    return { totalSpots:100, password:"vvs123", prizes:DEFAULT_PRIZES };
  }
}
function saveSettings() { localStorage.setItem("vvs_pro_settings", JSON.stringify(settings)); }

function poolFromSettings() {
  let pool = [];
  settings.prizes.forEach(p => {
    for (let i = 0; i < Number(p.qty || 0); i++) {
      pool.push({ name:p.name, tier:p.tier || "red", unlock:Number(p.unlock || 0) });
    }
  });

  const total = Number(settings.totalSpots || pool.length || 1);
  if (pool.length < total) {
    const filler = settings.prizes[settings.prizes.length - 1] || { name:"2.00MM LAB DIAMOND", tier:"red", unlock:0 };
    while (pool.length < total) pool.push({ name:filler.name, tier:filler.tier || "red", unlock:Number(filler.unlock || 0) });
  }
  if (pool.length > total) pool = pool.slice(0, total);
  return pool;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newGame() {
  return { prizes:shuffle(poolFromSettings()), drawn:[], taken:{}, substitutions:[] };
}

function loadGame() {
  try {
    const parsed = JSON.parse(localStorage.getItem("vvs_pro_game"));
    if (!parsed || !parsed.prizes || parsed.prizes.length !== Number(settings.totalSpots)) return newGame();
    return parsed;
  } catch {
    return newGame();
  }
}
function saveGame() { localStorage.setItem("vvs_pro_game", JSON.stringify(game)); }

function percentComplete() {
  return Math.round((game.drawn.length / game.prizes.length) * 100);
}

function isUnlocked(prize) {
  return percentComplete() >= Number(prize.unlock || 0);
}

function findReplacementPrize(spot) {
  for (let i = 0; i < game.prizes.length; i++) {
    const otherSpot = i + 1;
    const p = game.prizes[i];
    if (otherSpot !== spot && !game.taken[otherSpot] && isUnlocked(p)) return otherSpot;
  }
  return null;
}

function revealSpot(spot) {
  if (game.taken[spot]) return;

  let prize = game.prizes[spot - 1];
  let substituted = false;

  if (!isUnlocked(prize)) {
    const replacementSpot = findReplacementPrize(spot);
    if (replacementSpot) {
      const replacementPrize = game.prizes[replacementSpot - 1];
      game.prizes[replacementSpot - 1] = prize;
      game.prizes[spot - 1] = replacementPrize;
      game.substitutions.push({
        selectedSpot:spot,
        heldPrize:prize.name,
        replacementSpot,
        replacementPrize:replacementPrize.name,
        time:new Date().toLocaleString()
      });
      prize = replacementPrize;
      substituted = true;
    }
  }

  const buyer = document.getElementById("buyerName")?.value.trim() || "";
  const record = { spot, prize, buyer, time:new Date().toLocaleString(), substituted };
  game.taken[spot] = true;
  game.drawn.push(record);
  saveGame();

  document.getElementById("lastReveal").textContent = `Spot #${spot}: ${prize.name}${buyer ? " for " + buyer : ""}`;
  showReveal(record);
  render();
}

function showReveal(record) {
  document.getElementById("modalSpot").textContent =
    "💎 VVS AUTHORITY 💎  •  SPOT #" + record.spot;

  document.getElementById("modalPrize").textContent =
    "🏆 " + record.prize.name;

  document.getElementById("modalBuyer").textContent =
    record.buyer ? "Congratulations " + record.buyer + "!" : "Congratulations!";

  if (record.prize.tier === "mega") {
    document.getElementById("bangerText").innerHTML =
        "🚨 BANGER ALERT 🚨";
    document.getElementById("bangerText").classList.remove("hidden");

    document.querySelector(".modal-card").style.background =
        "radial-gradient(circle,#900 0%,#200 100%)";

} else {
    document.getElementById("bangerText").classList.add("hidden");

    document.querySelector(".modal-card").style.background =
        "linear-gradient(180deg,#450010,#000)";
}

  document.getElementById("revealModal").classList.remove("hidden");

}

function render() {
  renderBoard();
  renderStats();
  renderInventory();
  renderHistory();
  document.getElementById("adminTools").classList.toggle("hidden", !adminMode);
  document.getElementById("viewLabel").textContent = adminMode ? "Private Admin View" : "Audience View";
}

function renderBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";
  game.prizes.forEach((prize, idx) => {
    const spot = idx + 1;
    const div = document.createElement("div");
    div.className = "spot";
    div.textContent = spot;

    if (adminMode) {
      div.classList.add("admin-view");
      div.innerHTML = `${spot}<br>${shortName(prize.name)}<br>${prize.unlock}%`;
      if (!isUnlocked(prize)) div.classList.add("locked");
    }

    if (game.taken[spot]) {
      div.classList.add("taken", prize.tier);
      if (!adminMode) div.innerHTML = `${spot}<br>💎`;
    }

    div.onclick = () => revealSpot(spot);
    board.appendChild(div);
  });
}

function shortName(name) {
  return name.replace("LAB DIAMOND","").replace("DIAMOND","").replace("MEGA","MEGA").trim();
}

function renderStats() {
  const total = game.prizes.length;
  const drawn = game.drawn.length;
  document.getElementById("totalSpots").textContent = total;
  document.getElementById("drawn").textContent = drawn;
  document.getElementById("remaining").textContent = total - drawn;
  document.getElementById("complete").textContent = Math.round((drawn / total) * 100) + "%";
}

function renderInventory() {
  const counts = {};
  game.prizes.forEach((p, idx) => {
    const spot = idx + 1;
    if (!game.taken[spot]) counts[p.name] = (counts[p.name] || 0) + 1;
  });

  document.getElementById("inventory").innerHTML =
    Object.entries(counts).map(([name, count]) => `<div class="row"><span>💎 ${name}</span><span class="count">${count}</span></div>`).join("") || "No prizes remaining.";
}

function renderHistory() {
  const recent = [...game.drawn].reverse().slice(0, 12);
  document.getElementById("history").innerHTML =
    recent.map((d, i) => `<div class="history-row"><b>#${game.drawn.length - i}</b> Spot #${d.spot} • ${d.prize.name}${d.buyer ? " • " + d.buyer : ""}${adminMode && d.substituted ? " • unlock swap" : ""}</div>`).join("") || "No draws yet.";
}

function randomSpot() {
  const available = game.prizes.map((_, i) => i + 1).filter(s => !game.taken[s]);
  if (available.length) revealSpot(available[Math.floor(Math.random() * available.length)]);
}

function undoLast() {
  const last = game.drawn.pop();
  if (!last) return;
  delete game.taken[last.spot];
  saveGame();
  document.getElementById("lastReveal").textContent = "Last draw undone.";
  render();
}

function exportHistory() {
  const rows = [["Draw Number","Spot","Prize","Buyer","Time","Unlock Swap"]];
  game.drawn.forEach((d, i) => rows.push([i+1, d.spot, d.prize.name, d.buyer || "", d.time, d.substituted ? "Yes" : "No"]));
  const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vvs-authority-history.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function openEditor() {
  renderPrizeEditor();
  document.getElementById("editor").classList.remove("hidden");
}

function renderPrizeEditor() {
  document.getElementById("spotCount").value = settings.totalSpots;
  const rows = document.getElementById("prizeRows");
  rows.innerHTML = "";
  settings.prizes.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "prize-row";
    row.innerHTML = `
      <input value="${escapeHtml(p.name)}" data-i="${idx}" data-field="name"/>
      <input type="number" value="${p.qty}" data-i="${idx}" data-field="qty"/>
      <select data-i="${idx}" data-field="tier">
        ${["red","gold","orange","green","blue","mega"].map(t => `<option value="${t}" ${p.tier === t ? "selected" : ""}>${t}</option>`).join("")}
      </select>
      <input type="number" min="0" max="100" value="${p.unlock || 0}" data-i="${idx}" data-field="unlock"/>
      <button data-remove="${idx}">×</button>
    `;
    rows.appendChild(row);
  });

  rows.querySelectorAll("[data-field]").forEach(el => {
    el.oninput = () => {
      const p = settings.prizes[Number(el.dataset.i)];
      p[el.dataset.field] = ["qty","unlock"].includes(el.dataset.field) ? Number(el.value) : el.value;
    };
  });
  rows.querySelectorAll("[data-remove]").forEach(btn => {
    btn.onclick = () => {
      settings.prizes.splice(Number(btn.dataset.remove), 1);
      renderPrizeEditor();
    };
  });
}

function saveAndBuildGame() {
  settings.totalSpots = Number(document.getElementById("spotCount").value) || 300;
  saveSettings();
  game = newGame();
  saveGame();
  document.getElementById("editor").classList.add("hidden");
  document.getElementById("lastReveal").textContent = "New game built and shuffled.";
  render();
}

function changePassword() {
  const next = prompt("Enter new admin password:");
  if (!next) return;
  settings.password = next;
  saveSettings();
  alert("Admin password changed.");
}

function escapeHtml(str) {
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}

document.getElementById("adminBtn").onclick = () => {
  if (!adminUnlocked) {
    document.getElementById("lockScreen").classList.remove("hidden");
  } else {
    adminMode = true;
    document.body.classList.remove("obs");
    render();
  }
};
document.getElementById("loginBtn").onclick = () => {
  const entered = document.getElementById("passwordInput").value;
  if (entered === settings.password) {
    adminUnlocked = true;
    adminMode = true;
    document.getElementById("lockScreen").classList.add("hidden");
    document.body.classList.remove("obs");
    render();
  } else {
    alert("Wrong password.");
  }
};
document.getElementById("audienceBtn").onclick = () => { adminMode = false; document.body.classList.remove("obs"); render(); };
document.getElementById("obsBtn").onclick = () => { adminMode = false; document.body.classList.add("obs"); render(); };
document.getElementById("randomBtn").onclick = randomSpot;
document.getElementById("undoBtn").onclick = undoLast;
document.getElementById("exportBtn").onclick = exportHistory;
document.getElementById("editorBtn").onclick = openEditor;
document.getElementById("closeEditor").onclick = () => document.getElementById("editor").classList.add("hidden");
document.getElementById("addPrizeBtn").onclick = () => { settings.prizes.push({ name:"New Prize", qty:1, tier:"red", unlock:0 }); renderPrizeEditor(); };
document.getElementById("saveGameBtn").onclick = saveAndBuildGame;
document.getElementById("resetBtn").onclick = () => {
  if (confirm("Reset and reshuffle this game?")) {
    game = newGame();
    saveGame();
    document.getElementById("lastReveal").textContent = "Game reset and reshuffled.";
    render();
  }
};
document.getElementById("changePassBtn").onclick = changePassword;
document.getElementById("closeModal").onclick = () => document.getElementById("revealModal").classList.add("hidden");
document.getElementById("revealModal").onclick = e => { if (e.target.id === "revealModal") e.currentTarget.classList.add("hidden"); };

render();
