(() => {
  const STORE = "omnifit-v1";
  const WATER_CUP_ML = 250;
  const STEP_GOAL = 8000;
  const STEP_CHUNK = 500;
  const STEP_CAL = 20;

  const ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>',
    workout: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7.2" y="11" width="9.6" height="2" rx="1"/><rect x="2" y="7" width="2.5" height="10" rx="0.9"/><rect x="4.5" y="8.4" width="2.1" height="7.2" rx="0.7"/><rect x="17.4" y="8.4" width="2.1" height="7.2" rx="0.7"/><rect x="19.5" y="7" width="2.5" height="10" rx="0.9"/></svg>',
    nutrition: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z"/></svg>',
    progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>'
  };

  let state = load();
  let view = "home";
  let filter = "All";
  let foodMeal = "breakfast";
  let foodQuery = "";
  let selectedDay = todayKey();
  let toastTimer = 0;
  let playerTimer = 0;
  let splashDone = false;
  let scan = { image: "", status: "idle", error: "", result: null, note: "" };
  let lastView = "";
  let photoTarget = "scan";
  let composition = [];
  let pendingBody = { image: "", pose: "Front", note: "" };
  let viewingBody = null;
  const BODY_POSES = ["Front", "Side", "Back"];

  function todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function parseKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(key, n) {
    const d = parseKey(key);
    d.setDate(d.getDate() + n);
    return todayKey(d);
  }

  function defaultDay(date) {
    return {
      date,
      steps: 0,
      waterMl: 0,
      meals: [],
      workoutId: null,
      workoutCompleted: false,
      activeMinutes: 0,
      caloriesBurned: 0
    };
  }

  function defaultState() {
    const t = todayKey();
    return {
      onboarded: false,
      profile: {
        name: "",
        goal: "maintain",
        calorieGoal: 2100,
        proteinGoal: 140,
        carbGoal: 200,
        fatGoal: 70,
        waterGoalMl: 2000,
        stepGoal: STEP_GOAL,
        weight: 151
      },
      theme: "dark",
      day: defaultDay(t),
      history: {},
      weights: [],
      progressCleared: true
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return defaultState();
      const s = JSON.parse(raw);
      if (!s.day || !s.profile) return defaultState();
      if (s.theme !== "light" && s.theme !== "dark") s.theme = "dark";
      if (!s.progressCleared) {
        s.history = {};
        s.weights = [];
        if (s.day) {
          s.day.workoutId = null;
          s.day.workoutCompleted = false;
          s.day.activeMinutes = 0;
        }
        s.progressCleared = true;
      }
      return s;
    } catch {
      return defaultState();
    }
  }

  function save() {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function openCompDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("omnifit-comp", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function loadComposition() {
    try {
      const db = await openCompDb();
      const list = await new Promise((resolve, reject) => {
        const tx = db.transaction("photos", "readonly");
        const req = tx.objectStore("photos").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      composition = list.sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : a.date < b.date ? 1 : -1));
    } catch {
      composition = [];
    }
  }

  async function putCompPhoto(photo) {
    const db = await openCompDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").put(photo);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    composition = [photo, ...composition.filter((p) => p.id !== photo.id)];
  }

  async function removeCompPhoto(id) {
    const db = await openCompDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    composition = composition.filter((p) => p.id !== id);
  }

  function changeWater(cups) {
    const goal = state.profile.waterGoalMl;
    state.day.waterMl = Math.max(0, Math.min(goal, state.day.waterMl + cups * WATER_CUP_ML));
    save();
    render();
  }

  function changeSteps(dir) {
    if (dir < 0) {
      const take = Math.min(STEP_CHUNK, state.day.steps);
      if (!take) return;
      state.day.steps -= take;
      state.day.caloriesBurned = Math.max(0, state.day.caloriesBurned - Math.round((take / STEP_CHUNK) * STEP_CAL));
    } else {
      state.day.steps += STEP_CHUNK;
      state.day.caloriesBurned += STEP_CAL;
    }
    save();
    render();
  }

  function applyTheme() {
    const theme = state.theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#FFFFFF" : "#121212");
  }

  function rollDay() {
    const t = todayKey();
    if (state.day.date === t) return;
    const old = state.day;
    const macros = mealTotals(old.meals);
    state.history[old.date] = {
      date: old.date,
      steps: old.steps,
      waterMl: old.waterMl,
      caloriesIn: macros.cal,
      caloriesOut: old.caloriesBurned,
      minutes: old.activeMinutes,
      workoutName: old.workoutId ? (WORKOUTS.find((w) => w.id === old.workoutId) || {}).name || "" : "",
      workoutId: old.workoutId,
      weight: state.profile.weight
    };
    state.day = defaultDay(t);
    save();
  }

  function mealTotals(meals) {
    return meals.reduce(
      (a, m) => ({
        cal: a.cal + m.cal,
        p: a.p + m.p,
        c: a.c + m.c,
        f: a.f + m.f
      }),
      { cal: 0, p: 0, c: 0, f: 0 }
    );
  }

  function isStandalone() {
    return window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  }

  function isIos() {
    return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function installHint() {
    if (!isIos() || isStandalone() || sessionStorage.getItem("hide-install")) return "";
    return `<div class="install-hint">
        <strong>Safari is still in browser mode</strong>
        <p>Tap Share, then Add to Home Screen. On the add sheet, leave Open as Web App on. Open OmniFit from the new icon — not from Safari.</p>
        <button class="btn btn-ghost" data-act="hide-install">Got it</button>
      </div>`;
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  function dateLabel(d = new Date()) {
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }

  function plannedToday() {
    const id = WEEKLY_ROTATION[new Date().getDay()];
    return WORKOUTS.find((w) => w.id === id) || WORKOUTS[0];
  }

  function snapshotFor(key) {
    if (key === state.day.date) {
      const t = mealTotals(state.day.meals);
      const w = state.day.workoutId ? WORKOUTS.find((x) => x.id === state.day.workoutId) : null;
      return {
        date: key,
        steps: state.day.steps,
        waterMl: state.day.waterMl,
        caloriesIn: t.cal,
        caloriesOut: state.day.caloriesBurned,
        minutes: state.day.activeMinutes,
        workoutName: w ? w.name : "",
        workoutId: state.day.workoutId,
        completed: state.day.workoutCompleted
      };
    }
    return state.history[key] || {
      date: key,
      steps: 0,
      waterMl: 0,
      caloriesIn: 0,
      caloriesOut: 0,
      minutes: 0,
      workoutName: "",
      workoutId: null
    };
  }

  function dailyScore() {
    const p = state.profile;
    const t = mealTotals(state.day.meals);
    const workout = state.day.workoutCompleted ? 1 : state.day.activeMinutes > 0 ? 0.4 : 0;
    const food = t.cal === 0 ? 0 : Math.max(0, 1 - Math.abs(t.cal - p.calorieGoal) / p.calorieGoal);
    const water = Math.min(1, state.day.waterMl / p.waterGoalMl);
    const steps = Math.min(1, state.day.steps / p.stepGoal);
    return Math.round((workout * 0.4 + food * 0.3 + water * 0.15 + steps * 0.15) * 100);
  }

  function ringSVG(size, progress, track = 10) {
    const r = (size - track) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, progress));
    const dash = `${c * pct} ${c}`;
    const arc =
      pct < 0.012
        ? ""
        : `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#68B3E8" stroke-width="${track}"
        stroke-linecap="round" stroke-dasharray="${dash}" />`;
    return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#555555" stroke-width="${track}" />
      ${arc}
    </svg>`;
  }

  function fmt(n) {
    return Math.round(n).toLocaleString("en-US");
  }

  function initials() {
    const n = (state.profile.name || "You").trim();
    const parts = n.split(/\s+/);
    return ((parts[0] || "Y")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  }

  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle("player-toast", view === "player");
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1600);
  }

  function esc(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function brand() {
    return `<button class="brand" data-act="home" aria-label="OmniFit home">
      <img class="brand-mark" src="assets/omnifit-e-icon-master.png" alt="" />
      <span class="wordmark"><span class="omni">Omni</span><span class="fit">Fit</span></span>
    </button>`;
  }

  function topbar(right) {
    return `<header class="topbar">${brand()}${right}</header>`;
  }

  function tabs() {
    const items = [
      ["home", "Home", ICONS.home],
      ["workout", "Workout", ICONS.workout],
      ["nutrition", "Nutrition", ICONS.nutrition],
      ["progress", "Progress", ICONS.progress]
    ];
    return `<nav class="tabbar" aria-label="Primary">${items
      .map(
        ([id, label, icon]) =>
          `<button class="tab ${view === id ? "on" : ""}" data-act="${id}" aria-current="${view === id ? "page" : "false"}">${icon}${label}</button>`
      )
      .join("")}</nav>`;
  }

  function renderHome() {
    const score = dailyScore();
    const t = mealTotals(state.day.meals);
    const p = state.profile;
    const w = plannedToday();
    const name = state.profile.name ? `, ${esc(state.profile.name.split(" ")[0])}` : "";
    const done = state.day.workoutCompleted;
    return `${topbar(`<button class="avatar" data-act="profile" aria-label="Profile">${esc(initials())}</button>`)}
      <section class="screen">
        <div class="kicker">${esc(dateLabel())}</div>
        <h1 class="hello">${greeting()}${name}</h1>
        <div class="card hero hero-home">
          <div class="ring-wrap">
            ${ringSVG(108, score / 100, 10)}
            <div class="ring-center"><div class="ring-num">${score}</div><div class="ring-sub">Today</div></div>
          </div>
          <div class="hero-stats">
            <div class="stat-row"><span class="label">Fuel</span><span class="val">${fmt(t.cal)} <em>/ ${fmt(p.calorieGoal)}</em></span></div>
            <div class="stat-row"><span class="label">Water</span><span class="val">${(state.day.waterMl / 1000).toFixed(1)} <em>/ ${(p.waterGoalMl / 1000).toFixed(1)} L</em></span></div>
            <div class="stat-row"><span class="label">Steps</span><span class="val">${fmt(state.day.steps)} <em>/ ${fmt(p.stepGoal)}</em></span></div>
            <div class="stat-row"><span class="label">Move</span><span class="val">${state.day.activeMinutes} <em>min</em></span></div>
          </div>
        </div>
        <div class="section-h"><h2>Today’s workout</h2><button class="linkish" data-act="workout">Library</button></div>
        <div class="card workout-card">
          <div class="kicker">${done ? "Completed" : "Planned"} · ${esc(w.focus)}</div>
          <h3>${esc(w.name)}</h3>
          <p class="meta">${w.minutes} min · ${esc(w.level)} · ${w.exercises.length} moves · ${w.kcal} kcal</p>
          <div class="pills">
            <span class="pill ${done ? "blue" : ""}">${done ? "Done" : esc(w.level)}</span>
            <span class="pill">${esc(w.focus)}</span>
          </div>
          <button class="btn btn-primary" data-act="start" data-id="${w.id}">${done ? "Do it again" : "Start workout"}</button>
        </div>
        ${installHint()}
        <div class="grid-4">
          <div class="tile"><div class="kicker">Calories in</div><div class="num">${fmt(t.cal)}</div><p>${fmt(Math.max(0, p.calorieGoal - t.cal))} left</p></div>
          <div class="tile"><div class="kicker">Burned</div><div class="num">${fmt(state.day.caloriesBurned)}</div><p>workout + steps</p></div>
          <div class="tile">
            <div class="kicker">Steps</div>
            <div class="num">${fmt(state.day.steps)}<span> / ${fmt(p.stepGoal)}</span></div>
            <div class="stepper">
              <button type="button" data-act="steps-minus" ${state.day.steps <= 0 ? "disabled" : ""} aria-label="Remove 500 steps">−</button>
              <button type="button" data-act="steps-plus" aria-label="Add 500 steps">+</button>
            </div>
          </div>
          <div class="tile">
            <div class="kicker">Water</div>
            <div class="num">${Math.round(state.day.waterMl / WATER_CUP_ML)}<span> / ${Math.round(p.waterGoalMl / WATER_CUP_ML)}</span></div>
            <div class="stepper">
              <button type="button" data-act="water-minus" ${state.day.waterMl <= 0 ? "disabled" : ""} aria-label="Remove a cup">−</button>
              <button type="button" data-act="water-plus" ${state.day.waterMl >= p.waterGoalMl ? "disabled" : ""} aria-label="Add a cup">+</button>
            </div>
          </div>
        </div>
      </section>
      ${tabs()}`;
  }

  function renderWorkout() {
    const list = filter === "All" ? WORKOUTS : WORKOUTS.filter((w) => w.focus === filter);
    const chips = ["All", "Strength", "Cardio", "Core", "Recovery"];
    const levels = ["Beginner", "Intermediate", "Advanced"];
    const groups = levels
      .map((level) => ({
        level,
        items: list.filter((w) => w.level === level)
      }))
      .filter((g) => g.items.length);
    const card = (w) => `<button class="row-card" data-act="start" data-id="${w.id}">
              <img class="mark-mini" src="assets/omnifit-e-icon-master.png" alt="" />
              <div>
                <h3>${esc(w.name)}</h3>
                <p>${w.minutes} min · ${esc(w.level)} · ${esc(w.focus)}</p>
              </div>
              <span class="go">Start</span>
            </button>`;
    return `${topbar(`<div class="top-meta">Library<br>${list.length} sessions</div>`)}
      <section class="screen">
        <h1 class="hello" style="margin-bottom:12px">Workouts</h1>
        <div class="filters">${chips
          .map((c) => `<button class="chip ${filter === c ? "on" : ""}" data-act="filter" data-id="${c}">${c}</button>`)
          .join("")}</div>
        ${groups
          .map(
            (g) => `<div class="section-h"><h2>${esc(g.level)}</h2><span class="meta">${g.items.length}</span></div>
        <div class="list">${g.items.map(card).join("")}</div>`
          )
          .join("")}
      </section>
      ${tabs()}`;
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function currentExercise() {
    const sess = state.session;
    if (!sess) return null;
    const w = WORKOUTS.find((x) => x.id === sess.workoutId);
    return w ? w.exercises[sess.exIndex] : null;
  }

  function renderPlayer() {
    const sess = state.session;
    const w = WORKOUTS.find((x) => x.id === sess.workoutId);
    if (sess.phase === "complete") {
      return `<section class="screen player-screen done-card">
        <img src="assets/omnifit-e-icon-master.png" alt="" />
        <div class="kicker">Session complete</div>
        <h2>Nice work</h2>
        <p>${esc(w.name)} · ${w.minutes} min · ${w.kcal} kcal</p>
        <button class="btn btn-primary" data-act="home">Back home</button>
        <div class="btn-row"><button class="btn btn-ghost" data-act="workout">More workouts</button></div>
      </section>`;
    }
    const ex = w.exercises[sess.exIndex];
    const total = w.exercises.length;
    const remainingWork =
      ex.kind === "time"
        ? ex.seconds
        : 45;
    const progress =
      sess.phase === "rest"
        ? 1 - sess.remaining / Math.max(1, ex.rest || 1)
        : 1 - sess.remaining / Math.max(1, remainingWork);
    const next = w.exercises[sess.exIndex + 1];
    const label = sess.phase === "rest" ? "Rest" : ex.kind === "time" ? "Work" : "Your set";
    const read = sess.phase === "rest" || ex.kind === "time" ? formatTime(sess.remaining) : `${ex.reps}`;
    const sub =
      sess.phase === "rest"
        ? "Catch your breath"
        : ex.kind === "time"
          ? `Set ${sess.setIndex + 1} of ${ex.sets}`
          : `Set ${sess.setIndex + 1} of ${ex.sets} · reps`;
    return `<div class="player-top">
        <button class="icon-btn" data-act="quit-player" aria-label="Close">${xIcon()}</button>
        <div class="kicker">${sess.exIndex + 1} / ${total}</div>
        <button class="icon-btn" data-act="skip" aria-label="Skip">${skipIcon()}</button>
      </div>
      <section class="screen player-screen player-body">
        <div class="player-phase">${label}</div>
        <h1 class="player-ex">${esc(sess.phase === "rest" ? "Rest" : ex.name)}</h1>
        <p class="player-cue">${esc(sess.phase === "rest" ? (next ? `Up next: ${next.name}` : "Last rest") : ex.cue)}</p>
        <div class="timer-ring">
          ${ringSVG(220, sess.phase === "rest" || ex.kind === "time" ? progress : (sess.setIndex + (sess.phase === "work" ? 0.15 : 0)) / ex.sets, 14)}
          <div class="timer-read"><div class="big">${read}</div><div class="sub">${sub}</div></div>
        </div>
        <div class="set-dots">${Array.from({ length: ex.sets }, (_, i) => `<span class="dot ${i < sess.setIndex ? "done" : i === sess.setIndex ? "on" : ""}"></span>`).join("")}</div>
        <div class="player-actions">
          <button class="round-btn" data-act="prev" aria-label="Previous">${prevIcon()}</button>
          ${
            ex.kind === "reps" && sess.phase === "work"
              ? `<button class="btn btn-primary" data-act="complete-set">Complete set</button>`
              : `<button class="round-btn primary" data-act="toggle-play" aria-label="${sess.running ? "Pause" : "Play"}">${sess.running ? pauseIcon() : playIcon()}</button>`
          }
          <button class="round-btn" data-act="skip" aria-label="Next">${nextIcon()}</button>
        </div>
        <ol class="up-next">
          ${w.exercises
            .map((item, i) => `<li class="${i === sess.exIndex ? "now" : ""}"><span>${esc(item.name)}</span><span>${item.kind === "time" ? item.seconds + "s" : item.sets + "×" + item.reps}</span></li>`)
            .join("")}
        </ol>
      </section>`;
  }

  function xIcon() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  }
  function skipIcon() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6l10 6-10 6V6zM19 6v12"/></svg>';
  }
  function playIcon() {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 6l12 6-12 6V6z"/></svg>';
  }
  function pauseIcon() {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6h3v12H7zM14 6h3v12h-3z"/></svg>';
  }
  function prevIcon() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';
  }
  function nextIcon() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  }

  function renderNutrition() {
    const t = mealTotals(state.day.meals);
    const p = state.profile;
    const calPct = Math.min(1, t.cal / p.calorieGoal);
    const cups = Math.round(p.waterGoalMl / WATER_CUP_ML);
    const filled = Math.round(state.day.waterMl / WATER_CUP_ML);
    return `${topbar(`<div class="top-meta">${fmt(t.cal)} kcal<br>logged</div>`)}
      <section class="screen">
        <h1 class="hello" style="margin-bottom:12px">Nutrition</h1>
        <div class="card hero">
          <div class="ring-wrap">
            ${ringSVG(132, calPct, 11)}
            <div class="ring-center"><div class="ring-num">${fmt(t.cal)}</div><div class="ring-sub">of ${fmt(p.calorieGoal)}</div></div>
          </div>
          <div class="macro">
            ${macroRow("Protein", t.p, p.proteinGoal, "g")}
            ${macroRow("Carbs", t.c, p.carbGoal, "g")}
            ${macroRow("Fat", t.f, p.fatGoal, "g")}
          </div>
        </div>
        <div class="card" style="margin-top:12px">
          <div class="section-h" style="margin:0 0 4px">
            <h2 style="font-size:16px">Water</h2>
            <div class="stepper">
              <button type="button" data-act="water-minus" ${filled <= 0 ? "disabled" : ""} aria-label="Remove a cup">−</button>
              <span class="meta">${(state.day.waterMl / 1000).toFixed(2)} L</span>
              <button type="button" data-act="water-plus" ${filled >= cups ? "disabled" : ""} aria-label="Add a cup">+</button>
            </div>
          </div>
          <div class="water">${Array.from({ length: cups }, (_, i) => `<button class="cup ${i < filled ? "on" : ""}" data-act="water-set" data-id="${i + 1}" aria-label="Set water to ${i + 1} cups"></button>`).join("")}</div>
        </div>
        <div class="card scan-cta" style="margin-top:12px">
          <div class="kicker">Photo scan</div>
          <h3>Snap a meal</h3>
          <p class="meta">Take a picture of the plate. AI estimates calories, protein, carbs, and fat. You can edit before logging.</p>
          <div class="btn-row">
            <button class="btn btn-primary" data-act="scan-camera">Take photo</button>
            <button class="btn btn-ghost" data-act="scan-library">Choose photo</button>
          </div>
        </div>
        ${MEAL_ORDER.map((meal) => mealBlock(meal)).join("")}
      </section>
      ${tabs()}`;
  }

  function macroRow(label, val, goal, unit) {
    const pct = Math.min(100, (val / Math.max(1, goal)) * 100);
    return `<div class="macro-row"><div class="top"><span>${label}</span><span>${Math.round(val)} / ${goal}${unit}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }

  function mealBlock(meal) {
    const items = state.day.meals.filter((m) => m.meal === meal);
    const cal = items.reduce((a, m) => a + m.cal, 0);
    return `<div class="meal-head">
        <h3>${MEAL_LABEL[meal]}</h3>
        <button class="linkish" data-act="add-food" data-id="${meal}">+ Add · ${fmt(cal)}</button>
      </div>
      ${
        items.length
          ? items
              .map(
                (m) => `<div class="food-line">
                <div><strong>${esc(m.name)}</strong><small>${m.scanned ? "Scan · " : ""}${m.cal} kcal · P ${Math.round(m.p)} C ${Math.round(m.c)} F ${Math.round(m.f)}</small></div>
                <button class="x" data-act="remove-food" data-id="${m.id}" aria-label="Remove">×</button>
              </div>`
              )
              .join("")
          : `<p class="empty-note">Nothing logged yet.</p>`
      }`;
  }

  function renderFood() {
    const q = foodQuery.trim().toLowerCase();
    const results = FOODS.filter((f) => !q || f.name.toLowerCase().includes(q));
    return `${topbar(`<button class="icon-btn" data-act="nutrition" aria-label="Close">${xIcon()}</button>`)}
      <section class="screen sheet-screen">
        <div class="kicker">${esc(MEAL_LABEL[foodMeal])}</div>
        <h1>Add food</h1>
        <div class="btn-row" style="margin:0 0 14px">
          <button class="btn btn-primary" data-act="scan-camera">Take photo</button>
          <button class="btn btn-ghost" data-act="scan-library">Choose photo</button>
        </div>
        <input class="search" id="food-search" placeholder="Search foods" value="${esc(foodQuery)}" />
        <div class="custom-add">
          <input id="custom-name" placeholder="Custom item" />
          <input id="custom-cal" placeholder="kcal" inputmode="numeric" />
        </div>
        <div class="btn-row">
          <button class="btn btn-ghost btn-sm" data-act="add-custom">Log custom</button>
        </div>
        <div class="food-results">${results
          .map(
            (f) => `<button class="row-card" data-act="pick-food" data-id="${f.id}">
              <div><h3>${esc(f.name)}</h3><p>${f.cal} kcal · P ${f.p} C ${f.c} F ${f.f}</p></div>
              <span class="go">Add</span>
            </button>`
          )
          .join("")}</div>
      </section>`;
  }

  function renderScan() {
    const r = scan.result;
    const analyzing = scan.status === "analyzing";
    let body = `<img class="scan-photo" src="${scan.image}" alt="Meal photo" />`;
    if (analyzing) {
      body += `<div class="scan-status"><div class="spin" aria-hidden="true"></div>Reading the plate…</div>`;
    } else if (scan.status === "error") {
      body += `<div class="scan-error">${esc(scan.error || "Scan failed.")}</div>
        <div class="field"><label>Anything to add?</label><input id="scan-note" placeholder="e.g. 6 oz salmon, olive oil" value="${esc(scan.note)}" /></div>
        <button class="btn btn-primary" data-act="scan-retry">Try again</button>
        <div class="btn-row"><button class="btn btn-ghost" data-act="scan-camera">New photo</button></div>`;
    } else if (r) {
      const pct = Math.round((r.confidence || 0) * 100);
      body += `<div class="conf">${pct}% confidence</div>
        <div class="field"><label>Meal name</label><input id="scan-name" value="${esc(r.name)}" /></div>
        <div class="filters" style="margin:0 0 8px">
          ${MEAL_ORDER.map(
            (m) =>
              `<button class="chip ${foodMeal === m ? "on" : ""}" data-act="scan-meal" data-id="${m}">${MEAL_LABEL[m]}</button>`
          ).join("")}
        </div>
        <div class="macro-edit">
          <div class="field"><label>Calories</label><input id="scan-cal" inputmode="numeric" value="${r.cal}" /></div>
          <div class="field"><label>Protein (g)</label><input id="scan-p" inputmode="numeric" value="${r.p}" /></div>
          <div class="field"><label>Carbs (g)</label><input id="scan-c" inputmode="numeric" value="${r.c}" /></div>
          <div class="field"><label>Fat (g)</label><input id="scan-f" inputmode="numeric" value="${r.f}" /></div>
        </div>
        ${
          r.items && r.items.length
            ? `<div class="item-break">${r.items
                .map(
                  (it) =>
                    `<div class="food-line"><div><strong>${esc(it.name)}</strong><small>${esc(it.portion || "")} · ${it.cal} kcal · P ${it.p} C ${it.c} F ${it.f}</small></div></div>`
                )
                .join("")}</div>`
            : ""
        }
        ${r.notes ? `<p class="note">${esc(r.notes)}</p>` : ""}`;
    }
    const footer =
      r && scan.status === "ready"
        ? `<div class="scan-footer">
        <button class="btn btn-primary" data-act="log-scan">Log meal</button>
        ${
          r.items && r.items.length > 1
            ? `<div class="btn-row"><button class="btn btn-ghost" data-act="log-scan-items">Log each item</button></div>`
            : ""
        }
      </div>`
        : "";
    return `${topbar(`<button class="icon-btn" data-act="nutrition" aria-label="Close">${xIcon()}</button>`)}
      <section class="screen sheet-screen">
        <div class="kicker">${esc(MEAL_LABEL[foodMeal])}</div>
        <h1>Scan meal</h1>
        ${body}
      </section>
      ${footer}`;
  }

  function weekKeys() {
    const t = todayKey();
    return Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  }

  function renderProgress() {
    const keys = weekKeys();
    const snaps = keys.map(snapshotFor);
    const maxMin = Math.max(20, ...snaps.map((s) => s.minutes || 0));
    const workouts = snaps.filter((s) => s.minutes > 0 || s.workoutName).length;
    const minutes = snaps.reduce((a, s) => a + (s.minutes || 0), 0);
    const avgCal = Math.round(snaps.reduce((a, s) => a + (s.caloriesIn || 0), 0) / 7);
    const sel = snapshotFor(selectedDay);
    const recent = Object.values(state.history)
      .concat([snapshotFor(todayKey())])
      .filter((h) => h.workoutName)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 6);
    return `${topbar(`<div class="top-meta">This week<br>${workouts} workouts</div>`)}
      <section class="screen">
        <h1 class="hello" style="margin-bottom:12px">Weekly progress</h1>
        <div class="card">
          <div class="kicker">Active minutes · last 7 days</div>
          <div class="week">${snaps
            .map((s) => {
              const h = Math.round(((s.minutes || 0) / maxMin) * 100);
              const on = s.date === selectedDay;
              const isToday = s.date === todayKey();
              const letter = parseKey(s.date).toLocaleDateString("en-US", { weekday: "narrow" });
              return `<button class="day-col ${on ? "on" : ""} ${isToday ? "today" : ""}" data-act="pick-day" data-id="${s.date}">
                <div class="bar-v"><i style="height:${h}%"></i></div>
                <span class="d">${letter}</span>
              </button>`;
            })
            .join("")}</div>
        </div>
        <div class="kpi">
          <div class="tile"><div class="kicker">Sessions</div><div class="num">${workouts}<span> / 7</span></div></div>
          <div class="tile"><div class="kicker">Minutes</div><div class="num">${minutes}</div></div>
          <div class="tile"><div class="kicker">Avg fuel</div><div class="num">${fmt(avgCal)}</div></div>
          <div class="tile"><div class="kicker">Weight</div><div class="num">${state.profile.weight}<span> lb</span></div></div>
        </div>
        <div class="card" style="margin-top:12px">
          <div class="kicker">${esc(dateLabel(parseKey(selectedDay)))}</div>
          <h3 style="margin:6px 0 8px;font-size:18px">${sel.workoutName || "Rest / no session"}</h3>
          <p class="meta">${sel.minutes || 0} min · ${fmt(sel.caloriesIn || 0)} kcal in · ${fmt(sel.steps || 0)} steps · ${((sel.waterMl || 0) / 1000).toFixed(1)} L</p>
        </div>
        <div class="section-h"><h2>Log weight</h2></div>
        <div class="weight-row">
          <input id="weight-in" type="number" step="0.1" value="${state.profile.weight}" />
          <button class="btn btn-primary btn-sm" data-act="save-weight">Save</button>
        </div>
        <div class="section-h"><h2>Composition</h2></div>
        <div class="card scan-cta">
          <div class="kicker">Body photos</div>
          <h3>Track your physique</h3>
          <p class="meta">Same light, same pose. Photos stay on this device.</p>
          <div class="btn-row">
            <button class="btn btn-primary" data-act="body-camera">Take photo</button>
            <button class="btn btn-ghost" data-act="body-library">Choose photo</button>
          </div>
        </div>
        ${compCompare()}
        <div class="section-h"><h2>Photo log</h2><span class="meta">${composition.length}</span></div>
        ${
          composition.length
            ? `<div class="comp-grid">${composition
                .map(
                  (p) => `<button class="comp-card" data-act="body-open" data-id="${p.id}">
                  <img src="${p.image}" alt="${esc(p.pose)}" />
                  <div class="pad"><strong>${esc(p.pose)}</strong><span class="meta">${esc(dateLabel(parseKey(p.date)))}</span></div>
                </button>`
                )
                .join("")}</div>`
            : `<p class="empty-note">No composition photos yet.</p>`
        }
        <div class="section-h"><h2>Recent sessions</h2></div>
        ${recent
          .map(
            (h) => `<div class="log-item"><div><strong>${esc(h.workoutName)}</strong><span>${esc(dateLabel(parseKey(h.date)))}</span></div><span>${h.minutes} min</span></div>`
          )
          .join("")}
      </section>
      ${tabs()}`;
  }

  function compCompare() {
    if (composition.length < 2) return "";
    const newest = composition[0];
    const prior = composition.find((p) => p.pose === newest.pose && p.id !== newest.id) || composition[1];
    return `<div class="card" style="margin-top:12px">
        <div class="kicker">Compare</div>
        <div class="comp-compare">
          <figure>
            <img src="${prior.image}" alt="Earlier" />
            <figcaption>${esc(prior.pose)} · ${esc(dateLabel(parseKey(prior.date)))}</figcaption>
          </figure>
          <figure>
            <img src="${newest.image}" alt="Latest" />
            <figcaption>${esc(newest.pose)} · ${esc(dateLabel(parseKey(newest.date)))}</figcaption>
          </figure>
        </div>
      </div>`;
  }

  function renderBodySave() {
    return `${topbar(`<button class="icon-btn" data-act="progress" aria-label="Close">${xIcon()}</button>`)}
      <section class="screen sheet-screen">
        <div class="kicker">Composition</div>
        <h1>Save photo</h1>
        <img class="scan-photo" src="${pendingBody.image}" alt="Body photo" />
        <div class="kicker" style="margin:0 0 8px">Pose</div>
        <div class="filters">${BODY_POSES.map(
          (p) =>
            `<button class="chip ${pendingBody.pose === p ? "on" : ""}" data-act="body-pose" data-id="${p}">${p}</button>`
        ).join("")}</div>
        <div class="field"><label>Note</label><input id="body-note" placeholder="Optional" value="${esc(pendingBody.note)}" /></div>
        <button class="btn btn-primary" data-act="body-save">Save to log</button>
      </section>`;
  }

  function renderBodyView() {
    const p = viewingBody;
    if (!p) return renderProgress();
    return `${topbar(`<button class="icon-btn" data-act="progress" aria-label="Close">${xIcon()}</button>`)}
      <section class="screen sheet-screen comp-view">
        <div class="kicker">${esc(p.pose)}</div>
        <h1>${esc(dateLabel(parseKey(p.date)))}</h1>
        <img src="${p.image}" alt="${esc(p.pose)}" />
        ${p.note ? `<p class="note">${esc(p.note)}</p>` : ""}
        <div class="btn-row" style="margin-top:16px"><button class="btn btn-ghost" data-act="body-delete" data-id="${p.id}">Delete photo</button></div>
      </section>`;
  }

  function renderProfile() {
    const p = state.profile;
    return `${topbar(`<button class="icon-btn" data-act="home" aria-label="Close">${xIcon()}</button>`)}
      <section class="screen sheet-screen">
        <h1>Profile</h1>
        <div class="kicker" style="margin:0 0 8px">Appearance</div>
        <div class="theme-toggle ${state.theme === "light" ? "is-light" : ""}" role="group" aria-label="Appearance">
          <span class="theme-knob" aria-hidden="true"></span>
          <button class="theme-opt ${state.theme === "dark" ? "on" : ""}" data-act="theme" data-id="dark" aria-pressed="${state.theme === "dark"}">Dark</button>
          <button class="theme-opt ${state.theme === "light" ? "on" : ""}" data-act="theme" data-id="light" aria-pressed="${state.theme === "light"}">Light</button>
        </div>
        <div class="field"><label>Name</label><input id="p-name" value="${esc(p.name)}" placeholder="Your name" /></div>
        <div class="field"><label>Daily calories</label><input id="p-cal" inputmode="numeric" value="${p.calorieGoal}" /></div>
        <div class="field"><label>Protein (g)</label><input id="p-p" inputmode="numeric" value="${p.proteinGoal}" /></div>
        <div class="field"><label>Carbs (g)</label><input id="p-c" inputmode="numeric" value="${p.carbGoal}" /></div>
        <div class="field"><label>Fat (g)</label><input id="p-f" inputmode="numeric" value="${p.fatGoal}" /></div>
        <div class="field"><label>Water goal (ml)</label><input id="p-w" inputmode="numeric" value="${p.waterGoalMl}" /></div>
        <div class="field"><label>Step goal</label><input id="p-s" inputmode="numeric" value="${p.stepGoal}" /></div>
        <button class="btn btn-primary" data-act="save-profile">Save</button>
        <div class="btn-row"><button class="btn btn-ghost" data-act="reset">Reset demo data</button></div>
      
      <div class="card legal-links">
        <a class="row-link" href="privacy.html">Privacy Policy</a>
        <a class="row-link" href="terms.html">Terms of Use</a>
      </div>
      </section>`;
  }

  function renderOnboard() {
    const g = state.profile.goal;
    return `<section class="onboard">
      <img class="splash-mark" src="assets/omnifit-e-icon-master.png" alt="" />
      <div class="wordmark splash-word"><span class="omni">Omni</span><span class="fit">Fit</span></div>
      <h1>Let’s set your baseline</h1>
      <p class="lede">Name your profile and pick a goal. You can change this anytime.</p>
      <div class="field"><label>Name</label><input id="ob-name" placeholder="First name" value="${esc(state.profile.name)}" /></div>
      <div class="kicker" style="margin:12px 0 8px">Goal</div>
      <div class="goals">
        ${[
          ["lose", "Lose fat", "A slight calorie deficit. Strength stays in."],
          ["maintain", "Stay fit", "Eat around maintenance. Train most days."],
          ["build", "Build muscle", "Eat in a small surplus. Lift first."]
        ]
          .map(
            ([id, title, sub]) =>
              `<button class="goal ${g === id ? "on" : ""}" data-act="goal" data-id="${id}"><strong>${title}</strong><span>${sub}</span></button>`
          )
          .join("")}
      </div>
      <button class="btn btn-primary" data-act="finish-onboard">Enter OmniFit</button>
    </section>`;
  }

  function render() {
    rollDay();
    const root = document.getElementById("app");
    const prevScreen = root.querySelector(".screen");
    const keepScroll = lastView === view && prevScreen ? prevScreen.scrollTop : 0;
    let body = "";
    if (!state.onboarded) body = renderOnboard();
    else if (view === "home") body = renderHome();
    else if (view === "workout") body = renderWorkout();
    else if (view === "nutrition") body = renderNutrition();
    else if (view === "progress") body = renderProgress();
    else if (view === "player") body = renderPlayer();
    else if (view === "food") body = renderFood();
    else if (view === "scan") body = renderScan();
    else if (view === "body-save") body = renderBodySave();
    else if (view === "body-view") body = renderBodyView();
    else if (view === "profile") body = renderProfile();
    else body = renderHome();
    root.classList.toggle(
      "with-tabs",
      state.onboarded && (view === "home" || view === "workout" || view === "nutrition" || view === "progress")
    );
    root.innerHTML = `${body}<div id="toast" class="toast" role="status"></div>`;
    lastView = view;
    const nextScreen = root.querySelector(".screen");
    if (nextScreen) nextScreen.scrollTop = keepScroll;
    if (view === "food") {
      const input = document.getElementById("food-search");
      if (input) {
        input.focus();
        input.selectionStart = input.value.length;
        input.addEventListener("input", () => {
          foodQuery = input.value;
          const pos = input.selectionStart;
          render();
          const next = document.getElementById("food-search");
          if (next) {
            next.focus();
            next.setSelectionRange(pos, pos);
          }
        });
      }
    }
  }

  function startWorkout(id) {
    const w = WORKOUTS.find((x) => x.id === id);
    if (!w) return;
    const first = w.exercises[0];
    state.session = {
      workoutId: id,
      exIndex: 0,
      setIndex: 0,
      phase: "work",
      remaining: first.kind === "time" ? first.seconds : 0,
      running: first.kind === "time",
      startedAt: Date.now()
    };
    view = "player";
    tickPlayerClock();
    render();
  }

  function tickPlayerClock() {
    clearInterval(playerTimer);
    playerTimer = setInterval(() => {
      const sess = state.session;
      if (!sess || view !== "player" || !sess.running) return;
      if (sess.phase === "complete") return;
      const ex = currentExercise();
      if (!ex) return;
      if (sess.phase === "work" && ex.kind === "reps") return;
      sess.remaining -= 1;
      if (sess.remaining <= 0) {
        if (sess.phase === "work") finishSet();
        else finishRest();
      } else {
        render();
      }
    }, 1000);
  }

  function finishSet() {
    const sess = state.session;
    const w = WORKOUTS.find((x) => x.id === sess.workoutId);
    const ex = w.exercises[sess.exIndex];
    if (sess.setIndex + 1 < ex.sets) {
      sess.setIndex += 1;
      if (ex.rest) {
        sess.phase = "rest";
        sess.remaining = ex.rest;
        sess.running = true;
      } else {
        sess.phase = "work";
        sess.remaining = ex.kind === "time" ? ex.seconds : 0;
        sess.running = ex.kind === "time";
      }
    } else {
      advanceExercise();
    }
    render();
  }

  function finishRest() {
    const sess = state.session;
    const ex = currentExercise();
    sess.phase = "work";
    sess.remaining = ex.kind === "time" ? ex.seconds : 0;
    sess.running = ex.kind === "time";
    render();
  }

  function advanceExercise() {
    const sess = state.session;
    const w = WORKOUTS.find((x) => x.id === sess.workoutId);
    if (sess.exIndex + 1 >= w.exercises.length) {
      completeWorkout();
      return;
    }
    sess.exIndex += 1;
    sess.setIndex = 0;
    const ex = w.exercises[sess.exIndex];
    sess.phase = "work";
    sess.remaining = ex.kind === "time" ? ex.seconds : 0;
    sess.running = ex.kind === "time";
  }

  function skip() {
    const sess = state.session;
    if (!sess || sess.phase === "complete") return;
    if (sess.phase === "rest") finishRest();
    else finishSet();
  }

  function prevExercise() {
    const sess = state.session;
    if (!sess || sess.exIndex === 0 && sess.setIndex === 0) return;
    const w = WORKOUTS.find((x) => x.id === sess.workoutId);
    if (sess.setIndex > 0) sess.setIndex -= 1;
    else if (sess.exIndex > 0) {
      sess.exIndex -= 1;
      sess.setIndex = w.exercises[sess.exIndex].sets - 1;
    }
    const ex = w.exercises[sess.exIndex];
    sess.phase = "work";
    sess.remaining = ex.kind === "time" ? ex.seconds : 0;
    sess.running = false;
    render();
  }

  function completeWorkout() {
    const sess = state.session;
    const w = WORKOUTS.find((x) => x.id === sess.workoutId);
    state.day.workoutId = w.id;
    state.day.workoutCompleted = true;
    state.day.activeMinutes += w.minutes;
    state.day.caloriesBurned += w.kcal;
    state.day.steps += Math.round(w.minutes * 28);
    sess.phase = "complete";
    sess.running = false;
    save();
    render();
  }

  function defaultMeal() {
    const h = new Date().getHours();
    if (h < 11) return "breakfast";
    if (h < 16) return "lunch";
    if (h < 21) return "dinner";
    return "snack";
  }

  function openFilePicker(which, target) {
    photoTarget = target || "scan";
    if (photoTarget === "scan" && view === "nutrition") foodMeal = defaultMeal();
    const map = {
      scan: which === "camera" ? "meal-camera" : "meal-library",
      body: which === "camera" ? "body-camera" : "body-library"
    };
    const el = document.getElementById(map[photoTarget] || map.scan);
    if (el) {
      el.value = "";
      el.click();
    }
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 1280;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > max || h > max) {
          const scale = max / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that photo. Try JPEG or PNG."));
      };
      img.src = url;
    });
  }

  async function startScanFromFile(file) {
    if (!file) return;
    try {
      const image = await compressImage(file);
      scan = { image, status: "analyzing", error: "", result: null, note: scan.note || "" };
      view = "scan";
      render();
      await analyzeScan();
    } catch (err) {
      toast(err.message || "Could not open that photo");
    }
  }

  async function analyzeScan() {
    scan.status = "analyzing";
    scan.error = "";
    render();
    try {
      const base = (window.OMNIFIT && OMNIFIT.scanApiBase) ? String(OMNIFIT.scanApiBase).replace(/\/+$/, "") : "";
      const res = await fetch(base + "/api/scan-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: scan.image, note: scan.note })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        scan.status = "error";
        scan.error = data.message || "Scan failed.";
        render();
        return;
      }
      scan.result = data;
      scan.status = "ready";
      render();
    } catch {
      scan.status = "error";
      scan.error = "Could not reach the scan service.";
      render();
    }
  }

  function readScanEdits() {
    const n = (id, fallback) => {
      const el = document.getElementById(id);
      if (!el) return fallback;
      const v = Number(el.value);
      return Number.isFinite(v) ? Math.max(0, Math.round(v)) : fallback;
    };
    const nameEl = document.getElementById("scan-name");
    return {
      name: ((nameEl && nameEl.value) || (scan.result && scan.result.name) || "Scanned meal").trim(),
      cal: n("scan-cal", scan.result.cal),
      p: n("scan-p", scan.result.p),
      c: n("scan-c", scan.result.c),
      f: n("scan-f", scan.result.f)
    };
  }

  function addFood(food, silent) {
    state.day.meals.push({
      id: "m" + Date.now() + Math.random().toString(16).slice(2),
      name: food.name,
      cal: food.cal,
      p: food.p || 0,
      c: food.c || 0,
      f: food.f || 0,
      meal: foodMeal,
      scanned: !!food.scanned
    });
    save();
    if (!silent) toast("Logged");
  }

  function applyGoal(id) {
    state.profile.goal = id;
    if (id === "lose") {
      state.profile.calorieGoal = 1850;
      state.profile.proteinGoal = 150;
    } else if (id === "build") {
      state.profile.calorieGoal = 2400;
      state.profile.proteinGoal = 165;
    } else {
      state.profile.calorieGoal = 2100;
      state.profile.proteinGoal = 140;
    }
  }

  function onClick(e) {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const id = btn.dataset.id;
    if (act === "home" || act === "workout" || act === "nutrition" || act === "progress" || act === "profile") {
      if (view === "player" && state.session && state.session.phase !== "complete") {
        if (!confirm("Leave this workout?")) return;
        state.session = null;
      }
      view = act;
      render();
      return;
    }
    if (act === "start") return startWorkout(id);
    if (act === "filter") {
      filter = id;
      render();
      return;
    }
    if (act === "steps-plus") {
      changeSteps(1);
      return;
    }
    if (act === "steps-minus") {
      changeSteps(-1);
      return;
    }
    if (act === "water-plus") {
      changeWater(1);
      return;
    }
    if (act === "water-minus") {
      changeWater(-1);
      return;
    }
    if (act === "water-set") {
      const n = Number(id);
      state.day.waterMl = state.day.waterMl === n * WATER_CUP_ML ? (n - 1) * WATER_CUP_ML : n * WATER_CUP_ML;
      save();
      render();
      return;
    }
    if (act === "add-food") {
      foodMeal = id;
      foodQuery = "";
      view = "food";
      render();
      return;
    }
    if (act === "scan-camera") {
      openFilePicker("camera", "scan");
      return;
    }
    if (act === "scan-library") {
      openFilePicker("library", "scan");
      return;
    }
    if (act === "body-camera") {
      openFilePicker("camera", "body");
      return;
    }
    if (act === "body-library") {
      openFilePicker("library", "body");
      return;
    }
    if (act === "body-pose") {
      pendingBody.pose = id;
      const noteEl = document.getElementById("body-note");
      if (noteEl) pendingBody.note = noteEl.value;
      render();
      return;
    }
    if (act === "body-save") {
      const noteEl = document.getElementById("body-note");
      if (noteEl) pendingBody.note = noteEl.value.trim();
      const photo = {
        id: "b" + Date.now(),
        date: todayKey(),
        pose: pendingBody.pose || "Front",
        note: pendingBody.note || "",
        image: pendingBody.image
      };
      putCompPhoto(photo).then(() => {
        pendingBody = { image: "", pose: "Front", note: "" };
        view = "progress";
        toast("Photo saved");
        render();
      });
      return;
    }
    if (act === "body-open") {
      viewingBody = composition.find((p) => p.id === id) || null;
      view = "body-view";
      render();
      return;
    }
    if (act === "body-delete") {
      if (!confirm("Delete this photo?")) return;
      removeCompPhoto(id).then(() => {
        viewingBody = null;
        view = "progress";
        toast("Deleted");
        render();
      });
      return;
    }
    if (act === "scan-retry") {
      const noteEl = document.getElementById("scan-note");
      if (noteEl) scan.note = noteEl.value.trim();
      analyzeScan();
      return;
    }
    if (act === "scan-meal") {
      foodMeal = id;
      render();
      return;
    }
    if (act === "log-scan") {
      if (!scan.result) return;
      const edits = readScanEdits();
      addFood({ ...edits, scanned: true });
      scan = { image: "", status: "idle", error: "", result: null, note: "" };
      view = "nutrition";
      render();
      return;
    }
    if (act === "log-scan-items") {
      if (!scan.result || !scan.result.items) return;
      scan.result.items.forEach((it) => addFood({ ...it, scanned: true }, true));
      toast("Logged " + scan.result.items.length + " items");
      scan = { image: "", status: "idle", error: "", result: null, note: "" };
      view = "nutrition";
      render();
      return;
    }
    if (act === "pick-food") {
      addFood(FOODS.find((f) => f.id === id));
      view = "nutrition";
      render();
      return;
    }
    if (act === "add-custom") {
      const name = (document.getElementById("custom-name") || {}).value || "";
      const cal = Number((document.getElementById("custom-cal") || {}).value || 0);
      if (!name.trim() || !cal) {
        toast("Add a name and calories");
        return;
      }
      addFood({ name: name.trim(), cal, p: 0, c: 0, f: 0 });
      view = "nutrition";
      render();
      return;
    }
    if (act === "remove-food") {
      state.day.meals = state.day.meals.filter((m) => m.id !== id);
      save();
      render();
      return;
    }
    if (act === "pick-day") {
      selectedDay = id;
      render();
      return;
    }
    if (act === "save-weight") {
      const v = Number((document.getElementById("weight-in") || {}).value);
      if (!v) return;
      state.profile.weight = v;
      state.weights.push({ date: todayKey(), lbs: v });
      save();
      toast("Weight saved");
      render();
      return;
    }
    if (act === "hide-install") {
      sessionStorage.setItem("hide-install", "1");
      render();
      return;
    }
    if (act === "theme") {
      state.theme = id === "light" ? "light" : "dark";
      applyTheme();
      save();
      const wrap = document.querySelector(".theme-toggle");
      if (wrap) {
        wrap.classList.toggle("is-light", state.theme === "light");
        wrap.querySelectorAll(".theme-opt").forEach((btn) => {
          const on = btn.dataset.id === state.theme;
          btn.classList.toggle("on", on);
          btn.setAttribute("aria-pressed", on ? "true" : "false");
        });
      }
      return;
    }
    if (act === "save-profile") {
      const num = (i) => Number(document.getElementById(i).value);
      state.profile.name = document.getElementById("p-name").value.trim();
      state.profile.calorieGoal = num("p-cal") || 2100;
      state.profile.proteinGoal = num("p-p") || 140;
      state.profile.carbGoal = num("p-c") || 200;
      state.profile.fatGoal = num("p-f") || 70;
      state.profile.waterGoalMl = num("p-w") || 2000;
      state.profile.stepGoal = num("p-s") || 8000;
      save();
      toast("Saved");
      view = "home";
      render();
      return;
    }
    if (act === "reset") {
      if (!confirm("Reset all OmniFit data on this device?")) return;
      localStorage.removeItem(STORE);
      state = defaultState();
      view = "home";
      save();
      render();
      return;
    }
    if (act === "goal") {
      const nameEl = document.getElementById("ob-name");
      if (nameEl) state.profile.name = nameEl.value.trim();
      applyGoal(id);
      render();
      return;
    }
    if (act === "finish-onboard") {
      const name = (document.getElementById("ob-name") || {}).value || "";
      state.profile.name = name.trim();
      state.onboarded = true;
      save();
      view = "home";
      render();
      return;
    }
    if (act === "toggle-play") {
      state.session.running = !state.session.running;
      render();
      return;
    }
    if (act === "complete-set") return finishSet();
    if (act === "skip") return skip();
    if (act === "prev") return prevExercise();
    if (act === "quit-player") {
      if (state.session && state.session.phase !== "complete") {
        if (!confirm("End this workout?")) return;
      }
      state.session = null;
      view = "home";
      render();
    }
  }

  document.getElementById("app").addEventListener("click", onClick);
  document.getElementById("app").addEventListener("input", (e) => {
    if (e.target.id === "ob-name") state.profile.name = e.target.value;
    if (e.target.id === "scan-note") scan.note = e.target.value;
  });
  ["meal-camera", "meal-library"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      const file = el.files && el.files[0];
      startScanFromFile(file);
    });
  });
  ["body-camera", "body-library"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      const file = el.files && el.files[0];
      if (!file) return;
      compressImage(file)
        .then((image) => {
          pendingBody = { image, pose: pendingBody.pose || "Front", note: "" };
          view = "body-save";
          render();
        })
        .catch((err) => toast(err.message || "Could not open that photo"));
    });
  });
  document.getElementById("app").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "ob-name") {
      e.preventDefault();
      document.querySelector('[data-act="finish-onboard"]')?.click();
    }
  });
  function fillViewport() {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    const desktop = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)").matches;
    document.documentElement.classList.toggle("ios", ios);
    document.documentElement.classList.toggle("standalone", standalone);
    const phone = document.querySelector(".phone");
    if (!phone) return;
    if (desktop && !standalone) {
      phone.style.cssText = "";
      return;
    }
    phone.style.cssText = "";
  }
  fillViewport();
  window.addEventListener("resize", fillViewport);
  window.addEventListener("orientationchange", fillViewport);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fillViewport);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  applyTheme();
  save();
  rollDay();
  loadComposition().then(() => render());
  render();
  setTimeout(() => {
    splashDone = true;
    document.getElementById("splash")?.remove();
    document.getElementById("app")?.classList.remove("boot");
  }, 3000);
})();
