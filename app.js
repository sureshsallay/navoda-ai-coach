let bank=[],quiz=[],i=0,score=0,mode="",answers=[],started=0,te=false;

let P=JSON.parse(localStorage.getItem("navP2")||'{"attempts":0,"correct":0,"answered":0,"topics":{}}');

const $=id=>document.getElementById(id);

function fixText(s){
  if(!s)return "";
  try{
    if(/à|á|â|ã|ä|å|°|±|²|³/.test(s))
      return decodeURIComponent(escape(s));
  }catch(e){}
  return s;
}

async function init(){
  try{
    let r=await fetch("questions.json?v="+Date.now(),{cache:"no-store"});
    if(!r.ok)throw Error();
    bank=await r.json();

    bank=bank.map(q=>({
      ...q,
      subject:fixText(q.subject),
      topic:fixText(q.topic),
      question:fixText(q.question),
      te_question:fixText(q.te_question),
      explanation:fixText(q.explanation),
      te_explanation:fixText(q.te_explanation),
      options:(q.options||[]).map(fixText)
    }));

    subjects();
    net();
    $("coach").textContent=coachText();
  }catch(e){
    alert("questions.json could not be loaded.");
  }
}

function net(){
  $("net").textContent=navigator.onLine?
    "🟢 Online + Offline-ready":"🔌 Offline mode";
}

addEventListener("online",net);
addEventListener("offline",net);

function hide(){
  ["home","quiz","result","topics","progress"]
  .forEach(x=>$(x).classList.add("hidden"));
}

function home(){
  hide();
  $("home").classList.remove("hidden");
  $("coach").textContent=coachText();
}

function shuffle(a){
  return [...a].sort(()=>Math.random()-.5);
}

function icon(s){
  s=s||"";
  if(s.includes("Mental"))return"🧠";
  if(s.includes("Arithmetic"))return"➗";
  if(s.includes("Language"))return"📖";
  return"🌱";
}

function subjects(){
  let c={};
  bank.forEach(q=>c[q.subject]=(c[q.subject]||0)+1);

  $("subjects").innerHTML=Object.entries(c).map(([s,n])=>`
    <button class="secondary" onclick='subject(${JSON.stringify(s)})'>
      ${icon(s)} ${s}<br>
      <span class="small">${n} questions</span>
    </button>
  `).join("");
}

/* ---------- PRACTICE ---------- */

function start(list,m){
  if(!list.length){
    alert("No questions available.");
    return;
  }

  mode=m;
  quiz=shuffle(list);
  i=0;
  score=0;
  answers=[];
  started=Date.now();

  hide();
  $("quiz").classList.remove("hidden");
  render();
}

function quick(){
  start(shuffle(bank).slice(0,10),"Quick Practice");
}

function mock(){
  start(shuffle(bank).slice(0,20),"Mock Test");
}

function subject(s){
  start(bank.filter(q=>q.subject===s).slice(0,10),"Subject: "+s);
}

function topic(t){
  start(bank.filter(q=>q.topic===t).slice(0,10),"Topic: "+t);
}

/* ---------- WEAK TOPIC ---------- */

function weakPractice(){

  let data=Object.entries(P.topics)
    .filter(([t,v])=>v&&v.total>0)
    .map(([t,v])=>({
      topic:t,
      total:v.total,
      correct:v.correct||0,
      accuracy:(v.correct||0)/v.total
    }));

  if(!data.length){
    alert(
      "🎯 No weak-topic data yet.\n\n"+
      "Complete a Quick Practice or Mock Test first."
    );
    return;
  }

  /* Prefer topics with enough attempts */
  let reliable=data.filter(x=>x.total>=3);
  let list=reliable.length?reliable:data;

  list.sort((a,b)=>
    a.accuracy-b.accuracy ||
    b.total-a.total
  );

  let weak=list[0];

  let qs=bank.filter(q=>
    q.topic.trim().toLowerCase()===
    weak.topic.trim().toLowerCase()
  );

  if(!qs.length){
    alert("Questions for this topic are not available.");
    return;
  }

  start(
    shuffle(qs).slice(0,Math.min(10,qs.length)),
    "🎯 Weak Topic: "+weak.topic
  );
}

