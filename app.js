const state = {
  scenario: "normal",
  score: 92,
  tick: 0,
  vitals: { hr: 78, spo2: 98, bpS: 122, bpD: 78, temp: 98.4, resp: 16 },
  history: Array.from({ length: 80 }, (_, i) => ({
    hr: 78 + Math.sin(i / 4) * 4,
    spo2: 98 + Math.sin(i / 5) * .8,
    resp: 16 + Math.cos(i / 6) * 1.2
  })),
  event: "No acute event detected",
  cause: "No acute event detected.",
  intervention: "Continue observation.",
  demoTimer: null
};

const $ = (id) => document.getElementById(id);
const scenarioButtons = document.querySelectorAll("[data-scenario]");
const workflowItems = Array.from(document.querySelectorAll("#workflow li"));
const mainCtx = $("mainWave").getContext("2d");
const heroCtx = $("heroWave").getContext("2d");

function jitter(base, spread) {
  return base + (Math.random() - .5) * spread;
}

function targetVitals() {
  if (state.scenario === "cardiac") return { hr: 142, spo2: 92, bpS: 168, bpD: 102, temp: 99.1, resp: 24, score: 42 };
  if (state.scenario === "respiratory") return { hr: 118, spo2: 84, bpS: 132, bpD: 86, temp: 98.9, resp: 32, score: 31 };
  if (state.scenario === "sepsis") return { hr: 126, spo2: 91, bpS: 96, bpD: 58, temp: 102.6, resp: 28, score: 36 };
  return { hr: 78, spo2: 98, bpS: 122, bpD: 78, temp: 98.4, resp: 16, score: 92 };
}

function approach(current, target, speed) {
  return current + (target - current) * speed;
}

function updateVitals() {
  const target = targetVitals();
  state.vitals.hr = approach(state.vitals.hr, jitter(target.hr, 4), .12);
  state.vitals.spo2 = approach(state.vitals.spo2, jitter(target.spo2, 1.2), .12);
  state.vitals.bpS = approach(state.vitals.bpS, jitter(target.bpS, 3), .1);
  state.vitals.bpD = approach(state.vitals.bpD, jitter(target.bpD, 3), .1);
  state.vitals.temp = approach(state.vitals.temp, jitter(target.temp, .14), .08);
  state.vitals.resp = approach(state.vitals.resp, jitter(target.resp, 2), .12);
  state.score = Math.round(approach(state.score, target.score, .08));
  state.history.push({ hr: state.vitals.hr, spo2: state.vitals.spo2, resp: state.vitals.resp });
  state.history = state.history.slice(-90);
}

