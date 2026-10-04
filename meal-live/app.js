(function(){
const style=document.createElement("style");
style.textContent=`
:root{--orange:#FF643C;--ecru:#FFF0E6;--pink:#FFB9B9;--plum:#692337;--cream:#FFFAF6;--line:rgba(105,35,55,.15)}
*{box-sizing:border-box}
html,body{margin:0;background:transparent;color:var(--plum)}
body{font-family:"DM Sans",sans-serif}
.widget{width:100%;min-height:310px;background:var(--ecru);border-radius:22px;overflow:hidden;position:relative;padding:24px;box-shadow:0 10px 30px rgba(105,35,55,.08)}
.widget:before,.widget:after{content:"";position:absolute;border-radius:999px;pointer-events:none}
.widget:before{width:210px;height:210px;background:var(--pink);right:-90px;top:-120px;opacity:.55}
.widget:after{width:170px;height:170px;background:var(--orange);left:-100px;bottom:-115px;opacity:.9}
.grid{position:relative;z-index:1;display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:16px}
.card{min-width:0;min-height:250px;border:1px solid var(--line);border-radius:18px;padding:20px;background:rgba(255,250,246,.72)}
.dinner{background:var(--plum);color:var(--ecru);border:0;display:flex;flex-direction:column;justify-content:space-between}
.eyebrow{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px}
.dinner .eyebrow{color:var(--pink)} .future .eyebrow{color:var(--orange)} .today .eyebrow{color:var(--plum)}
h1,h2{font-family:"DM Serif Display",Georgia,serif;font-weight:400;margin:0}
h1{font-size:clamp(28px,3.2vw,46px);line-height:1.02}
h2{font-size:25px;line-height:1.05}
.date{margin-top:8px;font-size:13px;color:rgba(255,240,230,.72)}
.badge{display:inline-flex;width:max-content;margin-top:20px;padding:7px 10px;border-radius:999px;background:var(--pink);color:var(--plum);font-size:12px;font-weight:700}
.list{display:flex;flex-direction:column;gap:9px;margin-top:16px}
.item{padding:10px 0;border-bottom:1px solid var(--line)} .item:last-child{border-bottom:0}
.task{font-size:14px;line-height:1.25;font-weight:600}
.for{font-size:11px;margin-top:3px;opacity:.65}
.empty{font-family:"DM Serif Display",Georgia,serif;font-size:17px;opacity:.6;margin-top:18px}
.error{color:var(--orange);opacity:1}
.day-group{margin-top:15px}
.day{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--orange)}
.status{position:relative;z-index:1;text-align:right;margin-top:12px;font-size:10px;opacity:.45}
.status.warn{opacity:1;color:var(--orange);font-weight:700}
@media(max-width:700px){.widget{padding:14px}.grid{grid-template-columns:1fr}.card{min-height:auto;padding:17px}}
`;
document.head.appendChild(style);

const fonts=document.createElement("link");
fonts.rel="stylesheet";
fonts.href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap";
document.head.appendChild(fonts);

document.getElementById("app").innerHTML=`
<div class="widget">
  <div class="grid">
    <section class="card dinner">
      <div>
        <div class="eyebrow">Dinner tonight</div>
        <h1 id="meal">Loading…</h1>
        <div class="date" id="date"></div>
      </div>
      <div class="badge" id="kids" hidden>Kids tonight</div>
    </section>
    <section class="card today">
      <div class="eyebrow">Today</div>
      <h2>Prep for tonight</h2>
      <div class="list" id="tonight"><div class="empty">Loading…</div></div>
    </section>
    <section class="card future">
      <div class="eyebrow">Prep ahead</div>
      <h2>Future dinners</h2>
      <div id="ahead"><div class="empty">Loading…</div></div>
    </section>
  </div>
  <div class="status" id="status"></div>
</div>`;

const TZ="Australia/Brisbane";
const DATA_URL="../meal-v2.json";
function brisbaneDateKey(){
  const p=new Intl.DateTimeFormat("en-AU",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const v=t=>p.find(x=>x.type===t)?.value;
  return v("year")+"-"+v("month")+"-"+v("day");
}
function prettyDate(iso){
  return new Intl.DateTimeFormat("en-AU",{timeZone:TZ,weekday:"long",day:"numeric",month:"long"}).format(new Date(iso+"T12:00:00+10:00"));
}
function createTask(t){
  const row=document.createElement("div"); row.className="item";
  const name=document.createElement("div"); name.className="task"; name.textContent=t.task; row.appendChild(name);
  if(t.targetDinner){const sub=document.createElement("div"); sub.className="for"; sub.textContent="for "+t.targetDinner; row.appendChild(sub);}
  return row;
}
function ageMinutes(iso){const n=new Date(iso).getTime(); return Number.isFinite(n)?Math.round((Date.now()-n)/60000):999999;}
async function load(){
  const today=brisbaneDateKey();
  document.getElementById("date").textContent=prettyDate(today);
  try{
    const response=await fetch(DATA_URL+"?v="+Date.now(),{cache:"no-store"});
    if(!response.ok) throw new Error("HTTP "+response.status);
    const data=await response.json();
    if(!data.generatedAt||!data.days||!Array.isArray(data.prep)) throw new Error("Invalid feed");
    const stale=ageMinutes(data.generatedAt)>120;
    const dinners=data.days[today]?.dinners||[];
    const meal=document.getElementById("meal"), kids=document.getElementById("kids");
    if(dinners.length){
      meal.textContent=dinners.map(d=>d.name).join(" + ");
      kids.hidden=!dinners.some(d=>d.kidsTonight);
    }else{
      meal.textContent="Nothing planned";
      kids.hidden=true;
    }
    const due=data.prep.filter(t=>t.doDate===today&&!t.done);
    const tonight=due.filter(t=>t.targetDate===today);
    const ahead=due.filter(t=>t.targetDate&&t.targetDate>today);
    const tonightEl=document.getElementById("tonight"); tonightEl.innerHTML="";
    tonight.forEach(t=>tonightEl.appendChild(createTask(t)));
    if(!tonight.length) tonightEl.innerHTML='<div class="empty">Nothing to prep — just cook.</div>';
    const aheadEl=document.getElementById("ahead"); aheadEl.innerHTML="";
    const grouped={}; ahead.forEach(t=>(grouped[t.targetDate]??=[]).push(t));
    Object.keys(grouped).sort().forEach(date=>{
      const group=document.createElement("div"); group.className="day-group";
      const label=document.createElement("div"); label.className="day"; label.textContent=prettyDate(date);
      const list=document.createElement("div"); list.className="list";
      grouped[date].forEach(t=>list.appendChild(createTask(t)));
      group.append(label,list); aheadEl.appendChild(group);
    });
    if(!ahead.length) aheadEl.innerHTML='<div class="empty">Nothing needed today.</div>';
    const status=document.getElementById("status");
    const synced=new Date(data.generatedAt).toLocaleTimeString("en-AU",{timeZone:TZ,hour:"numeric",minute:"2-digit"});
    if(stale){status.className="status warn";status.textContent="Meal feed is stale · last sync "+synced;}
    else{status.className="status";status.textContent="Synced "+synced;}
  }catch(err){
    document.getElementById("meal").textContent="Couldn’t load meal plan";
    document.getElementById("kids").hidden=true;
    document.getElementById("tonight").innerHTML='<div class="empty error">Meal data unavailable — not an empty plan.</div>';
    document.getElementById("ahead").innerHTML='<div class="empty error">Prep data unavailable.</div>';
    const status=document.getElementById("status"); status.className="status warn"; status.textContent="Data error";
  }
}
load();
setInterval(load,5*60*1000);
})();