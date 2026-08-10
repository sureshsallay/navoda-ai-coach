let bank = [], quiz = [], i = 0, score = 0, mode = '', answers = [], started = 0, te = false;

let P = JSON.parse(
  localStorage.getItem('navP2') ||
  '{"attempts":0,"correct":0,"answered":0,"topics":{}}'
);

async function init() {
  try {
    bank = await fetch('questions.json?v=2', {
      cache: 'no-store'
    }).then(r => r.json());

    subjects();
    net();
    $('coach').textContent = coachText();

  } catch (e) {
    alert('Questions could not be loaded. Please check questions.json');
  }
}

function $(x) {
  return document.getElementById(x);
}

function net() {
  $('net').textContent =
    navigator.onLine
      ? '🟢 Online + Offline-ready'
      : '🔌 Offline mode';
}

addEventListener('online', net);
addEventListener('offline', net);

function hide() {
  ['home', 'quiz', 'result', 'topics', 'progress']
    .forEach(x => $(x).classList.add('hidden'));
}

function home() {
  hide();
  $('home').classList.remove('hidden');
  $('coach').textContent = coachText();
}

function shuffle(a) {
  return [...a].sort(() => Math.random() - 0.5);
}

function icon(s) {
  return s.includes('Mental')
    ? '🧠'
    : s.includes('Arithmetic')
    ? '➗'
    : s.includes('Language')
    ? '📖'
    : '🌱';
}

function subjects() {
  let c = {};

  bank.forEach(q => {
    c[q.subject] = (c[q.subject] || 0) + 1;
  });

  $('subjects').innerHTML =
    Object.entries(c).map(([s, n]) => `
      <button class="secondary" onclick="subject(${JSON.stringify(s)})">
        ${icon(s)} ${s}<br>
        <span class="small">${n} questions</span>
      </button>
    `).join('');
}

/* =========================
   START QUIZ
========================= */

function start(a, m) {
  if (!a || !a.length) {
    alert('No questions available for this practice.');
    return;
  }

  mode = m;
  quiz = shuffle(a);
  i = 0;
  score = 0;
  answers = [];
  started = Date.now();

  hide();
  $('quiz').classList.remove('hidden');

  render();
}

function quick() {
  start(shuffle(bank).slice(0, 10), 'Quick Practice');
}

function mock() {
  let q = shuffle(bank).slice(0, 20);
  start(q, 'Mock Test');
}

function subject(s) {
  let q = bank.filter(x => x.subject === s).slice(0, 10);
  start(q, 'Subject: ' + s);
}

function topic(t) {
  let q = bank.filter(x => x.topic === t).slice(0, 10);
  start(q, 'Topic: ' + t);
}

/* =========================
   WEAK TOPIC PRACTICE
========================= */

function weakPractice() {

  let topics = Object.entries(P.topics);

  if (!topics.length) {
    alert(
      'You do not have enough practice data yet.\n\n' +
      'Take a Quick Practice or Mock Test first.'
    );
    return;
  }

  // Find topic with lowest accuracy
  topics.sort((a, b) => {

    let accA = a[1].total
      ? a[1].correct / a[1].total
      : 0;

    let accB = b[1].total
      ? b[1].correct / b[1].total
      : 0;

    return accA - accB;
  });

  let weakTopic = topics[0][0];

  let weakQuestions =
    bank.filter(q => q.topic === weakTopic);

  if (!weakQuestions.length) {
    alert('No questions found for your weak topic.');
    return;
  }

  alert(
    '🎯 Your weakest topic is:\n\n' +
    weakTopic +
    '\n\nStarting practice now!'
  );

  start(
    shuffle(weakQuestions).slice(0, 10),
    '🎯 Weak Topic: ' + weakTopic
  );
}

/* =========================
   QUESTION DISPLAY
========================= */

function render() {

  let x = quiz[i];

  $('meta').textContent =
    `${mode} • ${i + 1}/${quiz.length}`;

  $('bar').style.width =
    (i / quiz.length * 100) + '%';

  $('label').textContent =
    `${icon(x.subject)} ${x.subject} • ${x.topic} • ${x.difficulty}`;

  $('q').textContent =
    te
      ? (x.te_question || x.question)
      : x.question;

  $('opts').innerHTML =
    x.options.map((o, n) => `
      <button class="option" onclick="choose(${n})">
        ${String.fromCharCode(65 + n)}. ${o}
      </button>
    `).join('');

  $('next').disabled = true;

  $('exp').classList.add('hidden');
}

/* =========================
   ANSWER
========================= */

