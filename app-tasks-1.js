function extractEventText(text,removeParts){
  let out=String(text||"");
  const spans=[...new Set((removeParts||[]).filter(Boolean).map(x=>String(x).trim()).filter(Boolean))].sort((a,b)=>b.length-a.length);
  const hasTemporalSlots=spans.length>0;
  for(const span of spans) out=out.replace(span," ");

  const trimEdges=()=>{
    out=out.replace(/^[,，。；;、：:\s]+|[,，。；;、：:\s]+$/g,"").replace(/\s+/g," ").trim();
  };
  const stripLeadingConnectors=()=>{
    if(!hasTemporalSlots) return;
    out=out.replace(/^\s*(?:(?:的)?时候|到时候|时|左右|前后|开始|结束)\s*/,"");
    out=out.replace(/^\s*(?:接下来(?:的)?|从现在(?:开始|起)?|现在(?:开始|起))\s*/,"");
    out=out.replace(/^\s*(?:每天)?\s*(?:从)?\s*(?:到|至)?\s*/,"");
  };
  const stripCommandShell=()=>{
    out=out
      .replace(/^\s*(?:请|麻烦)\s*/,"")
      .replace(/^\s*(?:帮我(?:记得)?|记得|别忘了|不要忘记)\s*/,"")
      .replace(/^\s*(?:提醒我(?:一下)?|提醒(?:我)?(?:一下)?|通知我(?:一下)?)\s*/,"")
      .replace(/^\s*(?:叫我(?:做)?(?:一次|一下)?|叫我)\s*/,"")
      .replace(/^\s*(?:我要|我想要)\s*/,"");
  };

  trimEdges();
  for(let i=0;i<6;i++){
    const before=out;
    stripLeadingConnectors();
    trimEdges();
    stripCommandShell();
    trimEdges();
    if(out===before) break;
  }

  if(hasTemporalSlots){
    out=out.replace(/\s*(?:提醒我(?:一下)?|提醒(?:我)?(?:一下)?|通知我(?:一下)?|叫我(?:做)?(?:一次|一下)?)\s*/g," ");
    trimEdges();
  }
  return out || String(text||"").trim();
}

