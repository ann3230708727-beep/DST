function looksLikeTimeIntent(raw){
  return /(?:半\s*个?\s*小时|[0-9零〇一二两三四五六七八九十百]+\s*(?:点|时|分钟|小时)|[0-9]{1,2}\s*[:：]\s*[0-9]{1,2})/.test(String(raw||""));
}
function flashComposer(){ const wrap=$("#addWrap"); wrap.classList.remove("success"); requestAnimationFrame(()=>{wrap.classList.add("success");setTimeout(()=>wrap.classList.remove("success"),320);}); }
function addTask(){
  const raw=$("#taskInput").value.trim(); if(!raw) return; unlockAudio(); const parsed=parseInput(raw); const explicitDate=!!parsed.plannedDate;
  let bucket=explicitDate?(parsed.plannedDate===localDate()?"today":"later"):activeTab; if(parsed.repeatDaily||parsed.repeatWindowStartAt) bucket="today";
  const task={id:uid(),text:parsed.text,rawText:parsed.rawText,createdAt:nowISO(),plannedDate:parsed.plannedDate,plannedTime:parsed.plannedTime,anchor:false,status:"active",bucket,completedAt:null,carryCount:0,leadSent:false,dueSent:false,laterOrder:bucket==="later"?nextLaterOrder():0,removedAt:null,removedSnapshot:null,dueAt:parsed.dueAt||null,repeatMinutes:parsed.repeatMinutes||0,repeatLabel:parsed.repeatLabel||"",repeatDaily:!!parsed.repeatDaily,repeatStartTime:parsed.repeatStartTime||null,repeatEndTime:parsed.repeatEndTime||null,repeatEndNextDay:!!parsed.repeatEndNextDay,repeatWindowStartAt:parsed.repeatWindowStartAt||null,repeatWindowEndAt:parsed.repeatWindowEndAt||null,repeatWindowEnded:!!parsed.repeatWindowEnded,lastRepeatReminderAt:null};
  resetReminderFlags(task);state.tasks.push(task);logEvent(task,"created",{detail:parsed.repeatMinutes?"repeat_recognized":parsed.plannedTime?"time_recognized":parsed.plannedDate?"date_recognized":"plain"});saveState();$("#taskInput").value="";
  const parseIssue=looksLikeTimeIntent(raw)&&!parsed.plannedTime&&!parsed.relativeMinutes&&!parsed.repeatMinutes;lastParseIssueTaskId=parseIssue?task.id:null;
  if(!parseIssue&&(parsed.plannedTime||parsed.repeatMinutes)&&"Notification" in window&&Notification.permission==="default") notificationNudgeVisible=true;
  render();if(!parseIssue)flashComposer();
}
function advanceRepeatToFuture(t,fromDate=null){
  const minutes=Number(t.repeatMinutes)||0;if(!minutes)return;let next=null;const base=fromDate||dueDateForTask(t)||new Date();const after=new Date(Math.max(base.getTime(),Date.now()));
  if(t.repeatDaily&&t.repeatStartTime&&t.repeatEndTime) next=nextDailyWindowOccurrence(t.repeatStartTime,t.repeatEndTime,minutes,after,!!t.repeatEndNextDay);
  else if(t.repeatWindowStartAt&&t.repeatWindowEndAt){next=nextOneTimeWindowOccurrence(t.repeatWindowStartAt,t.repeatWindowEndAt,minutes,after);if(!next){t.repeatWindowEnded=true;t.dueAt=null;t.plannedTime=null;t.plannedDate=localDate(new Date(t.repeatWindowStartAt));t.bucket="today";t.dueSent=false;t.leadSent=true;logEvent(t,"repeat_window_ended");return;}}
  else{const interval=minutes*60000,now=Date.now();next=new Date(base.getTime()+interval);if(next.getTime()<=now){const jumps=Math.floor((now-next.getTime())/interval)+1;next=new Date(next.getTime()+jumps*interval);}}
  if(!next)return;t.repeatWindowEnded=false;t.dueAt=localDateTimeISO(next);t.plannedDate=localDate(next);t.plannedTime=`${String(next.getHours()).padStart(2,"0")}:${String(next.getMinutes()).padStart(2,"0")}`;t.bucket=(t.repeatDaily||t.repeatWindowStartAt)?"today":(t.plannedDate===localDate()?"today":"later");t.dueSent=false;t.leadSent=true;
}
function completeTask(id){
  unlockAudio();const t=state.tasks.find(x=>x.id===id);if(!t)return;
  if(Number(t.repeatMinutes)>0&&!(t.repeatWindowStartAt&&t.repeatWindowEnded)){logEvent(t,"repeat_occurrence_completed");const due=dueDateForTask(t);if(!due||due.getTime()<=Date.now())advanceRepeatToFuture(t,due||new Date());saveState();const row=document.querySelector(`.task[data-id="${id}"]`);if(row){const c=row.querySelector(".check");c.classList.add("done");c.textContent="✓";setTimeout(()=>render(),320);}toast(t.dueAt?`已记下 · 下次 ${t.plannedTime}`:"已记下 · 本次时段已结束");return;}
  const row=document.querySelector(`.task[data-id="${id}"]`);if(row){row.classList.add("completed");const c=row.querySelector(".check");c.classList.add("done");c.textContent="✓";}const before=taskSnapshot(t);t.status="completed";t.completedAt=nowISO();logEvent(t,"completed");saveState();toast("已完成","撤销",()=>{restoreSnapshot(t,before);logEvent(t,"completion_undone",{detail:"toast"});saveState();render();});setTimeout(render,480);
}
function toggleAnchor(id){const t=state.tasks.find(x=>x.id===id);if(!t||!isTodayTask(t))return;if(!t.anchor&&anchorsToday().length>=3){toast("锚点已经有三个");return;}t.anchor=!t.anchor;logEvent(t,t.anchor?"anchor_on":"anchor_off");saveState();render();}
function showSheet(id){$("#"+id).classList.add("show");}
function hideSheet(id){$("#"+id).classList.remove("show");}