/* ---------- QUESTION ---------- */

function render(){

  let q=quiz[i];

  $("meta").textContent=
    `${mode} • ${i+1}/${quiz.length}`;

  $("bar").style.width=
    ((i+1)/quiz.length*100)+"%";

  $("label").textContent=
    `${icon(q.subject)} ${q.subject} • ${q.topic} • ${q.difficulty}`;

  $("q").textContent=
    te?(q.te_question||q.question):q.question;

  $("opts").innerHTML=(q.options||[]).map((o,n)=>`
    <button class="option" onclick="choose(${n})">
      ${String.fromCharCode(65+n)}. ${o}
    </button>
  `).join("");

  $("next").disabled=true;
  $("exp").classList.add("hidden");
}

/* ---------- ANSWER ---------- */

function choose(n){

  let q=quiz[i];
  let buttons=[...document.querySelectorAll(".option")];
  buttons.forEach(b=>b.disabled=true);

  let ok=n===q.answer;

  if(ok){
    score++;
    buttons[n].classList.add("correct");
  }else{
    buttons[n].classList.add("wrong");
    if(buttons[q.answer])
      buttons[q.answer].classList.add("correct");
  }

  answers.push({q,ok});

  $("next").disabled=false;
  $("exp").classList.remove("hidden");

  $("exp").innerHTML=
    `<b>💡 ${te?
      (q.te_explanation||q.explanation):
      q.explanation}</b>`;
}

function next(){
  if(++i<quiz.length)render();
  else finish();
}

/* ---------- RESULT ---------- */

function finish(){

  P.attempts++;
  P.correct+=score;
  P.answered+=quiz.length;

  answers.forEach(a=>{
    let t=a.q.topic;

    if(!P.topics[t])
      P.topics[t]={correct:0,total:0};

    P.topics[t].total++;
    if(a.ok)P.topics[t].correct++;
  });

  localStorage.setItem("navP2",JSON.stringify(P));

  let acc=Math.round(score/quiz.length*100);
  let sec=Math.round((Date.now()-started)/1000);

  hide();
  $("result").classList.remove("hidden");

  $("stats").innerHTML=`
    <div class="stat">Score<b>${score}/${quiz.length}</b></div>
    <div class="stat">Accuracy<b>${acc}%</b></div>
    <div class="stat">Time<b>${Math.floor(sec/60)}m ${sec%60}s</b></div>
  `;

  $("rec").textContent=rec(acc);

  let t={};

  answers.forEach(a=>{
    let k=a.q.topic;
    if(!t[k])t[k]={c:0,n:0};
    t[k].n++;
    if(a.ok)t[k].c++;
  });

  $("analysis").innerHTML=Object.entries(t).map(([k,v])=>`
    <div class="stat" style="margin:7px 0">
      <b style="font-size:18px">${k}</b>
      ${v.c}/${v.n} correct —
      ${Math.round(v.c/v.n*100)}%
    </div>
  `).join("");

  $("coach").textContent=coachText();
}

function rec(a){
  if(a>=90)return"Excellent — move to harder sets and full mocks.";
  if(a>=75)return"Strong — practise weak topics and timed tests.";
  if(a>=50)return"Good start — revise weak topics and try again.";
  return"Keep practising — focus on your weakest topics.";
}

function coachText(){

  if(!P.answered)
    return"Take a test to get a recommendation.";

  let a=Math.round(P.correct/P.answered*100);

  let w=Object.entries(P.topics)
    .filter(([t,v])=>v.total>=3)
    .sort((a,b)=>
      a[1].correct/a[1].total-
      b[1].correct/b[1].total
    )[0];

  return w?
    `Overall accuracy: ${a}%. Focus next on "${w[0]}".`:
    `Overall accuracy: ${a}%. ${rec(a)}`;
}

/* ---------- TOPICS ---------- */

function topics(){

  hide();
  $("topics").classList.remove("hidden");

  let ts=[...new Set(bank.map(q=>q.topic))].sort();

  $("topicList").
