let bank = [];
let quiz = [];
let index = 0;
let score = 0;
let mode = "";
let answers = [];
let started = 0;
let te = false;

const KEY = "navP2";

let P = JSON.parse(localStorage.getItem(KEY) || JSON.stringify({
  attempts: 0,
  correct: 0,
  answered: 0,
  topics: {}
}));

const $ = id => document.getElementById(id);

async function init() {
  try {
    const r = await fetch("./questions.json?v=" + Date.now(), {
      cache: "no-store"
    });

    if (!r.ok) throw new Error("questions.json not found");

    bank = await r.json();

    if (!Array.isArray(bank) || !bank.length) {
      throw new Error("Question bank is empty");
    }

    subjects();
    net();
    $("coach").textContent = coachText();

  } catch (e) {
    console.error(e);
    alert(
      "Question bank could not be loaded.\n\n" +
      "Check that questions.json is in the same folder as app.js."
    );
  }
}

function net() {
  $("net").textContent =
    navigator.onLine
      ? "🟢 Online + Offline-ready"
      : "🔌 Offline mode";
}

addEventListener("online", net);
addEventListener("offline", net);

function hide() {
  ["home", "quiz", "result", "topics", "progress"]
    .forEach(id => {
      const el = $(id);
      if (el) el.classList.add("hidden");
    });
}