function parseInput(raw,now=new Date()){
  const original=raw.trim();
  let text=original, date=null, time=null, dueAt=null, relativeMinutes=null;
  let repeatMinutes=0, repeatLabel="", repeatDaily=false, repeatStartTime=null, repeatEndTime=null;
  let repeatEndNextDay=false, repeatWindowStartAt=null, repeatWindowEndAt=null, repeatWindowEnded=false;
  const today=localDate(now);
  const removeParts=[];
  const remember=s=>{ if(s) removeParts.push(s); };
  let dateExplicit=false;

  let rp=text.match(/每(?:隔)?\s*半\s*个?\s*小时/);
  if(rp){ repeatMinutes=30; repeatLabel="每30分钟"; remember(rp[0]); }
  else{
    rp=text.match(/每(?:隔)?\s*([0-9零〇一二两三四五六七八九十百\s]+?)\s*分钟/);
    if(rp){ repeatMinutes=cnNumber(rp[1]); repeatLabel=`每${repeatMinutes}分钟`; remember(rp[0]); }
    else{
      rp=text.match(/每(?:隔)?\s*([0-9零〇一二两三四五六七八九十百\s]+?)\s*个?\s*小时/);
      if(rp){ repeatMinutes=cnNumber(rp[1])*60; repeatLabel=repeatMinutes%60===0?`每${repeatMinutes/60}小时`:`每${repeatMinutes}分钟`; remember(rp[0]); }
    }
  }
  if(!Number.isFinite(repeatMinutes) || repeatMinutes<1) repeatMinutes=0;

  let relTime=text.match(/半\s*个?\s*小时\s*(?:后|之后|以后)/);
  if(relTime){ relativeMinutes=30; remember(relTime[0]); }
  else{
    relTime=text.match(/([0-9零〇一二两三四五六七八九十百\s]+?)\s*分钟\s*(?:后|之后|以后)/);
    if(relTime){ relativeMinutes=cnNumber(relTime[1]); remember(relTime[0]); }
    else{
      relTime=text.match(/([0-9零〇一二两三四五六七八九十百\s]+?)\s*个?\s*小时\s*(?:后|之后|以后)/);
      if(relTime){ relativeMinutes=cnNumber(relTime[1])*60; remember(relTime[0]); }
    }
  }

  if(Number.isFinite(relativeMinutes) && relativeMinutes>0){
    const target=new Date(now.getTime()+relativeMinutes*60000);
    date=localDate(target);
    time=`${String(target.getHours()).padStart(2,"0")}:${String(target.getMinutes()).padStart(2,"0")}`;
    dueAt=localDateTimeISO(target);
    dateExplicit=true;
  }

  if(!dueAt){
    if(/后天/.test(text)){ date=localDate(addDays(now,2)); dateExplicit=true; remember(text.match(/后天/)[0]); }
    else if(/明天/.test(text)){ date=localDate(addDays(now,1)); dateExplicit=true; remember(text.match(/明天/)[0]); }
    else if(/今天|今晚/.test(text)){ date=today; dateExplicit=true; const dm=text.match(/今天|今晚/); if(dm) remember(dm[0]); }

    const dateNum="[0-9零〇一二两三四五六七八九十]+";
    const md=new RegExp(`(${dateNum})\\s*月\\s*(${dateNum})\\s*(?:日|号)`);
    const mm=text.match(md);
    if(mm){
      let y=now.getFullYear(), mon=cnNumber(mm[1]), day=cnNumber(mm[2]);
      if(mon>=1 && mon<=12 && day>=1 && day<=31){
        let candidate=new Date(y,mon-1,day); const startToday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
        if(candidate<startToday) candidate=new Date(y+1,mon-1,day);
        date=localDate(candidate); dateExplicit=true; remember(mm[0]);
      }
    }
    const iso=text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if(iso){ date=`${iso[1]}-${String(iso[2]).padStart(2,"0")}-${String(iso[3]).padStart(2,"0")}`; dateExplicit=true; remember(iso[0]); }
    if(/周末/.test(text)){
      let delta=(6-now.getDay()+7)%7; if(delta===0) delta=7; date=localDate(addDays(now,delta)); dateExplicit=true; remember("周末");
    }else{
      const weekMap={"周日":0,"周天":0,"星期日":0,"星期天":0,"周一":1,"星期一":1,"周二":2,"星期二":2,"周三":3,"星期三":3,"周四":4,"星期四":4,"周五":5,"星期五":5,"周六":6,"星期六":6};
      for(const [k,w] of Object.entries(weekMap)){
        if(text.includes(k)){ let delta=(w-now.getDay()+7)%7; if(delta===0) delta=7; date=localDate(addDays(now,delta)); dateExplicit=true; remember(k); break; }
      }
    }

    const dailyHint=/每天/.test(text);
    const baseDate=date?new Date(`${date}T00:00:00`):new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const range=parseTimeRange(text,baseDate,now,{dateExplicit,daily:dailyHint});
    if(range){
      remember(range.matched); repeatDaily=dailyHint || range.daily; repeatStartTime=range.startTime; repeatEndTime=range.endTime; repeatEndNextDay=range.endNextDay;
      if(repeatMinutes>0 && repeatDaily){
        const target=nextDailyWindowOccurrence(repeatStartTime,repeatEndTime,repeatMinutes,new Date(now.getTime()-1000),repeatEndNextDay);
        if(target){ date=localDate(target); time=`${String(target.getHours()).padStart(2,"0")}:${String(target.getMinutes()).padStart(2,"0")}`; dueAt=localDateTimeISO(target); }
      }else if(repeatMinutes>0){
        repeatWindowStartAt=localDateTimeISO(range.start); repeatWindowEndAt=localDateTimeISO(range.end);
        const target=nextOneTimeWindowOccurrence(repeatWindowStartAt,repeatWindowEndAt,repeatMinutes,new Date(now.getTime()-1000));
        if(target){ date=localDate(target); time=`${String(target.getHours()).padStart(2,"0")}:${String(target.getMinutes()).padStart(2,"0")}`; dueAt=localDateTimeISO(target); }
        else{ date=localDate(range.start); repeatWindowEnded=true; }
      }else{ date=localDate(range.start); time=range.startTime; dueAt=localDateTimeISO(range.start); }
    }else{
      const inferBareTimeForToday=!dateExplicit || date===today;
      const clock=parseClock(text,baseDate,now,!inferBareTimeForToday);
      if(clock.time){ time=clock.time; remember(clock.matched); if(!date) date=today; if(clock.rollTomorrow) date=localDate(addDays(now,1)); dueAt=localDateTimeISO(new Date(`${date}T${time}:00`)); }
    }
  }

  if(repeatMinutes>0 && !repeatDaily && !repeatWindowStartAt && !dueAt){
    const target=new Date(now.getTime()+repeatMinutes*60000); date=localDate(target); time=`${String(target.getHours()).padStart(2,"0")}:${String(target.getMinutes()).padStart(2,"0")}`; dueAt=localDateTimeISO(target);
  }
  if(repeatDaily && /每天/.test(text)) remember("每天");
  const eventText=extractEventText(text,removeParts);
  return {text:eventText, rawText:original, plannedDate:date, plannedTime:time, dueAt, relativeMinutes, repeatMinutes, repeatLabel, repeatDaily, repeatStartTime, repeatEndTime, repeatEndNextDay, repeatWindowStartAt, repeatWindowEndAt, repeatWindowEnded};
}

