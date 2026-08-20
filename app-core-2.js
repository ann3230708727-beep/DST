function chineseMinuteValue(raw,special){
  if(special==="半") return 30;
  if(special==="一刻") return 15;
  if(special==="三刻") return 45;
  if(raw==null || raw==="") return 0;
  const n=cnNumber(String(raw).replace(/\s+/g,""));
  return Number.isFinite(n)?n:NaN;
}

function resolveHour(hour,daypart,baseDate,now,dateExplicit,minute=0){
  let h=Number(hour);
  if(!Number.isFinite(h) || h<0 || h>23) return null;
  if(h>=13 || h===0) return h;
  if(daypart){
    if(/凌晨/.test(daypart)){ return h===12?0:h; }
    if(/早上|早晨|清晨|上午/.test(daypart)){ return h===12?0:h; }
    if(/中午/.test(daypart)){ if(h===12) return 12; return h<11?h+12:h; }
    if(/下午|晚上|今晚|傍晚|夜里|夜间/.test(daypart)){ if(h===12) return 12; return h<12?h+12:h; }
  }
  const dateIsToday=localDate(baseDate)===localDate(now);
  if(dateIsToday && !dateExplicit){
    const am=h===12?0:h;
    const pm=h===12?12:h+12;
    const nowMins=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
    if(am*60+minute>nowMins) return am;
    if(pm*60+minute>nowMins) return pm;
    return am;
  }
  return h===12?12:h;
}

function clockNumberSource(){
  return `(?:[0-9]{1,2}|[零〇一二两三四五六七八九十百](?:\\s*[零〇一二两三四五六七八九十百])*)`;
}
function clockExpressionSource(){
  const n=clockNumberSource();
  const colon=`(?:[01]?\\d|2[0-3])\\s*[:：]\\s*(?:[0-5]?\\d)`;
  const chinese=`(?:凌晨|早上|早晨|清晨|上午|中午|下午|晚上|今晚|傍晚|夜里|夜间)?\\s*${n}\\s*(?:点\\s*钟?|时)\\s*(?:(?:半|一\\s*刻|三\\s*刻)|${n}\\s*分?)?`;
  return `(?:${colon}|${chinese})`;
}

function parseClockParts(text){
  const source=String(text||"");
  let m=source.match(/([01]?\d|2[0-3])\s*[:：]\s*([0-5]?\d)/);
  if(m){
    return {matched:m[0], daypart:"", rawHour:Number(m[1]), minute:Number(m[2]), explicit24:Number(m[1])>12 || Number(m[1])===0, colon:true};
  }
  const n=clockNumberSource();
  const re=new RegExp(`(凌晨|早上|早晨|清晨|上午|中午|下午|晚上|今晚|傍晚|夜里|夜间)?\\s*`+`(${n})\\s*(?:点\\s*钟?|时)\\s*`+`(?:(半|一\\s*刻|三\\s*刻)|(${n})\\s*分?)?`);
  m=source.match(re);
  if(!m) return null;
  const rawHour=cnNumber(m[2]);
  let special=(m[3]||"").replace(/\s+/g,"");
  const minute=chineseMinuteValue(m[4],special);
  if(!Number.isFinite(rawHour) || rawHour<0 || rawHour>23 || !Number.isFinite(minute) || minute<0 || minute>59) return null;
  return {matched:m[0], daypart:m[1]||"", rawHour, minute, explicit24:rawHour>12 || rawHour===0, colon:false};
}

function clockCandidateHours(parts){
  if(!parts) return [];
  const h=Number(parts.rawHour), part=parts.daypart||"";
  if(parts.explicit24 || h>12 || h===0) return [h];
  if(part){
    if(/凌晨|早上|早晨|清晨|上午/.test(part)) return [h===12?0:h];
    if(/中午/.test(part)) return [h===12?12:(h<11?h+12:h)];
    if(/下午|晚上|今晚|傍晚|夜里|夜间/.test(part)) return [h===12?12:(h<12?h+12:h)];
  }
  if(h===12) return [0,12];
  return [h,h+12];
}

function parseClock(text,baseDate,now,dateExplicit){
  const result={time:null,matched:null,rollTomorrow:false};
  const parts=parseClockParts(text);
  if(!parts) return result;
  let hour=resolveHour(parts.rawHour,parts.daypart,baseDate,now,dateExplicit,parts.minute);
  if(hour==null) return result;
  if(!parts.daypart && !dateExplicit && localDate(baseDate)===localDate(now) && parts.rawHour>=1 && parts.rawHour<=12){
    const am=parts.rawHour===12?0:parts.rawHour;
    const pm=parts.rawHour===12?12:parts.rawHour+12;
    const nowMins=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
    if(am*60+parts.minute<=nowMins && pm*60+parts.minute<=nowMins){ hour=am; result.rollTomorrow=true; }
  }
  result.time=`${String(hour).padStart(2,"0")}:${String(parts.minute).padStart(2,"0")}`;
  result.matched=parts.matched;
  return result;
}

