/* Carte Stellaire Manhwa (Foundry v12/v13) — carte de The Last Horizon en plein écran, par-dessus Foundry */
const MOD = "carte-stellaire-manhwa";
const SOCKET = `module.${MOD}`;
let overlay = null, frame = null, frameReady = false, pending = [];

function wbApi() { const m = game.modules.get("last-horizon-worldbook"); return m?.active ? m.api : null; }
function wbOk() { if (!wbApi()?.open) return false; if (game.user.isGM) return true; try { return !!game.settings.get("last-horizon-worldbook", "playersCanOpen"); } catch (e) { return true; } }
/* 1.11 — Flotte : les Groupes MJ viennent de la Fiche (MANHWA.gmGroups) */
function gmGroupsInfo() { let list = [], mine = []; try { const G = globalThis.MANHWA?.gmGroups; list = (G?.list?.() || []).map(g => ({ id: g.id, name: g.name, color: g.color })); mine = game.user.isGM ? [] : (G?.ofUser?.(game.user) || []).map(g => g.id); } catch (e) { } return { groups: list, mine }; }
function fleetMsg() { return { type: "fleet", fleet: game.settings.get(MOD, "fleet") || { units: {}, fog: true }, isGM: game.user.isGM, ...gmGroupsInfo() }; }
function canOpen() { return game.user.isGM || game.settings.get(MOD, "playersCanOpen"); }
function post(msg) { if (!frame?.contentWindow) return; if (!frameReady && msg.type !== "init") { pending.push(msg); return; } frame.contentWindow.postMessage({ src: "csm-host", ...msg }, "*"); }

function build() {
  overlay = document.createElement("div");
  overlay.id = "csm-overlay";
  frame = document.createElement("iframe");
  frame.className = "csm-frame";
  frame.setAttribute("allow", "fullscreen; autoplay");
  frame.allowFullscreen = true;
  frame.src = `modules/${MOD}/app/carte.html?v=${game.modules.get(MOD)?.version ?? ""}`;
  overlay.appendChild(frame);
  /* commandes façon Manhwa : réduire en barre / fermer (mêmes boutons 3D que les autres grandes fenêtres) */
  const ctl = document.createElement("div"); ctl.className = "ms-fs-ctl csm-ctl";
  ctl.innerHTML = `<div class="ms-fs-r"><button type="button" class="ms-fs-btn" data-c="min" data-tooltip="Réduire en barre"><i class="fa-solid fa-minus"></i></button><button type="button" class="ms-fs-btn x" data-c="quit" data-tooltip="Fermer la carte"><i class="fa-solid fa-xmark"></i></button></div>`;
  const bar = document.createElement("div"); bar.className = "csm-bar"; bar.dataset.c = "restore"; bar.dataset.tooltip = "Clic : agrandir · clic droit : fermer";
  bar.innerHTML = `<i class="ic fa-solid fa-star-and-crescent"></i><b>Carte stellaire</b><span class="hint">Agrandir</span><i class="up fa-solid fa-up-right-and-down-left-from-center"></i><button type="button" class="x" data-c="quit" data-tooltip="Fermer"><i class="fa-solid fa-xmark"></i></button>`;
  const act = ev => { const b = ev.target.closest("[data-c]"); if (!b) return; ev.preventDefault(); ev.stopPropagation(); const c = b.dataset.c; if (c === "min") minimize(true); else if (c === "restore") minimize(false); else if (c === "quit") close(); };
  ctl.addEventListener("click", act); bar.addEventListener("click", act); bar.addEventListener("contextmenu", ev => { ev.preventDefault(); close(); });
  overlay.append(ctl, bar);
  document.body.appendChild(overlay);
}
function minimize(on) { if (!overlay) return; overlay.classList.toggle("min", !!on); overlay.classList.toggle("ms-fs-min-ext", !!on); if (on) overlay.dataset.minAt = Date.now(); else for (const v of ["--ms-fs-x", "--ms-fs-w", "--ms-fs-b"]) overlay.style.removeProperty(v); try { globalThis.msFsLayout?.(); } catch (e) {} document.body.classList.toggle("csm-open", !on); post({ type: on ? "hidden" : "visible" }); if (!on) setTimeout(() => { try { frame?.contentWindow?.focus(); } catch (e) {} }, 50); }

function open(goto) {
  if (!overlay) build();
  overlay.classList.add("open"); overlay.classList.remove("min");
  document.body.classList.add("csm-open");
  if (frameReady) post({ type: "visible" });
  if (goto) post({ type: "goto", lvl: goto.lvl, view: goto.view });
  setTimeout(() => { try { frame?.contentWindow?.focus(); } catch (e) { frame?.focus(); } }, 50);
}
function close() {
  if (!overlay) return;
  overlay.classList.remove("open", "min", "ms-fs-min-ext"); try { globalThis.msFsLayout?.(); } catch (e) {}
  document.body.classList.remove("csm-open");
  post({ type: "hidden" });
}
function isOpen() { return !!overlay?.classList.contains("open"); }

