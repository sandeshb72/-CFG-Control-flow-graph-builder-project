"use strict";
let vizInstance    = null;
let dotBefore      = "";
let dotAfter       = "";
let allBlocks      = [];
let allLoops       = [];
let currentCfgMode = "before";
let allData        = null;
async function initViz() {
  if (!vizInstance) vizInstance = await Viz.instance();
  return vizInstance;
}
let cfgScale = 1;
let cfgPanX = 0;
let cfgPanY = 0;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;
function zoomCfg(delta) {
  cfgScale += delta;
  if (cfgScale < 0.1) cfgScale = 0.1;
  if (cfgScale > 5) cfgScale = 5;
  applyCfgTransform();
}
function resetZoomCfg() {
  cfgScale = 1;
  cfgPanX = 0;
  cfgPanY = 0;
  applyCfgTransform();
}
function applyCfgTransform() {
  const svg = document.querySelector("#cfg-canvas svg");
  if (svg) {
    svg.style.transform = `translate(${cfgPanX}px, ${cfgPanY}px) scale(${cfgScale})`;
    svg.style.transition = isPanning ? "none" : "transform 0.1s ease-out";
  }
}
function initPanZoom() {
  const canvas = document.getElementById("cfg-canvas");
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    zoomCfg(delta);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.target.closest('.node')) return; 
    isPanning = true;
    startPanX = e.clientX - cfgPanX;
    startPanY = e.clientY - cfgPanY;
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    cfgPanX = e.clientX - startPanX;
    cfgPanY = e.clientY - startPanY;
    applyCfgTransform();
  });
  window.addEventListener('mouseup', () => {
    isPanning = false;
    canvas.style.cursor = 'grab';
    applyCfgTransform();
  });
}
// Redundant initialization removed to prevent ReferenceError before variables are defined
function tacToC(tac) {
  if (!tac) return tac;
  const s = String(tac).trim();
  if (s === "nop") return "";
  if (/^return\s*$/.test(s)) return "return;";
  if (/^return\s+(.+)$/.test(s)) return s.replace(/^return\s+/, "return ") + ";";
  if (/^goto\s+/.test(s)) return s + ";";
  const ifMatch = s.match(/^if\s+(.+?)\s+goto\s+(\S+)\s+else\s+goto\s+(\S+)$/);
  if (ifMatch) return `if (${ifMatch[1]}) goto ${ifMatch[2]}; else goto ${ifMatch[3]};`;
  const lblMatch = s.match(/^\[label:\s*(.+)\]$/);
  if (lblMatch) return `${lblMatch[1]}:`;
  const callMatch = s.match(/^(\S+)\s*=\s*call\s+(\S+)\(([^)]*)\)$/);
  if (callMatch) return `${callMatch[1]} = ${callMatch[2]}(${callMatch[3]});`;
  if (/^param\s+/.test(s)) return ``;
  const assignMatch = s.match(/^(\S+)\s*=\s*(.+)$/);
  if (assignMatch) {
    const lhs = assignMatch[1];
    const rhs = assignMatch[2].trim();
    if (lhs.startsWith("_t") && !rhs.includes(" ")) return null; 
    return `${lhs} = ${rhs};`;
  }
  return s + ";";
}
function formatInstr(text, asC = true) {
  if (!asC) return escHtml(text);
  const c = tacToC(text);
  return c === null ? null : escHtml(c);
}
function togglePass(inputId, wrapperId) {
  const cb = document.getElementById(inputId);
  const sw = document.querySelector(`#${wrapperId} .pass-switch`);
  cb.checked = !cb.checked;
  sw.classList.toggle("active", cb.checked);
}
function switchTab(name, btn) {
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => {
    c.classList.add("hidden"); c.classList.remove("active");
  });
  btn.classList.add("active");
  const panel = document.getElementById("tab-" + name);
  panel.classList.remove("hidden");
  panel.classList.add("active");
}
function switchCfg(which) {
  currentCfgMode = which;
  document.getElementById("btn-before").classList.toggle("active", which === "before");
  document.getElementById("btn-after").classList.toggle("active",  which === "after");
  document.getElementById("cfg-mode-label").textContent =
    which === "before" ? "BEFORE OPTIMIZATION" : "AFTER OPTIMIZATION";
  renderDot(which === "before" ? dotBefore : dotAfter);
}
async function renderDot(dot) {
  const canvas = document.getElementById("cfg-canvas");
  if (!dot) { canvas.innerHTML = "<p style='color:#64748b;padding:1rem'>No graph output.</p>"; return; }
  try {
    const viz = await initViz();
    const svg = viz.renderSVGElement(dot);
    svg.style.width = "100%"; svg.style.height = "auto";
    canvas.innerHTML = "";
    canvas.appendChild(svg);
    applyCfgTransform();
  } catch (e) {
    canvas.innerHTML = `<pre style="color:#fca5a5;font-size:.72rem;padding:1rem">${escHtml(dot)}</pre>`;
  }
}
let currentPipeline = ['fold', 'prop', 'fold', 'dce', 'unreachable', 'dce', 'licm'];
const PASS_NAMES = {
  'fold': 'Constant Folding',
  'prop': 'Value Propagation',
  'dce': 'Dead Code Elimination',
  'unreachable': 'Unreachable Removal',
  'licm': 'Loop Invariant CM'
};
function renderPipelineBuilder() {
  const list = document.getElementById('pipeline-list');
  list.innerHTML = currentPipeline.map((pass, index) => `
    <li class="pipeline-item">
      <span><span style="color:var(--text-muted);font-family:var(--mono);margin-right:0.4rem;">${index + 1}.</span> ${PASS_NAMES[pass] || pass}</span>
      <div class="btn-group">
        <button title="Move Up" onclick="movePass(${index}, -1)" ${index === 0 ? 'disabled style="opacity:0.2"' : ''}>▲</button>
        <button title="Move Down" onclick="movePass(${index}, 1)" ${index === currentPipeline.length - 1 ? 'disabled style="opacity:0.2"' : ''}>▼</button>
        <button title="Remove" class="del-btn" onclick="removePass(${index})">✕</button>
      </div>
    </li>
  `).join('');
}
function addPass() {
  const sel = document.getElementById('add-pass-select');
  currentPipeline.push(sel.value);
  renderPipelineBuilder();
}
function removePass(index) {
  currentPipeline.splice(index, 1);
  renderPipelineBuilder();
}
function movePass(index, dir) {
  if (index + dir < 0 || index + dir >= currentPipeline.length) return;
  const temp = currentPipeline[index];
  currentPipeline[index] = currentPipeline[index + dir];
  currentPipeline[index + dir] = temp;
  renderPipelineBuilder();
}
function resetPipeline() {
  currentPipeline = ['fold', 'prop', 'fold', 'dce', 'unreachable', 'dce', 'licm'];
  renderPipelineBuilder();
}
document.addEventListener("DOMContentLoaded", () => {
  renderPipelineBuilder();
  initPanZoom();
});
async function analyze() {
  const code = document.getElementById("code-input").value.trim();
  if (!code) return;
  setStatus("running");
  showSpinner(true);
  clearResults();
  const options = {
    sequence: currentPipeline
  };
  try {
    const res  = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, options }),
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || "Unknown error"); setStatus("error"); return; }
    allData = data;
    await renderResults(data);
    setStatus("done");
  } catch (err) {
    showError("Network error: " + err.message);
    setStatus("error");
  } finally {
    showSpinner(false);
  }
}
async function renderResults(data) {
  const s = data.stats;
  setPill("pill-blocks", s.block_count);
  setPill("pill-edges",  s.edge_count);
  setPill("pill-fold",   s.folded);
  setPill("pill-prop",   s.propagated);
  setPill("pill-dce",    s.dead_removed);
  setPill("pill-unr",    s.unreachable);
  setPill("pill-loops",  data.loops.length);
  setPill("pill-ms",     s.elapsed_ms + " ms");
  dotBefore = data.dot_before;
  dotAfter  = data.dot_after;
  document.getElementById("cfg-placeholder").style.display = "none";
  document.getElementById("cfg-canvas").classList.remove("hidden");
  currentCfgMode = "before";
  document.getElementById("btn-before").classList.add("active");
  document.getElementById("btn-after").classList.remove("active");
  document.getElementById("cfg-mode-label").textContent = "BEFORE OPTIMIZATION";
  await renderDot(dotBefore);
  renderAnalysis(data.analysis.uninitialized, data.analysis.dead_assignments);
  allBlocks = data.blocks;
  allLoops  = data.loops;
  renderOptLog(data.blocks);
  renderBlocks(data.blocks);
  renderLoops(data.loops);
  if (data.errors && data.errors.length)
    showError("Pipeline warnings:\n" + data.errors.join("\n"));
}
function setPill(id, val) {
  document.querySelector(`#${id} .pill-val`).textContent = val;
}
function renderAnalysis(uninit, dead) {
  const uninitList  = document.getElementById("uninit-list");
  const uninitCount = document.getElementById("uninit-count");
  uninitCount.textContent = uninit.length;
  uninitList.innerHTML = !uninit.length
    ? `<li class="ok">✅ No uninitialized variables detected</li>`
    : uninit.map(u => `<li class="bad">Block <b>${u.block}</b> — variable <code>${escHtml(u.var)}</code> used before assignment</li>`).join("");
  const deadList  = document.getElementById("dead-list");
  const deadCount = document.getElementById("dead-count");
  deadCount.textContent = dead.length;
  deadList.innerHTML = !dead.length
    ? `<li class="ok">✅ No dead assignments found</li>`
    : dead.map(d => `<li class="bad">Block <b>${d.block}</b>[${d.instr}] — <code>${escHtml(d.var)}</code> assigned but never used</li>`).join("");
}
function renderOptLog(blocks) {
  const list    = document.getElementById("opt-log-list");
  const summary = document.getElementById("log-summary");
  let counts = { Folded: 0, Propagated: 0, Removed: 0, Moved: 0 };
  let items  = [];
  blocks.forEach(b => {
    b.instructions.forEach(i => {
      if (i.type) { counts[i.type] = (counts[i.type] || 0) + 1; items.push({ block: b.id, ...i }); }
    });
  });
  const chipMap   = { Folded:"fold", Propagated:"prop", Removed:"dce", Moved:"moved" };
  const chipLabel = { Folded:"Folded", Propagated:"Propagated", Removed:"DCE'd", Moved:"LICM Moved" };
  summary.style.display = items.length ? "flex" : "none";
  summary.innerHTML = Object.entries(counts).filter(([,v])=>v>0)
    .map(([k,v]) => `<div class="log-chip ${chipMap[k]}">${v} ${chipLabel[k]}</div>`).join("");
  if (!items.length) { list.innerHTML = `<li class="placeholder-item">No optimizations were applied.</li>`; return; }
  list.innerHTML = items.map(item => {
    const cls  = item.type.toLowerCase();
    const orig = item.original ? `<br><span class="log-orig">${escHtml(item.original)}</span>` : "";
    const cCode = formatInstr(item.text, true) || escHtml(item.text);
    return `<li>
      <span class="log-block-id">B${item.block}</span>
      <span class="badge ${cls}">${item.type.toUpperCase().slice(0,4)}</span>
      <span class="log-instr">${cCode}${orig}</span>
    </li>`;
  }).join("");
}
function renderBlocks(blocks) {
  const container = document.getElementById("blocks-container");
  if (!blocks || !blocks.length) { container.innerHTML = "<p class='placeholder-item'>No blocks to show.</p>"; return; }
  container.innerHTML = blocks.map(b => {
    const hasOpts = b.instructions.some(i => i.type);
    const instrHtml = b.instructions.length
      ? b.instructions.map(i => {
          if (!i.text || i.text === "nop") return "";
          const cls   = i.type ? `diff-${i.type.toLowerCase()}` : "";
          const badge = i.type ? `<span class="badge ${i.type.toLowerCase()}">${i.type.toUpperCase().slice(0,4)}</span>` : "";
          const display = formatInstr(i.text, true);
          if (display === null) return "";
          return `<li class="${cls}">${badge}<span>${display}</span></li>`;
        }).filter(Boolean).join("")
      : `<li style="color:var(--text-muted);font-style:italic">(empty)</li>`;
    const searchable = (b.label + " " + b.instructions.map(i=>i.text).join(" ")).toLowerCase();
    return `<div class="block-card" data-block-id="${b.id}" data-search="${escAttr(searchable)}" onclick="openBlockExplorer(${b.id})">
      <div class="block-card-header">
        <span class="block-id">Block ${b.id}</span>
        <span class="block-label">${escHtml(b.label || "")}</span>
        ${hasOpts ? `<span class="block-opt-flag">🔧 optimized</span>` : ""}
        <span class="block-instr-count">${b.instructions.filter(i=>i.text&&i.text!=="nop").length} instr</span>
      </div>
      <ul class="block-instrs">${instrHtml}</ul>
      <div class="block-click-hint">Click to explore block transformations →</div>
    </div>`;
  }).join("");
}
function filterBlocks() {
  const q = document.getElementById("block-search").value.toLowerCase();
  document.querySelectorAll(".block-card").forEach(card => {
    card.style.display = card.dataset.search.includes(q) ? "" : "none";
  });
}
function openBlockExplorer(blockId) {
  const b = allBlocks.find(x => x.id === blockId);
  if (!b) return;
  const beforeInstrs   = b.before_instructions || [];
  const afterInstrs    = b.instructions || [];
  const edgesBefore    = b.edges_before || [];
  const edgesAfter     = b.edges || [];
  const optimizations  = b.optimizations || [];
  const edgeCols = { true:"#27ae60", false:"#e74c3c", back:"#9b59b6", fall:"#64748b",
                     return:"#e67e22", break:"#e74c3c", continue:"#14b8a6", call:"#3498db" };
  function renderEdges(edges) {
    if (!edges || !edges.length) return `<span style="color:var(--text-muted)">No connections</span>`;
    return edges.map(e => {
      const dir   = e.to !== undefined ? `→ Block ${e.to}` : `← Block ${e.from}`;
      const col   = edgeCols[e.kind] || "#64748b";
      return `<span class="edge-pill" style="border-color:${col};color:${col}">${dir} <em>${e.kind}</em></span>`;
    }).join("");
  }
  const beforeHtml = beforeInstrs.length
    ? beforeInstrs.map(t => {
        const c = tacToC(t); if (c===null) return "";
        return `<li class="bex-before-row"><code>${escHtml(c)}</code></li>`;
      }).filter(Boolean).join("")
    : `<li style="color:var(--text-muted)">(no instructions)</li>`;
  const edgesBeforeHtml = renderEdges(edgesBefore);
  let stepsHtml = "";
  if (optimizations.length === 0) {
    stepsHtml = `<div class="bex-no-opt">✅ No optimizations applied to this block.</div>`;
  } else {
    stepsHtml = optimizations.map(i => {
      const cls    = i.type.toLowerCase();
      const labels = { Folded:"⚡ Constant Folding", Propagated:"→ Constant Propagation",
                       Removed:"✂ Dead Code Eliminated", Moved:"⬆ LICM: Hoisted" };
      const orig = i.original ? `<div class="bex-orig">Was: <code>${escHtml(tacToC(i.original) || i.original)}</code></div>` : "";
      const now  = formatInstr(i.text, true);
      return `<div class="bex-step ${cls}">
        <div class="bex-step-header">
          <span class="badge ${cls}">${i.type.toUpperCase().slice(0,4)}</span>
          <strong>${labels[i.type] || i.type}</strong>
        </div>
        ${orig}
        <div class="bex-now">After: <code>${now || escHtml(i.text)}</code></div>
      </div>`;
    }).join("");
  }
  const edgesAfterHtml = renderEdges(edgesAfter);
  const afterHtml = afterInstrs.length
    ? afterInstrs.map(i => {
        if (!i.text || i.text === "nop") return "";
        const cls = i.type ? `diff-${i.type.toLowerCase()}` : "";
        const badge = i.type ? `<span class="badge ${i.type.toLowerCase()}">${i.type.toUpperCase().slice(0,4)}</span>` : "";
        const display = formatInstr(i.text, true);
        if (display === null) return "";
        return `<li class="bex-after-row ${cls}">${badge}<code>${display}</code></li>`;
      }).filter(Boolean).join("")
    : `<li style="color:var(--text-muted)">(empty after optimization)</li>`;
  document.getElementById("bex-block-title").textContent = `Block ${b.id}  [${b.label || ""}]`;
  document.getElementById("bex-edges-before").innerHTML = edgesBeforeHtml;
  document.getElementById("bex-edges").innerHTML        = edgesAfterHtml;
  document.getElementById("bex-before-list").innerHTML  = beforeHtml || `<li style="color:var(--text-muted)">(no visible code)</li>`;
  document.getElementById("bex-steps").innerHTML        = stepsHtml;
  document.getElementById("bex-after-list").innerHTML   = afterHtml || `<li style="color:var(--text-muted)">(no visible code)</li>`;
  document.getElementById("block-flow-panel").classList.remove("hidden");
}
function closeBlockExplorer() {
  document.getElementById("block-flow-panel").classList.add("hidden");
}
function renderLoops(loops) {
  const container = document.getElementById("loops-container");
  if (!loops || !loops.length) {
    container.innerHTML = "<p class='placeholder-item'>No loops detected in this program.</p>";
    return;
  }
  container.innerHTML = loops.map((lp, i) => {
    const licmHtml = lp.licm_count
      ? `<div class="licm-title">💡 ${lp.licm_count} loop-invariant computation(s) hoisted:</div>
         <ul class="licm-list">${lp.licm.map(s => {
           const c = tacToC(s);
           return `<li>${escHtml(c || s)}</li>`;
         }).join("")}</ul>`
      : `<p style="font-size:.72rem;color:var(--text-muted)">No loop-invariant code found.</p>`;
    return `<div class="loop-card">
      <div class="loop-card-header">
        <span class="loop-card-title">Loop ${i+1} — Header: Block ${lp.header}</span>
        <span class="loop-card-meta">back-edge: ${lp.back_edge[0]}→${lp.back_edge[1]}</span>
      </div>
      <div class="loop-card-body">
        <div class="loop-body-blocks">Body Blocks: { ${lp.body.join(", ")} }</div>
        ${licmHtml}
      </div>
    </div>`;
  }).join("");
}
function clearResults() {
  document.getElementById("error-box").classList.add("hidden");
  document.getElementById("cfg-placeholder").style.display = "flex";
  document.getElementById("cfg-canvas").innerHTML = "";
  document.getElementById("cfg-canvas").classList.add("hidden");
  document.getElementById("uninit-list").innerHTML  = `<li class="placeholder-item">Analyzing…</li>`;
  document.getElementById("dead-list").innerHTML    = `<li class="placeholder-item">Analyzing…</li>`;
  document.getElementById("uninit-count").textContent = "—";
  document.getElementById("dead-count").textContent   = "—";
  document.getElementById("opt-log-list").innerHTML  = `<li class="placeholder-item">Analyzing…</li>`;
  document.getElementById("log-summary").style.display = "none";
  document.getElementById("blocks-container").innerHTML = `<p class="placeholder-item">Analyzing…</p>`;
  document.getElementById("loops-container").innerHTML  = `<p class="placeholder-item">Analyzing…</p>`;
  ["pill-blocks","pill-edges","pill-fold","pill-prop","pill-dce","pill-unr","pill-loops","pill-ms"]
    .forEach(id => document.querySelector(`#${id} .pill-val`).textContent = "—");
}
function setStatus(s) {
  document.getElementById("status-dot").className = `status-dot ${s}`;
  const btn  = document.getElementById("run-btn");
  const icon = document.getElementById("run-btn-icon");
  const text = document.getElementById("run-btn-text");
  if (s === "running") { icon.textContent = "⏳"; text.textContent = "Analyzing…"; btn.disabled = true; }
  else                  { icon.textContent = "▶";  text.textContent = "Run Pipeline"; btn.disabled = false; }
}
function showSpinner(on) { document.getElementById("spinner").classList.toggle("hidden", !on); }
function showError(msg)  {
  const box = document.getElementById("error-box");
  box.textContent = msg; box.classList.remove("hidden");
}
function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function escAttr(str) { return String(str).replace(/"/g,"&quot;"); }
document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") analyze();
  if (e.key === "Escape") closeBlockExplorer();
});