function isTodayTask(t){
  if(t.status!=="active") return false;
  const today=localDate();
  if(t.repeatDaily) return true;
  if(t.repeatWindowStartAt && t.repeatWindowEndAt && !t.repeatWindowEnded){
    const start=new Date(t.repeatWindowStartAt), end=new Date(t.repeatWindowEndAt); return localDate(start)===today || localDate(end)===today;
  }
  if(t.plannedDate) return t.plannedDate===today;
  return t.bucket==="today";
}
function isLaterTask(t){
  if(t.status!=="active") return false;
  if(t.repeatDaily && Number(t.repeatMinutes)>0) return false;
  const today=localDate(); if(t.plannedDate) return t.plannedDate>today; return t.bucket==="later";
}
function staleTasks(){
  const today=localDate();
  return state.tasks.filter(t=>{ if(t.status!=="active" || t.repeatDaily) return false; if(t.repeatWindowStartAt && t.repeatWindowEndAt && !t.repeatWindowEnded) return new Date(t.repeatWindowEndAt)<new Date(); return t.plannedDate && t.plannedDate<today; });
}
function activeToday(){ return state.tasks.filter(isTodayTask); }
function activeLater(){ return state.tasks.filter(isLaterTask); }
function anchorsToday(){ return activeToday().filter(t=>t.anchor); }
function datedLater(){ return activeLater().filter(t=>t.plannedDate); }
function undatedLater(){ return activeLater().filter(t=>!t.plannedDate); }
function timeValue(t){ if(t.repeatDaily && t.plannedDate && t.plannedDate!==localDate()) return Infinity; if(!t.plannedTime) return Infinity; const [h,m]=t.plannedTime.split(":").map(Number); return h*60+m; }
function sortToday(list){ return [...list].sort((a,b)=>{ if(a.anchor!==b.anchor) return a.anchor?-1:1; return timeValue(a)-timeValue(b) || a.createdAt.localeCompare(b.createdAt); }); }
function sortDatedLater(list){ return [...list].sort((a,b)=>(a.plannedDate||"9999").localeCompare(b.plannedDate||"9999") || timeValue(a)-timeValue(b) || a.createdAt.localeCompare(b.createdAt)); }
function sortUndatedLater(list){ return [...list].sort((a,b)=>(Number(a.laterOrder)||0)-(Number(b.laterOrder)||0) || a.createdAt.localeCompare(b.createdAt)); }
function displayDate(iso){ if(!iso) return ""; const [y,m,d]=iso.split("-").map(Number); return `${m}月${d}日`; }
function hmFromISO(iso){ if(!iso) return ""; const d=new Date(iso); if(Number.isNaN(d.getTime())) return ""; return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function friendlyStamp(iso){ if(!iso) return ""; const d=new Date(iso); if(Number.isNaN(d.getTime())) return ""; const day=localDate(d); const prefix=day===localDate()?"今天":day===localDate(addDays(new Date(),-1))?"昨天":displayDate(day); return `${prefix} ${hmFromISO(iso)}`; }
function repeatCompletionsToday(t){ const today=localDate(); return state.events.filter(e=>e.task_id===t.id && e.action==="repeat_occurrence_completed" && e.event_time && localDate(new Date(e.event_time))===today).length; }
function completedToday(){ const today=localDate(); return state.tasks.filter(t=>t.status==="completed" && t.completedAt && localDate(new Date(t.completedAt))===today).sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt)); }