window.addEventListener("message", (ev) => {
  const d = ev.data;
  if (!d || d.src !== "csm" || !frame || ev.source !== frame.contentWindow) return;
  switch (d.type) {
    case "ready": {
      frameReady = true;
      frame.contentWindow.postMessage({ src: "csm-host", type: "init", isGM: game.user.isGM, wb: wbOk(), group: null, fleet: game.settings.get(MOD, "fleet") || { units: {}, fog: true }, ...gmGroupsInfo() }, "*");
      const q = pending.splice(0); q.forEach(m => frame.contentWindow.postMessage({ src: "csm-host", ...m }, "*"));
      if (!isOpen()) post({ type: "hidden" });
      break;
    }
    case "close": close(); break;
    case "set-group": break;
    case "set-fleet":
      if (game.user.isGM && d.fleet) game.settings.set(MOD, "fleet", d.fleet);
      break;
    case "show-trip":
      if (!game.user.isGM) break;
      game.socket.emit(SOCKET, { type: "show-trip", gid: d.gid, trip: d.trip });
      ui.notifications?.info("Voyage montré aux joueurs.");
      break;
    case "show":
      if (!game.user.isGM) break;
      game.socket.emit(SOCKET, { type: "show", lvl: d.lvl, view: d.view });
      ui.notifications?.info("Carte stellaire montrée aux joueurs.");
      break;
    case "open-world": {
      const api = wbApi(); if (!api?.open || !wbOk()) break;
      close(); api.open(d.world);
      break;
    }
  }
});

Hooks.once("init", () => {
  game.settings.register(MOD, "playersCanOpen", {
    name: "Les joueurs peuvent ouvrir la carte",
    hint: "Si désactivé, seul le MJ voit le bouton (« Montrer aux joueurs » ouvre quand même la carte chez eux).",
    scope: "world", config: true, type: Boolean, default: true,
    onChange: () => ui.controls?.render?.(true)
  });
  game.settings.register(MOD, "group", {
    scope: "world", config: false, type: Object, default: {},
    onChange: () => {}
  });
  game.settings.register(MOD, "fleet", {
    scope: "world", config: false, type: Object, default: { units: {}, fog: true },
    onChange: () => post(fleetMsg())
  });
  game.modules.get(MOD).api = { open, close, isOpen, show: (lvl, view) => { if (game.user.isGM) game.socket.emit(SOCKET, { type: "show", lvl, view }); } };
});

Hooks.once("ready", () => {
  game.socket.on(SOCKET, (d, userId) => {
    const from = userId ? game.users.get(userId) : null;
    if (from && !from.isGM) return;
    if (d?.type === "show" && !game.user.isGM) open({ lvl: d.lvl, view: d.view });
    if (d?.type === "show-trip" && !game.user.isGM) { open(); post({ type: "play-trip", gid: d.gid, trip: d.trip }); }
  });
  Hooks.on("manhwaGmGroups", () => post(fleetMsg()));
  /* migration : l'ancien marqueur « Groupe » devient la position du premier Groupe MJ */
  if (game.user.isGM) { try { const f = game.settings.get(MOD, "fleet") || {}; const g = game.settings.get(MOD, "group") || {};
    if (!Object.keys(f.units || {}).length && g.loc) { const gid = gmGroupsInfo().groups[0]?.id || "_main"; const pos = { ...g.loc, x: +g.x, y: +g.y }; const seen = { g: {}, s: {}, p: {} }; if (pos.eos) seen.g.eos = 1; if (pos.gal) seen.g[pos.gal] = 1; if (pos.sys) seen.s[`${pos.gal}|${pos.sys}`] = 1;
      game.settings.set(MOD, "fleet", { fog: true, units: { [gid]: { kind: g.icon === "ship" || !g.icon ? "ship" : "pos", model: "navette", icon: g.icon === "ship" ? "compass" : g.icon, name: g.label && g.label !== "GROUPE" ? g.label : "", color: g.color && g.color !== "#ffd070" ? g.color : "", pub: true, hidden: !!g.hidden, boxOff: !!g.boxOff, spd: 1, pos, seen } } }); } } catch (e) { console.warn("Carte stellaire : migration du groupe", e); } }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen() && !overlay.classList.contains("min") && document.activeElement !== frame) { e.stopPropagation(); e.preventDefault(); close(); } }, true);
});

/* Bouton dans les contrôles de scène (v13 : notes ; v12 : tableau) */
Hooks.on("getSceneControlButtons", (controls) => {
  if (!canOpen()) return;
  const tool = {
    name: "csm-open", title: "Carte stellaire", icon: "fa-solid fa-star-and-crescent", button: true, order: 98
  };
  const toggle = () => (isOpen() && !overlay.classList.contains("min") ? close() : open());
  if (Array.isArray(controls)) {
    tool.onClick = toggle;
    const notes = controls.find(c => c.name === "notes") || controls[0];
    notes.tools.push(tool);
  } else {
    tool.onChange = toggle;
    const notes = controls.notes || controls.tokens;
    if (notes) notes.tools["csm-open"] = tool;
  }
});