function home() {
  hide();
  $("home").classList.remove("hidden");
  $("coach").textContent = coachText();
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function icon(subject) {
  if ((subject || "").includes("Mental")) return "🧠";
  if ((subject || "").includes("Arithmetic")) return "➗";
  if ((subject || "").includes("Language")) return "📖";
  return "🌱";
}

/* ---------- SUBJECTS ---------- */

function subjects() {
  const count = {};

  bank.forEach(q => {
    count[q.subject] = (count[q.subject] || 0) + 1;
  });

  $("subjects").innerHTML =
    Object.entries(count).map(([s, n]) => `
      <button class="secondary"
        onclick='subject(${JSON.stringify(s)})'>
        ${icon(s)} ${s}<br>
        <span class="small">${n} questions</span>
      </button>
    `).join("");
}

/* ---------- START PRACTICE ---------- */

function start(list, name) {

  if (!list || !list.length) {
    alert("No questions are available for this practice set.");
    return;
  }

  mode = name;
  quiz = shuffle(list);
  index = 0;
  score = 0;
  answers = [];
  started = Date.now();

  hide();
  $("quiz").classList.remove("hidden");

  render();
}

function quick() {
  start(shuffle(bank).slice(0, 10), "⚡ Quick Practice");
}

function mock() {
  start(shuffle(bank).slice(0, 20), "📝 Mock Test");
}

function subject(s) {
  start(
    bank.filter(q => q.subject === s).slice(0, 10),
    "📚 " + s
  );
}

function topic(t) {
  start(
    bank.filter(q => q.topic === t).slice(0, 10),
    "🎯 " + t
  );
}

/* ---------- WEAK TOPIC ---------- */

function weakPractice() {

  const entries = Object.entries(P.topics);

  if (!entries.length) {
    alert(
      "You need some practice data first.\n\n" +
      "Complete a Quick Practice or Mock Test."
    );
    return;
  }

  /*
    Better weak-topic selection:

    1. Ignore topics attempted only once when possible.
    2. Prefer lower accuracy.
    3. If accuracy is equal, choose the topic
       with more attempted questions.
  */

  const usable = entries.filter(([topic, data]) =>
    data && data.total > 0
  );

  usable.sort((a, b) => {

    const A = a[1];
    const B = b[1];

    const accA = A.correct / A.total;
    const accB = B.correct / B.total;

    if (accA !== accB) {
      return accA - accB;
    }

    return B.total - A.total;
  });

  const weakTopic = usable[0][0];

  let questions = bank.filter(
    q => q.topic === weakTopic
  );

  if (!questions.length) {
    alert("Questions for this weak topic were not found.");
    return;
  }

  /*
    Use ALL available questions when fewer than 10.
    Otherwise select 10 randomly.
  */

  questions = shuffle(questions);

  const set = questions.length > 10
    ? questions.slice(0, 10)
    : questions;

  alert(
    "🎯 Weak Topic\n\n" +
    weakTopic +
    "\n\n" +
    "Questions: " + set.length +
    "\n\nStarting practice..."
  );

  start(
    set,
    "🎯 Weak Topic: " + weakTopic
  );
}

/* ---------- QUESTION DISPLAY ---------- */

function render() {

  const q = quiz[index];

  $("meta").textContent =
    `${mode} • ${index + 1}/${quiz.length}`;

  $("bar").style.width =
    ((index / quiz.length) * 100) + "%";

  $("label").textContent =
    `${icon(q.subject)} ${q.subject} • ${q.topic} • ${q.difficulty || ""}`;

  $("q").textContent =
    te
      ? (q.te_question || q.question)
      : q.question;

  $("opts").innerHTML =
    (q.options || []).map((option, n) => `
      <button class="option"
        onclick="choose(${n})">
        ${String.fromCharCode(65 + n)}. ${option}
      </button>
    `).join("");

  $("next").disabled = true;
  $("exp").classList.add("hidden");
  $("exp").textContent = "";
}

/* ---------- ANSWER ---------- */

function choose(n) {

  const q = quiz[index];
  const buttons = [...document.querySelectorAll(".option")];

  buttons.forEach(b => b.disabled = true);

  const correct = Number(n) === Number(q.answer);

  if (correct) {
    score++;
    buttons[n]?.classList.add("correct");
  } else {
    buttons[n]?.classList.add("wrong");
    buttons[q.answer]?.classList.add("correct");
  }

  answers.push({
    question: q,
    correct
  });

  $("next").disabled = false;

  $("exp").classList.remove("hidden");

  $("exp").textContent =
    te
      ? (q.te_explanation || q.explanation || "")
      : (q.explanation || "");
}

/* ---------- NEXT ---------- */

function next() {

  index++;

  if (index >= quiz.length) {
    finish();
  } else {
    render();
  }
}

/* ---------- FINISH ---------- */

function finish() {

  P.attempts++;
  P.correct += score;
  P.answered += quiz.length;

  answers.forEach(a => {

    const topic = a.question.topic || "General";

    if (!P.topics[topic]) {
      P.topics[topic] = {
        correct: 0,
        total: 0
      };
    }

    P.topics[topic].total++;

    if (a.correct) {
      P.topics[topic].correct++;
    }
  });

  localStorage.setItem(KEY, JSON.stringify(P));

  const accuracy =
    Math.round((score / quiz.length) * 100);

  const seconds =
    Math.round((Date.now() - started) / 1000);

  hide();
  $("result").classList.remove("hidden");

  $("stats").innerHTML = `
    <div class="stat">
      Score
      <b>${score}/${quiz.length}</b>
    </div>

    <div class="stat">
      Accuracy
      <b>${accuracy}%</b>
    </div>

    <div class="stat">
      Time
      <b>${Math.floor(seconds / 60)}m ${seconds % 60}s</b>
    </div>
  `;

  $("rec").textContent = rec(accuracy);

  const analysis = {};

  answers.forEach(a => {

    const t = a.question.topic || "General";

    if (!analysis[t]) {
      analysis[t] = { correct: 0, total: 0 };
    }

    analysis[t].total++;

    if (a.correct) {
      analysis[t].correct++;
    }
  });

  $("analysis").innerHTML =
    Object.entries(analysis).map(([t, v]) => `
      <div class="stat" style="margin:7px 0">
        <b style="font-size:18px">${t}</b>
        ${v.correct}/${v.total} correct —
        ${Math.round(v.correct / v.total * 100)}%
      </div>
    `).join("");

  $("coach").textContent = coachText();
}

/* ---------- COACH ---------- */

function rec(a) {

  if (a >= 90)
    return "Excellent! Try harder JNV-level questions and timed mock tests.";

  if (a >= 75)
    return "Good performance. Continue mixed practice and revise weak topics.";

  if (a >= 50)
    return "Keep practising. Give extra attention to your weak topics.";

  return "More practice is needed. Start with your weakest topic and study the explanations carefully.";
}

function coachText() {

  if (!P.answered) {
    return "Take a test to get a recommendation.";
  }

  const accuracy =
    Math.round(P.correct / P.answered * 100);

  return `Overall accuracy: ${accuracy}%. ${rec(accuracy)}`;
}

/* ---------- TOPICS ---------- */

function topics() {

  hide();
  $("topics").classList.remove("hidden");

  const list =
    [...new Set(bank.map(q => q.topic).filter(Boolean))]
      .sort();

  $("topicList").innerHTML =
    list.map(t => `
      <button class="secondary"
        onclick='topic(${JSON.stringify(t)})'>
        🎯 ${t}
      </button>
    `).join("");
}

/* ---------- PROGRESS ---------- */

function progressPage() {

  hide();
  $("progress").classList.remove("hidden");

  const accuracy =
    P.answered
      ? Math.round(P.correct / P.answered * 100)
      : 0;

  $("pstats").innerHTML = `
    <div class="stat">
      Attempts
      <b>${P.attempts}</b>
    </div>

    <div class="stat">
      Questions
      <b>${P.answered}</b>
    </div>

    <div class="stat">
      Accuracy
      <b>${accuracy}%</b>
    </div>
  `;

  const weak =
    Object.entries(P.topics)
      .filter(([t, v]) => v.total > 0)
      .sort((a, b) => {

        const aa = a[1].correct / a[1].total;
        const ab = b[1].correct / b[1].total;

        return aa - ab;
      })
      .slice(0, 6);

  $("weak").innerHTML =
    weak.length
      ? weak.map(([t, v]) => `
        <div class="stat" style="margin:7px 0">
          <b style="font-size:18px">${t}</b>
          ${v.correct}/${v.total} correct —
          ${Math.round(v.correct / v.total * 100)}%
        </div>
      `).join("")
      : "No practice data yet.";
}

/* ---------- RESET ---------- */

function resetP() {

  if (!confirm("Reset all progress on this device?")) {
    return;
  }

  P = {
    attempts: 0,
    correct: 0,
    answered: 0,
    topics: {}
  };

  localStorage.setItem(KEY, JSON.stringify(P));

  progressPage();
}

/* ---------- LANGUAGE ---------- */

function lang() {

  te = !te;

  alert(
    te
      ? "తెలుగు ప్రశ్న మోడ్"
      : "English question mode"
  );

  if (!$("quiz").classList.contains("hidden")) {
    render();
  }
}

/* ---------- START ---------- */

init();

/* ---------- SERVICE WORKER ---------- */

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./service-worker.js")
    .catch(err => console.log("SW:", err));
}