function choose(n) {

  let x = quiz[i];

  let bs =
    [...document.querySelectorAll('.option')];

  bs.forEach(b => b.disabled = true);

  let correct = n === x.answer;

  if (correct) {
    score++;
    bs[n].classList.add('correct');
  } else {
    bs[n].classList.add('wrong');

    if (bs[x.answer]) {
      bs[x.answer].classList.add('correct');
    }
  }

  answers.push({
    x: x,
    ok: correct
  });

  $('next').disabled = false;

  $('exp').classList.remove('hidden');

  $('exp').innerHTML =
    `<b>💡 ${
      te
        ? (x.te_explanation || x.explanation)
        : x.explanation
    }</b>`;
}

/* =========================
   NEXT QUESTION
========================= */

function next() {

  i++;

  if (i >= quiz.length) {
    finish();
  } else {
    render();
  }
}

/* =========================
   FINISH
========================= */

function finish() {

  P.attempts++;
  P.correct += score;
  P.answered += quiz.length;

  answers.forEach(a => {

    let t = a.x.topic;

    if (!P.topics[t]) {
      P.topics[t] = {
        correct: 0,
        total: 0
      };
    }

    P.topics[t].total++;

    if (a.ok) {
      P.topics[t].correct++;
    }
  });

  localStorage.setItem(
    'navP2',
    JSON.stringify(P)
  );

  let acc =
    Math.round(score / quiz.length * 100);

  let secs =
    Math.round((Date.now() - started) / 1000);

  hide();

  $('result').classList.remove('hidden');

  $('stats').innerHTML = `
    <div class="stat">
      Score
      <b>${score}/${quiz.length}</b>
    </div>

    <div class="stat">
      Accuracy
      <b>${acc}%</b>
    </div>

    <div class="stat">
      Time
      <b>${Math.floor(secs / 60)}m ${secs % 60}s</b>
    </div>
  `;

  $('rec').textContent = rec(acc);

  let t = {};

  answers.forEach(a => {

    let k = a.x.topic;

    if (!t[k]) {
      t[k] = {
        c: 0,
        n: 0
      };
    }

    t[k].n++;

    if (a.ok) {
      t[k].c++;
    }
  });

  $('analysis').innerHTML =
    Object.entries(t).map(([k, v]) => `
      <div class="stat" style="margin:7px 0">
        <b style="font-size:18px">${k}</b>
        ${v.c}/${v.n} correct —
        ${Math.round(v.c / v.n * 100)}%
      </div>
    `).join('');

  $('coach').textContent =
    coachText();
}

/* =========================
   RECOMMENDATION
========================= */

function rec(a) {

  return a >= 90
    ? 'Excellent — move to harder sets and full mocks.'
    : a >= 75
    ? 'Strong — mix timed tests with weak-topic practice.'
    : a >= 50
    ? 'Good start — revise weak topics and try again.'
    : 'Keep practising — focus on explanations and weak topics.';
}

function coachText() {

  if (!P.answered) {
    return 'Take a test to get a recommendation.';
  }

  let a =
    Math.round(P.correct / P.answered * 100);

  return `Overall accuracy: ${a}%. ${rec(a)}`;
}

/* =========================
   TOPICS
========================= */

function topics() {

  hide();

  $('topics').classList.remove('hidden');

  let ts =
    [...new Set(bank.map(q => q.topic))].sort();

  $('topicList').innerHTML =
    ts.map(t => `
      <button class="secondary"
        onclick="topic(${JSON.stringify(t)})">
        ${t}
      </button>
    `).join('');
}

/* =========================
   PROGRESS
========================= */

function progressPage() {

  hide();

  $('progress').classList.remove('hidden');

  let a =
    P.answered
      ? Math.round(P.correct / P.answered * 100)
      : 0;

  $('pstats').innerHTML = `
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
      <b>${a}%</b>
    </div>
  `;

  let w =
    Object.entries(P.topics)
      .sort((a, b) =>
        a[1].correct / a[1].total -
        b[1].correct / b[1].total
      )
      .slice(0, 6);

  $('weak').innerHTML =
    w.length
      ? w.map(([t, v]) => `
          <div class="stat" style="margin:7px 0">
            <b style="font-size:18px">${t}</b>
            ${v.correct}/${v.total} correct —
            ${Math.round(v.correct / v.total * 100)}%
          </div>
        `).join('')
      : 'No data yet.';
}

/* =========================
   RESET
========================= */

function resetP() {

  if (confirm('Reset progress on this device?')) {

    P = {
      attempts: 0,
      correct: 0,
      answered: 0,
      topics: {}
    };

    localStorage.setItem(
      'navP2',
      JSON.stringify(P)
    );

    progressPage();
  }
}

/* =========================
   LANGUAGE
========================= */

function lang() {

  te = !te;

  alert(
    te
      ? 'తెలుగు ప్రశ్న మోడ్'
      : 'English question mode'
  );

  if (!$('quiz').classList.contains('hidden')) {
    render();
  }
}

/* =========================
   START APP
========================= */

init();

/* =========================
   OFFLINE SUPPORT
========================= */

if ('serviceWorker' in navigator) {

  navigator.serviceWorker
    .register('service-worker.js')
    .catch(() => {});
}