function inferClockRange(startParts,endParts,baseDate,now,{dateExplicit=false,daily=false}={}){
  if(!startParts || !endParts) return null;
  const starts=clockCandidateHours(startParts), ends=clockCandidateHours(endParts);
  if(!starts.length || !ends.length) return null;
  const day0=new Date(baseDate.getFullYear(),baseDate.getMonth(),baseDate.getDate(),0,0,0,0);
  const targetIsToday=localDate(day0)===localDate(now);
  const startOffsets=(!dateExplicit && !daily)?[0,1]:[0];
  const candidates=[];
  for(const sd of startOffsets){
    for(const sh of starts){
      const start=new Date(day0); start.setDate(start.getDate()+sd); start.setHours(sh,startParts.minute,0,0);
      for(const eh of ends){
        for(let ed=sd;ed<=sd+1;ed++){
          const end=new Date(day0); end.setDate(end.getDate()+ed); end.setHours(eh,endParts.minute,0,0);
          if(end<=start) continue;
          const duration=(end-start)/60000;
          if(duration>18*60) continue;
          let score=duration*2;
          if(targetIsToday && sd===0 && !daily){
            const nowMs=now.getTime();
            if(end.getTime()<nowMs) score+=100000; else if(start.getTime()>nowMs) score+=(start.getTime()-nowMs)/60000;
          }else{ score+=sd*1440 + sh*0.01; }
          if(!startParts.daypart && !startParts.explicit24 && sh>=12 && (daily || (endParts.explicit24 && Math.max(...ends)>=18))) score+=2000;
          if(startParts.daypart && !endParts.daypart){
            const inherited=clockCandidateHours({...endParts,daypart:startParts.daypart,explicit24:false});
            if(inherited.includes(eh) && duration<=12*60) score-=120000;
          }
          candidates.push({start,end,score,duration});
        }
      }
    }
  }
  if(!candidates.length) return null;
  candidates.sort((a,b)=>a.score-b.score || a.duration-b.duration || a.start-b.start);
  const best=candidates[0];
  const endNextDay=localDate(best.end)!==localDate(best.start);
  return {start:best.start,end:best.end,startTime:`${String(best.start.getHours()).padStart(2,"0")}:${String(best.start.getMinutes()).padStart(2,"0")}`,endTime:`${String(best.end.getHours()).padStart(2,"0")}:${String(best.end.getMinutes()).padStart(2,"0")}`,endNextDay};
}

function parseTimeRange(text,baseDate,now,{dateExplicit=false,daily=false}={}){
  const source=String(text||"");
  const expr=clockExpressionSource();
  const nowRe=new RegExp(`(?:从\\s*)?现在\\s*(?:开始\\s*)?(?:到|至|—|－|-|~|～)\\s*(${expr})`);
  const nowMatch=source.match(nowRe);
  if(nowMatch){
    const endParts=parseClockParts(nowMatch[1]);
    const startParts={rawHour:now.getHours(),minute:now.getMinutes(),daypart:"",explicit24:true,colon:true};
    const inferred=inferClockRange(startParts,endParts,baseDate,now,{dateExplicit,daily});
    if(inferred) return {...inferred,matched:nowMatch[0],daily:/每天/.test(nowMatch[0])};
  }
  const re=new RegExp(`(?:每天\\s*)?(?:从\\s*)?(${expr})\\s*(?:开始\\s*)?(?:到|至|—|－|-|~|～)\\s*(${expr})`);
  const m=source.match(re);
  if(!m) return null;
  const startParts=parseClockParts(m[1]), endParts=parseClockParts(m[2]);
  const inferred=inferClockRange(startParts,endParts,baseDate,now,{dateExplicit,daily});
  if(!inferred) return null;
  return {...inferred,matched:m[0],daily:/每天/.test(m[0])};
}