function renderNumbers() {
  $("hr").textContent = Math.round(state.vitals.hr);
  $("spo2").textContent = Math.round(state.vitals.spo2);
  $("bp").textContent = `${Math.round(state.vitals.bpS)}/${Math.round(state.vitals.bpD)}`;
  $("temp").textContent = state.vitals.temp.toFixed(1);
  $("resp").textContent = Math.round(state.vitals.resp);
  $("miniHr").textContent = Math.round(state.vitals.hr);
  $("miniSpo2").textContent = Math.round(state.vitals.spo2);
  $("miniBp").textContent = `${Math.round(state.vitals.bpS)}/${Math.round(state.vitals.bpD)}`;
  $("score").textContent = `${state.score}%`;
  $("scoreFill").style.width = `${state.score}%`;
  document.querySelector(".score-ring").style.background = `conic-gradient(${state.score < 45 ? "var(--red)" : state.score < 70 ? "var(--amber)" : "var(--green)"} ${state.score}%, rgba(255,255,255,.1) 0)`;
  $("scoreLabel").textContent = state.score < 45 ? "Critical" : state.score < 70 ? "Watch" : "Stable";
  $("miniStatus").textContent = $("scoreLabel").textContent;
  if ($("hrTrend")) $("hrTrend").textContent = state.vitals.hr > 115 ? "tachycardia detected" : "normal sinus rhythm";
  if ($("spo2Trend")) $("spo2Trend").textContent = state.vitals.spo2 < 90 ? "oxygen dropping" : "steady oxygenation";
  if ($("respTrend")) $("respTrend").textContent = state.vitals.resp > 26 ? "labored breathing" : "comfortable breathing";
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function drawGrid(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#061216";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 0; y < height; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
}

function drawLine(ctx, values, color, min, max, yOffset, bandHeight, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = yOffset + bandHeight - ((v - min) / (max - min)) * bandHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function renderMainWave() {
  const canvas = $("mainWave");
  const width = canvas.width;
  const height = canvas.height;
  drawGrid(mainCtx, width, height);
  const values = state.history;
  drawLine(mainCtx, values.map(v => v.hr), "#ff4d68", 50, 160, 26, 80, width);
  drawLine(mainCtx, values.map(v => v.spo2), "#58a6ff", 82, 100, 124, 70, width);
  drawLine(mainCtx, values.map(v => v.resp), "#28e0a3", 10, 36, 218, 70, width);
}

function renderHeroWave() {
  const canvas = $("heroWave");
  drawGrid(heroCtx, canvas.width, canvas.height);
  const wave = Array.from({ length: 90 }, (_, i) => 80 + Math.sin((i + state.tick) / 2.4) * 24 + (i % 13 === 0 ? -34 : 0));
  drawLine(heroCtx, wave, "#28e0a3", 35, 110, 18, 112, canvas.width);
}

function renderPrediction() {
  if (state.scenario === "respiratory") {
    $("prediction").textContent = "AI Prediction: SpO2 decreasing steadily. Estimated deterioration: 5 minutes. Confidence: 82%.";
    $("learningText").textContent = "Similar historical patterns resulted in respiratory failure in 74% of cases.";
  } else if (state.scenario === "cardiac") {
    $("prediction").textContent = "AI Prediction: Heart rate acceleration suggests cardiac instability. Confidence: 79%.";
    $("learningText").textContent = "Comparable heart-rate spikes required urgent ECG review in 68% of prior cases.";
  } else if (state.scenario === "sepsis") {
    $("prediction").textContent = "AI Prediction: Fever with low pressure indicates sepsis risk. Confidence: 84%.";
    $("learningText").textContent = "Historical fever-pressure patterns escalated to septic shock in 61% of severe cases.";
  } else {
    $("prediction").textContent = "AI Prediction: Vitals stable. No deterioration expected.";
    $("learningText").textContent = "Learning loop standing by. New incidents will be compared with historical patterns.";
  }
}

function render() {
  state.tick += 1;
  updateVitals();
  renderNumbers();
  renderMainWave();
  renderHeroWave();
  renderPrediction();
}

function scenarioMeta(name) {
  if (name === "cardiac") return ["Cardiac Emergency", "Possible arrhythmia with acute tachycardia", "Place patient at rest. Prepare ECG notes and medication list."];
  if (name === "respiratory") return ["Acute Hypoxia", "Acute Respiratory Distress", "Sit upright. Administer oxygen if available. Monitor consciousness."];
  if (name === "sepsis") return ["Sepsis Risk", "Possible systemic infection", "Check temperature history. Prepare antibiotic and allergy information."];
  return ["Recovery", "Vitals returning to baseline", "Continue monitoring and document resolution."];
}

function triggerWorkflow() {
  $("workflowStatus").textContent = "Dispatching";
  workflowItems.forEach((item) => {
    item.classList.remove("done");
    item.querySelector("b").textContent = "Waiting";
  });
  workflowItems.forEach((item, index) => {
    setTimeout(() => {
      item.classList.add("done");
      item.querySelector("b").textContent = index === 1 ? "Dispatched" : "Notified";
      if (index === workflowItems.length - 1) $("workflowStatus").textContent = "Complete";
    }, 650 * (index + 1));
  });
}

function showCritical(name) {
  if (name === "recovery") return;
  const [event, cause] = scenarioMeta(name);
  $("criticalTitle").textContent = event;
  $("criticalCause").textContent = cause;
  $("criticalSeverity").textContent = "HIGH";
  $("criticalOverlay").classList.remove("hidden");
  let seconds = 10;
  $("countdown").textContent = seconds;
  const timer = setInterval(() => {
    seconds -= 1;
    $("countdown").textContent = seconds;
    if (seconds <= 0 || $("criticalOverlay").classList.contains("hidden")) clearInterval(timer);
  }, 1000);
}

function setScenario(name) {
  state.scenario = name === "recovery" ? "normal" : name;
  const [event, cause, intervention] = scenarioMeta(name);
  state.event = event;
  state.cause = cause;
  state.intervention = intervention;
  if (name !== "recovery") {
    triggerWorkflow();
    showCritical(name);
  } else {
    $("workflowStatus").textContent = "Resolved";
  }
}

function generateReport() {
  $("reportDate").textContent = new Date().toLocaleString();
  $("reportEvent").textContent = state.event;
  $("reportCause").textContent = state.cause;
  $("reportIntervention").textContent = state.intervention;
  $("reportVitals").textContent = `HR ${Math.round(state.vitals.hr)} - SpO2 ${Math.round(state.vitals.spo2)} - BP ${Math.round(state.vitals.bpS)}/${Math.round(state.vitals.bpD)}`;
  location.hash = "report";
}

function playDemo() {
  clearTimeout(state.demoTimer);
  const sequence = [
    [0, "recovery"],
    [1600, "respiratory"],
    [7400, "report"],
    [10200, "recovery"]
  ];
  location.hash = "monitor";
  sequence.forEach(([delay, step]) => {
    state.demoTimer = setTimeout(() => {
      if (step === "report") generateReport();
      else setScenario(step);
    }, delay);
  });
}

scenarioButtons.forEach(button => button.addEventListener("click", () => setScenario(button.dataset.scenario)));
$("dismissAlert").addEventListener("click", () => $("criticalOverlay").classList.add("hidden"));
$("reportBtn").addEventListener("click", generateReport);
$("downloadReport").addEventListener("click", () => window.print());
$("demoBtn").addEventListener("click", playDemo);
if ($("demoBtnTop")) $("demoBtnTop").addEventListener("click", playDemo);
if ($("viewDemoBtn")) $("viewDemoBtn").addEventListener("click", playDemo);
$("offlineToggle").addEventListener("click", (event) => {
  const pressed = event.currentTarget.getAttribute("aria-pressed") === "true";
  event.currentTarget.setAttribute("aria-pressed", String(!pressed));
  $("networkState").textContent = pressed ? "ONLINE" : "OFFLINE";
  $("edgeNotice").classList.toggle("hidden", pressed);
});

setInterval(render, 450);
render();
