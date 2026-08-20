const RECENT_COMPLETED_DAYS=7;
function recentCompletedTasks(){
  const now=new Date();
  const cutoff=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  cutoff.setDate(cutoff.getDate()-(RECENT_COMPLETED_DAYS-1));
  return state.tasks.filter(t=>{
    if(t.status!=="completed" || !t.completedAt) return false;
    const d=new Date(t.completedAt);
    return !Number.isNaN(d.getTime()) && d.getTime()>=cutoff.getTime() && d.getTime()<=now.getTime();
  }).sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt));
}
function recentCompletedDayLabel(day){
  const today=localDate();
  const yesterday=localDate(addDays(new Date(),-1));
  if(day===today) return "今天";
  if(day===yesterday) return "昨天";
  const d=new Date(`${day}T00:00:00`);
  const wd=["周日","周一","周二","周三","周四","周五","周六"][d.getDay()];
  return `${displayDate(day)} · ${wd}`;
}
function completedEventStamp(iso){
  if(!iso) return "";
  const d=new Date(iso);
  if(Number.isNaN(d.getTime())) return "";
  const day=localDate(d),today=localDate(),yesterday=localDate(addDays(new Date(),-1));
  const label=day===today?"今天":day===yesterday?"昨天":displayDate(day);
  return `${label} ${hmFromISO(iso)}`;
}
function renderRecentCompleted(){
  const list=recentCompletedTasks();
  const entry=$("#recentCompletedEntry");
  if(entry) entry.classList.toggle("hidden",list.length===0);
  const box=$("#recentCompletedList");
  const sub=$("#recentCompletedSub");
  if(sub) sub.textContent=list.length?`最近 7 天共完成 ${list.length} 件普通任务；更早的历史仍保留在 CSV 中。`:"最近 7 天还没有完成记录；更早的历史仍保留在 CSV 中。";
  if(!box) return;
  if(!list.length){ box.innerHTML=`<div class="empty"><strong>最近 7 天还没有完成记录</strong><span>长期历史仍可通过 CSV 导出查看</span></div>`; return; }
  const groups=new Map();
  for(const t of list){ const day=localDate(new Date(t.completedAt)); if(!groups.has(day)) groups.set(day,[]); groups.get(day).push(t); }
  box.innerHTML=[...groups.entries()].map(([day,tasks])=>`
    <div class="recent-completed-group">
      <div class="recent-completed-label">${escapeHtml(recentCompletedDayLabel(day))}</div>
      ${tasks.map(t=>`<div class="recent-completed-row">
        <div class="completed-mark">✓</div><div><div class="recent-completed-title">${escapeHtml(t.text)}</div>
        <div class="recent-completed-meta">${escapeHtml(completedEventStamp(t.completedAt))} 完成${t.createdAt?` · ${escapeHtml(completedEventStamp(t.createdAt))} 添加`:""}</div></div>
      </div>`).join("")}
    </div>`).join("");
}
function taskMeta(t){
  const bits=[];
  if(Number(t.repeatMinutes)>0 && t.repeatDaily && t.repeatStartTime && t.repeatEndTime){
    const when=t.plannedDate===localDate()?`下次 ${t.plannedTime}`:`下次 ${displayDate(t.plannedDate)} ${t.plannedTime}`;
    if(t.plannedTime) bits.push(when); bits.push(`↻ ${formatDailyWindow(t)} / ${repeatText(t.repeatMinutes)}`);
    const count=repeatCompletionsToday(t); if(count) bits.push(`今日完成 ${count} 次`); return bits;
  }
  if(Number(t.repeatMinutes)>0 && t.repeatWindowStartAt && t.repeatWindowEndAt){
    if(t.plannedTime && !t.repeatWindowEnded){ const when=t.plannedDate===localDate()?`下次 ${t.plannedTime}`:`下次 ${displayDate(t.plannedDate)} ${t.plannedTime}`; bits.push(when); }
    bits.push(`↻ ${formatWindowTimes(t.repeatWindowStartAt,t.repeatWindowEndAt)} / ${repeatText(t.repeatMinutes)}`);
    if(t.repeatWindowEnded) bits.push("时段已结束"); const count=repeatCompletionsToday(t); if(count) bits.push(`今日完成 ${count} 次`); return bits;
  }
  if(t.plannedDate && t.plannedDate!==localDate()) bits.push(displayDate(t.plannedDate));
  if(t.plannedTime) bits.push(t.plannedTime);
  if(Number(t.repeatMinutes)>0){ bits.push(`↻ ${repeatText(t.repeatMinutes)}`); const count=repeatCompletionsToday(t); if(count) bits.push(`今日完成 ${count} 次`); }
  return bits;
}
function pinSvg(active=false){ return `<svg width="17" height="17" viewBox="0 0 24 24" fill="${active?'currentColor':'none'}" stroke="currentColor" stroke-width="1.65"><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z"/><path d="M12 14v7"/></svg>`; }
function taskRow(t, {showPin=false, editable=false,variant=""}={}){
  const meta=taskMeta(t);
  return `<div class="task ${variant}" data-id="${t.id}"><button class="check" data-complete="${t.id}" aria-label="完成"></button><div class="task-main ${editable?'editable':''}" ${editable?`data-edit="${t.id}" title="点击快速修改"`:""}><div class="task-title" title="${escapeHtml(t.text)}">${escapeHtml(t.text)}</div>${meta.length?`<div class="task-meta">${meta.map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>`:""}</div><div class="task-actions">${showPin?`<button class="pin ${t.anchor?'active':''}" data-pin="${t.id}" aria-label="${t.anchor?'取消今日锚点':'设为今日锚点'}" title="${t.anchor?'取消今日锚点':'设为今日锚点'}">${pinSvg(t.anchor)}</button>`:""}<button class="task-more" data-task-menu="${t.id}" aria-label="更多任务操作" title="更多"><svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="6" cy="12" r="1.45" fill="currentColor"/><circle cx="12" cy="12" r="1.45" fill="currentColor"/><circle cx="18" cy="12" r="1.45" fill="currentColor"/></svg></button></div></div>`;
}
function emptyHtml(tab){ return `<div class="empty"><strong>${tab==="today"?"今天没什么事":"这里还空着"}</strong></div>`; }
function minutesNow(){ const n=new Date(); return n.getHours()*60+n.getMinutes()+n.getSeconds()/60; }
function nextDue(){
  const now=Date.now();
  return activeToday().map(t=>{ const d=dueDateForTask(t); return d?{t,diff:(d.getTime()-now)/60000}:null; }).filter(Boolean).filter(x=>x.diff>=-15 && x.diff<=60).sort((a,b)=>{ const aNow=a.diff<=0,bNow=b.diff<=0; if(aNow!==bNow) return aNow?-1:1; return Math.abs(a.diff)-Math.abs(b.diff); })[0] || null;
}
function renderNext(){
  const x=nextDue(), box=$("#nextCard"); if(!x){ box.innerHTML=""; return; }
  const t=x.t,left=Math.ceil(x.diff),label=x.diff<=0?"现在":`${Math.max(1,left)} 分钟后`;
  box.innerHTML=`<div class="next-block"><div class="next-kicker">接下来</div><div class="next-line"><div class="next-title">${escapeHtml(t.text)}</div><div class="next-meta">${escapeHtml(t.plannedTime || "")} · ${label}</div></div></div>`;
}
function renderLater(){
  const dated=sortDatedLater(datedLater()),undated=sortUndatedLater(undatedLater());
  $("#organizeBtn").classList.toggle("hidden", dated.length+undated.length===0);
  if(!dated.length && !undated.length){ $("#laterList").innerHTML=emptyHtml("later"); return; }
  let html="";
  if(dated.length) html+=`<div class="group-label">有日期</div><div class="task-list">${dated.map(t=>taskRow(t,{showPin:false,editable:true})).join("")}</div>`;
  if(undated.length) html+=`<div class="group-label">没有日期</div><div class="task-list">${undated.map(t=>taskRow(t,{showPin:false,editable:true})).join("")}</div>`;
  $("#laterList").innerHTML=html;
}
let completedExpanded=false;
function renderCompleted(){
  const list=completedToday(),section=$("#completedSection"),box=$("#completedList"),toggle=$("#completedToggle"); if(!section||!box||!toggle) return;
  section.classList.toggle("hidden",list.length===0); $("#completedHeading").textContent=`已完成 ${list.length}`; toggle.classList.toggle("open",completedExpanded); toggle.setAttribute("aria-expanded",completedExpanded?"true":"false"); box.classList.toggle("hidden",!completedExpanded);
  box.innerHTML=list.map(t=>`<div class="completed-row"><div class="completed-mark">✓</div><div><div class="completed-title">${escapeHtml(t.text)}</div><div class="completed-meta">${escapeHtml(completedEventStamp(t.completedAt))} 完成${t.createdAt?` · ${escapeHtml(completedEventStamp(t.createdAt))} 添加`:""}</div></div><button class="btn" data-restore-completed="${t.id}">恢复</button></div>`).join("");
  $$('[data-restore-completed]').forEach(btn=>btn.onclick=()=>restoreCompleted(btn.dataset.restoreCompleted,"completed_list"));
}
function restoreCompleted(id,source="undo"){ const t=state.tasks.find(x=>x.id===id); if(!t||t.status!=="completed") return; t.status="active";t.completedAt=null;logEvent(t,"completion_undone",{detail:source});saveState();render();toast("已恢复为未完成"); }
function updateRecentRemovedBadge(){ const badge=$("#recentRemovedCount"); if(!badge)return; const count=recentRemovedTasks().length; badge.textContent=count; badge.classList.toggle("hidden",count===0); }
function renderManageVisibility(){
  const viewIds={main:"manageMainView",settings:"manageSettingsView",review:"manageReviewView",organize:"manageOrganizeView",recentRemoved:"manageRecentRemovedView",recentCompleted:"manageRecentCompletedView",clear:"manageClearView"};
  Object.values(viewIds).forEach(id=>$("#"+id).classList.add("hidden")); $("#"+(viewIds[manageMode]||viewIds.main)).classList.remove("hidden"); $("#manageBackBtn").classList.toggle("hidden",manageMode==="main");
  const titles={main:"管理",settings:"设置",review:"轻回顾",organize:"整理以后",recentRemoved:"最近移除",recentCompleted:"最近完成",clear:""}; $("#manageTitle").textContent=titles[manageMode]??"管理";
}
function renderWindowState(){
  $("#appFrame").classList.toggle("expanded",uiState.expanded); const btn=$("#expandBtn"); btn.setAttribute("aria-expanded",uiState.expanded?"true":"false"); btn.setAttribute("aria-label",uiState.expanded?"收回管理区":"展开管理区"); btn.title=uiState.expanded?"收回":"展开";
  btn.innerHTML=uiState.expanded?'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M10 5v14"/><path d="m17 9-3 3 3 3"/></svg>':'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M10 5v14"/><path d="m14 9 3 3-3 3"/></svg>';
}
function renderInputNotices(){ $("#parseNotice").classList.toggle("hidden",!lastParseIssueTaskId); const canNudge=notificationNudgeVisible&&"Notification" in window&&Notification.permission==="default"; $("#notifyNudge").classList.toggle("hidden",!canNudge); }
function render(){
  fmtDateLabel();lastUiDay=localDate();renderWindowState();renderManageVisibility();
  $$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===activeTab)); $("#todayView").classList.toggle("hidden",activeTab!=="today"); $("#laterView").classList.toggle("hidden",activeTab!=="later"); $("#taskInput").placeholder=activeTab==="today"?"今天还有什么？":"以后想做什么？";
  const today=sortToday(activeToday()),anchors=today.filter(t=>t.anchor),others=today.filter(t=>!t.anchor); $("#anchorSection").classList.toggle("hidden",anchors.length===0); $("#glanceAnchorList").innerHTML=anchors.map(t=>taskRow(t,{showPin:true,editable:true,variant:"glance-task"})).join(""); $("#todayList").innerHTML=others.length?others.map(t=>taskRow(t,{showPin:true,editable:true})).join(""):today.length?'<div class="empty compact"><strong>这里还空着</strong></div>':emptyHtml("today"); $("#todayHeading").textContent="其他";
  renderLater();renderNext();$("#glanceEmpty").classList.toggle("hidden",today.length>0||!!$("#nextCard").innerHTML);renderPrompts();renderCompleted();renderRecentCompleted();updateRecentRemovedBadge();renderInputNotices();
}
function renderPrompts(){ const stale=staleTasks(); $("#stalePrompt").classList.toggle("hidden",!stale.length); $("#stalePromptText").textContent=stale.length?`有 ${stale.length} 件之前留下的事，要重新安排吗？`:""; const unfinished=activeToday().filter(t=>!Number(t.repeatMinutes)); const evening=new Date().getHours()>=REVIEW_HOUR&&state.settings.eveningReview&&unfinished.length>0; $("#reviewPrompt").classList.toggle("hidden",!evening); $("#reviewPromptText").textContent=evening?`今天还有 ${unfinished.length} 件事，要收个尾吗？`:""; }