function cleanTaskText(text,removeParts){
  let out=text;
  const unique=[...new Set(removeParts.filter(Boolean))].map(x=>String(x).trim()).filter(Boolean).sort((a,b)=>b.length-a.length);
  const hasParsedDirective=unique.length>0;
  const stripDirectivePrefix=()=>{
    if(!hasParsedDirective) return;
    out=out.replace(/^\s*(?:接下来(?:的)?|从现在(?:开始|起)?|现在(?:开始|起))\s*/,"");
  };
  for(const p of unique) out=out.replace(p," ");
  stripDirectivePrefix();
  out=out.replace(/^\s*(?:(?:的)?时候|到时候|时|左右|前后|开始|结束)\s*/,"").replace(/^\s*的(?=\s|$)/," ");
  for(let i=0;i<5;i++){
    const before=out;
    out=out.replace(/^\s*(?:请|麻烦)\s*/,"").replace(/^\s*(?:帮我(?:记得)?|记得|别忘了|不要忘记)\s*/,"").replace(/^\s*(?:提醒我(?:一下)?|提醒(?:我)?(?:一下)?)\s*/,"").replace(/^\s*(?:我要|我想要)\s*/,"");
    stripDirectivePrefix();
    out=out.replace(/^\s*的(?=\s|$)/," ");
    if(out===before) break;
  }
  out=out.replace(/\s*(?:提醒我(?:一下)?|提醒(?:我)?(?:一下)?)\s*/g," ");
  stripDirectivePrefix();
  out=out.replace(/^\s*(?:(?:的)?时候|到时候|时|左右|前后|开始|结束)\s*/,"").replace(/^\s*(?:每天)?\s*(?:从)?\s*(?:到|至)?\s*/,"").replace(/^[,，。；;、：:\s]+|[,，。；;、：:\s]+$/g,"").replace(/\s+/g," ").trim();
  return out || text.trim();
}

function repeatText(minutes){ minutes=Number(minutes)||0; if(!minutes) return ""; if(minutes%60===0) return `每 ${minutes/60} 小时`; return `每 ${minutes} 分钟`; }
function timeToMinutes(hm){ if(!hm || !/^\d{2}:\d{2}$/.test(hm)) return NaN; const [h,m]=hm.split(":").map(Number); return h*60+m; }
function setDateMinutes(baseDate,mins){ const d=new Date(baseDate.getFullYear(),baseDate.getMonth(),baseDate.getDate(),0,0,0,0); d.setMinutes(mins); return d; }

function nextDailyWindowOccurrence(startTime,endTime,intervalMinutes,after=new Date(),endNextDay=false){
  const start=timeToMinutes(startTime), end=timeToMinutes(endTime), interval=Number(intervalMinutes)||0;
  if(!Number.isFinite(start) || !Number.isFinite(end) || interval<=0) return null;
  const baseToday=new Date(after.getFullYear(),after.getMonth(),after.getDate(),0,0,0,0);
  const candidates=[];
  for(const offset of [-1,0,1]){
    const day=addDays(baseToday,offset); const windowStart=setDateMinutes(day,start); let windowEnd=setDateMinutes(day,end);
    if(endNextDay || end<=start) windowEnd.setDate(windowEnd.getDate()+1);
    if(after<windowStart){ candidates.push(windowStart); continue; }
    if(after>=windowEnd) continue;
    const elapsed=(after-windowStart)/60000; const steps=Math.floor(elapsed/interval)+1;
    const candidate=new Date(windowStart.getTime()+steps*interval*60000); if(candidate<=windowEnd) candidates.push(candidate);
  }
  candidates.sort((a,b)=>a-b); return candidates[0] || null;
}

function nextOneTimeWindowOccurrence(startAt,endAt,intervalMinutes,after=new Date()){
  const start=new Date(startAt), end=new Date(endAt), interval=Number(intervalMinutes)||0;
  if(Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end<=start || interval<=0) return null;
  if(after<start) return start; if(after>=end) return null;
  const elapsed=(after-start)/60000; const steps=Math.floor(elapsed/interval)+1;
  const candidate=new Date(start.getTime()+steps*interval*60000); return candidate<=end?candidate:null;
}
function formatWindowTimes(startAt,endAt){
  const s=new Date(startAt), e=new Date(endAt); if(Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "";
  const sh=`${String(s.getHours()).padStart(2,"0")}:${String(s.getMinutes()).padStart(2,"0")}`; const endNext=localDate(e)!==localDate(s);
  if(endNext && e.getHours()===0 && e.getMinutes()===0) return `${sh}–24:00`;
  const eh=`${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`; return endNext?`${sh}–次日${eh}`:`${sh}–${eh}`;
}
function formatDailyWindow(t){
  if(!t.repeatStartTime || !t.repeatEndTime) return "";
  if(t.repeatEndNextDay){ if(t.repeatEndTime==="00:00") return `${t.repeatStartTime}–24:00`; return `${t.repeatStartTime}–次日${t.repeatEndTime}`; }
  return `${t.repeatStartTime}–${t.repeatEndTime}`;
}