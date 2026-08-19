document.body.innerHTML=`
  <main class="app-frame" id="appFrame">
    <section class="glance-area" aria-label="常驻信息">
      <header class="topbar">
        <div class="brand-block">
          <div class="date" id="dateLabel"></div>
          <h1>做点儿啥</h1>
        </div>
        <div class="window-controls">
          <button class="icon-btn" id="windowPinBtn" type="button" disabled
            aria-label="置顶需要 Windows 桌面版支持" title="置顶需要 Windows 桌面版支持" data-shell-action="pin">
            <svg viewBox="0 0 24 24"><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z"/><path d="M12 14v7"/></svg>
          </button>
          <button class="icon-btn" id="expandBtn" type="button" aria-label="展开" title="展开" aria-expanded="false">
            <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M10 5v14"/><path d="m14 9 3 3-3 3"/></svg>
          </button>
          <button class="icon-btn" id="moreBtn" type="button" aria-label="更多" title="更多" aria-expanded="false">
            <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
          </button>
        </div>
        <div class="context-menu app-menu" id="appMenu" role="menu">
          <button type="button" data-app-mode="settings">设置</button>
          <button type="button" data-app-mode="recentRemoved">最近移除 <span class="count-badge hidden" id="recentRemovedCount">0</span></button>
          <button type="button" id="exportBtn">导出记录</button>
        </div>
      </header>

      <div id="nextCard"></div>
      <section class="section hidden" id="anchorSection">
        <div class="section-head"><div class="section-title">今日锚点</div></div>
        <div id="glanceAnchorList" class="task-list"></div>
      </section>
      <div class="glance-empty hidden" id="glanceEmpty">今天没什么事</div>

      <div class="composer">
        <div class="addwrap" id="addWrap">
          <input id="taskInput" autocomplete="off" placeholder="今天还有什么？" aria-label="添加事情" />
          <button class="addbtn" id="addBtn" type="button" aria-label="添加">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <div class="inline-notice error hidden" id="parseNotice">
          <span>时间没认出来</span>
          <button type="button" id="manualTimeBtn">手动设一下</button>
        </div>
        <div class="inline-notice hidden" id="notifyNudge">
          <span>提醒还没开启</span>
          <button type="button" id="inlineNotifyBtn">开启</button>
        </div>
      </div>
    </section>

    <aside class="manage-area" id="manageArea" aria-label="管理区域">
      <header class="manage-head">
        <div class="manage-head-left">
          <button class="icon-btn hidden" id="manageBackBtn" type="button" aria-label="返回">
            <svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg>
          </button>
          <div class="manage-title" id="manageTitle">管理</div>
        </div>
      </header>
      <div class="manage-scroll">
        <div id="manageMainView">
          <nav class="tabs" aria-label="任务范围">
            <button class="tab active" data-tab="today" type="button">今天</button>
            <button class="tab" data-tab="later" type="button">以后</button>
          </nav>
          <div id="todayView" class="manage-view">
            <div id="reviewPrompt" class="prompt hidden">
              <div class="prompt-text" id="reviewPromptText"></div>
              <button id="openReviewBtn" type="button">看一下</button>
            </div>
            <div id="stalePrompt" class="prompt hidden">
              <div class="prompt-text" id="stalePromptText"></div>
              <button id="openStaleBtn" type="button">重新安排</button>
            </div>
            <div class="section-head"><div class="section-title" id="todayHeading">其他</div></div>
            <div id="todayList" class="task-list"></div>
            <div id="completedSection" class="completed-section hidden">
              <button id="completedToggle" class="history-row completed-toggle" type="button" aria-expanded="false">
                <span id="completedHeading" class="history-row-label">已完成 0</span>
                <span class="history-row-icon history-row-icon--expand" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </button>
              <div id="completedList" class="completed-list hidden"></div>
            </div>
            <div id="recentCompletedEntry" class="recent-completed-entry hidden">
              <button id="recentCompletedBtn" class="history-row recent-completed-btn" type="button">
                <span class="history-row-label">查看最近完成</span>
                <span class="history-row-icon history-row-icon--next" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
                </span>
              </button>
            </div>
          </div>
          <div id="laterView" class="manage-view hidden">
            <div class="section-head">
              <div class="section-title">以后</div>
              <button class="small-action hidden" id="organizeBtn" type="button">整理</button>
            </div>
            <div id="laterList"></div>
          </div>
        </div>

        <div id="manageSettingsView" class="manage-view hidden">
          <section class="settings-group">
            <div class="settings-group-title">提醒</div>
            <div class="setting-row">
              <div><div class="setting-title">浏览器提醒</div><div class="setting-desc" id="notifyStatus">未开启</div></div>
              <button class="btn" id="notifyBtn" type="button">开启</button>
            </div>
            <div class="setting-row">
              <div class="setting-title">提前提醒</div>
              <select id="leadSelect" aria-label="提前提醒">
                <option value="5">5 分钟</option><option value="10">10 分钟</option>
                <option value="15">15 分钟</option><option value="30">30 分钟</option>
              </select>
            </div>
            <div class="setting-row"><div class="setting-title">提示音</div><button class="btn" id="testSoundBtn" type="button">测试</button></div>
            <div class="setting-row"><div class="setting-title">晚间轻回顾 · 21:00</div><input type="checkbox" class="switch" id="reviewToggle" aria-label="晚间轻回顾" /></div>
          </section>
          <section class="settings-group">
            <div class="settings-group-title">外观</div>
            <div class="setting-row">
              <div class="setting-title">主题</div>
              <select id="themeSelect" aria-label="主题">
                <option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option>
              </select>
            </div>
          </section>
          <section class="settings-group">
            <div class="settings-group-title">数据</div>
            <div class="setting-row">
              <div><div class="setting-title">清空本地数据</div><div class="setting-desc">这个设备里的待办和行为记录都会删除</div></div>
              <button class="btn danger" id="clearBtn" type="button">清空</button>
            </div>
          </section>
        </div>

        <div id="manageReviewView" class="manage-view hidden">
          <div class="section-title" id="reviewTitle">今天要收个尾吗？</div>
          <div class="setting-desc" style="margin:5px 0 12px">剩下的事情由你重新决定，不会被标成逾期</div>
          <div id="reviewList"></div>
        </div>
        <div id="manageOrganizeView" class="manage-view hidden">
          <div class="setting-desc" style="margin-bottom:10px">有日期的事项自动排序；没有日期的事项可以调整顺序</div>
          <div id="organizeList"></div>
        </div>
        <div id="manageRecentRemovedView" class="manage-view hidden">
          <div class="setting-desc" style="margin-bottom:10px">“算了”的事情保留 48 小时，恢复后回到原来的位置</div>
          <div id="recentRemovedList"></div>
        </div>
        <div id="manageRecentCompletedView" class="manage-view hidden">
          <div class="setting-desc" id="recentCompletedSub" style="margin-bottom:10px"></div>
          <div id="recentCompletedList"></div>
        </div>
        <div id="manageClearView" class="manage-view hidden">
          <div class="confirm-block">
            <div class="confirm-title">清空本地数据？</div>
            <div class="confirm-copy">这个设备里的待办和行为记录都会删除。</div>
            <div class="sheet-actions">
              <button class="btn" id="cancelClearBtn" type="button">取消</button>
              <button class="btn danger" id="confirmClearBtn" type="button">确认清空</button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </main>

  <div class="sheet-backdrop" id="planSheet">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="planSheetTitle">
      <div class="sheet-head">
        <h2 id="planSheetTitle">编辑一下</h2>
        <button class="icon-btn" type="button" data-close="planSheet" aria-label="关闭">
          <svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <input class="text-input editor-main-input" id="planTextInput" type="text" autocomplete="off" aria-label="任务内容" />
      <div class="editor-grid">
        <div><div class="field-label">日期</div><input class="date-input" id="planDateInput" type="date" /></div>
        <div><div class="field-label">时间</div><input class="time-input" id="planTimeInput" type="time" /></div>
      </div>
      <div class="field-label">循环</div>
      <select id="repeatSelect" style="width:100%">
        <option value="0">不循环</option><option value="15">每 15 分钟</option>
        <option value="20">每 20 分钟</option><option value="30">每 30 分钟</option>
        <option value="60">每 1 小时</option><option value="120">每 2 小时</option><option value="custom">自定义</option>
      </select>
      <div id="repeatCustom" class="repeat-custom hidden">
        <input id="repeatCustomValue" class="number-input" type="number" min="1" max="1440" value="45" />
        <select id="repeatCustomUnit"><option value="minute">分钟</option><option value="hour">小时</option></select>
      </div>
      <label class="repeat-window-toggle"><input type="checkbox" id="repeatDailyToggle" /><span>限定每天提醒时段</span></label>
      <div id="repeatWindowFields" class="repeat-window-fields hidden">
        <div><div class="field-label" style="margin-top:0">每天开始</div><input class="time-input" id="repeatStartTimeInput" type="time" /></div>
        <div><div class="field-label" style="margin-top:0">每天结束</div><input class="time-input" id="repeatEndTimeInput" type="time" /></div>
      </div>
      <div class="repeat-note">循环任务勾选后只记录这一轮完成；结束时间早于开始时间时按次日结束</div>
      <div id="planAuditMeta" class="audit-meta"></div>
      <div class="editor-actions">
        <button class="btn danger" id="planAbandonBtn" type="button">算了</button>
        <div class="editor-actions-right"><button class="btn primary" id="savePlanBtn" type="button">保存</button></div>
      </div>
    </div>
  </div>
  <div class="context-menu" id="taskMenu" role="menu">
    <button type="button" id="taskMenuEdit">编辑</button>
    <button type="button" class="danger" id="taskMenuAbandon">算了</button>
  </div>
  <div class="toast" id="toast"><span id="toastText"></span><button class="toast-action hidden" id="toastAction"></button></div>
`;
// V1.1 Windows shell boundary: data-shell-action="pin" is reserved for the
// desktop container. Screen-edge snap, off-screen collapse and window position
// recovery are intentionally not simulated inside the Web/PWA page.
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const KEY = "doSomethingV2";
const LEGACY_KEY = "anchorTodoMvpV1";
const UI_KEY = "doSomethingUiV11";
const REVIEW_HOUR = 21;

let state = loadState();
let uiState = loadUiState();
let activeTab = uiState.activeTab;
let manageMode = "main";
let lastUiDay = localDate();
let currentPlanTaskId = null;
let currentPlanOrigin = "later";
let audioCtx = null;
let lastParseIssueTaskId = null;
let notificationNudgeVisible = false;
let taskMenuTaskId = null;

function loadUiState(){
  try{
    const raw=JSON.parse(localStorage.getItem(UI_KEY)||"null");
    return {
      expanded:!!raw?.expanded,
      activeTab:raw?.activeTab==="later"?"later":"today",
      theme:["system","light","dark"].includes(raw?.theme)?raw.theme:"system"
    };
  }catch(e){
    return {expanded:false,activeTab:"today",theme:"system"};
  }
}
function saveUiState(){ localStorage.setItem(UI_KEY,JSON.stringify(uiState)); }

function defaultState(){
  return {
    version: 2.7,
    tasks: [],
    events: [],
    settings: { leadMinutes: 10, eveningReview: true },
    meta: { reviewNotifiedDate: "" }
  };
}

function migrate(raw){
  const base = defaultState();
  if(!raw) return base;
  base.tasks = Array.isArray(raw.tasks) ? raw.tasks.map((t,i)=>({
    id:t.id || uid(),
    text:t.text || "",
    createdAt:t.createdAt || nowISO(),
    plannedDate:t.plannedDate || null,
    plannedTime:t.plannedTime || null,
    anchor:!!t.anchor,
    status:t.status || "active",
    bucket:t.bucket || "today",
    completedAt:t.completedAt || null,
    carryCount:t.carryCount || 0,
    leadSent:!!t.leadSent,
    dueSent:!!t.dueSent,
    laterOrder:Number.isFinite(t.laterOrder) ? t.laterOrder : i + 1,
    removedAt:t.removedAt || null,
    removedSnapshot:t.removedSnapshot || null,
    rawText:t.rawText || t.text || "",
    dueAt:t.dueAt || null,
    repeatMinutes:Number(t.repeatMinutes)||0,
    repeatLabel:t.repeatLabel || "",
    repeatDaily:!!t.repeatDaily,
    repeatStartTime:t.repeatStartTime || null,
    repeatEndTime:t.repeatEndTime || null,
    repeatEndNextDay:!!t.repeatEndNextDay,
    repeatWindowStartAt:t.repeatWindowStartAt || null,
    repeatWindowEndAt:t.repeatWindowEndAt || null,
    repeatWindowEnded:!!t.repeatWindowEnded,
    lastRepeatReminderAt:t.lastRepeatReminderAt || null
  })) : [];
  base.events = Array.isArray(raw.events) ? raw.events : [];
  base.settings = Object.assign(base.settings, raw.settings || {});
  base.meta = Object.assign(base.meta, raw.meta || {});
  return base;
}

function loadState(){
  try{
    const v2 = localStorage.getItem(KEY);
    if(v2) return migrate(JSON.parse(v2));
    const legacy = localStorage.getItem(LEGACY_KEY);
    if(legacy){
      const migrated = migrate(JSON.parse(legacy));
      localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
  }catch(e){}
  return defaultState();
}

function saveState(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function uid(){ return Math.random().toString(36).slice(2,10)+Date.now().toString(36); }
function nowISO(){ return new Date().toISOString(); }

function localDate(d=new Date()){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function addDays(date,n){
  const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  d.setDate(d.getDate()+n);
  return d;
}
function nextLaterOrder(){
  const values=state.tasks.map(t=>Number(t.laterOrder)||0);
  return (values.length ? Math.max(...values) : 0) + 1;
}

function logEvent(task, action, extra={}){
  state.events.push({
    event_time: nowISO(),
    task_id: task?.id || "",
    task_text: task?.text || "",
    action,
    planned_date: task?.plannedDate || "",
    planned_time: task?.plannedTime || "",
    repeat_minutes: task?.repeatMinutes || 0,
    repeat_daily: task?.repeatDaily ? "yes":"no",
    repeat_start_time: task?.repeatStartTime || "",
    repeat_end_time: task?.repeatEndTime || "",
    created_at: task?.createdAt || "",
    completed_at: task?.completedAt || "",
    anchor: task?.anchor ? "yes":"no",
    bucket: task?.bucket || "",
    carry_count: task?.carryCount || 0,
    detail: extra.detail || "",
    ...extra
  });
}

function fmtDateLabel(){
  const d=new Date();
  const wd=["星期日","星期一","星期二","星期三","星期四","星期五","星期六"][d.getDay()];
  $("#dateLabel").textContent=`${d.getMonth()+1}月${d.getDate()}日 · ${wd}`;
}

function cnNumber(raw){
  if(raw==null || raw==="") return NaN;
  raw=String(raw).replace(/\s+/g,"");
  if(/^\d+$/.test(raw)) return Number(raw);
  const map={"零":0,"〇":0,"一":1,"二":2,"两":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9};
  if(raw==="十") return 10;
  if(raw.includes("百")){
    const [a,b=""]=raw.split("百");
    return (map[a] ?? 1)*100 + (b ? cnNumber(b) : 0);
  }
  if(raw.includes("十")){
    const [a,b=""]=raw.split("十");
    return (a ? (map[a] ?? 0) : 1)*10 + (b ? (map[b] ?? 0) : 0);
  }
  if(raw.length===1 && raw in map) return map[raw];
  let n=0;
  for(const ch of raw){
    if(!(ch in map)) return NaN;
    n=n*10+map[ch];
  }
  return n;
}

function localDateTimeISO(d){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  const h=String(d.getHours()).padStart(2,"0"),min=String(d.getMinutes()).padStart(2,"0"),sec=String(d.getSeconds()).padStart(2,"0");
  return `${y}-${m}-${day}T${h}:${min}:${sec}`;
}

function dueDateForTask(t){
  if(t.dueAt){
    const d=new Date(t.dueAt);
    if(!Number.isNaN(d.getTime())) return d;
  }
  if(t.plannedDate && t.plannedTime){
    const d=new Date(`${t.plannedDate}T${t.plannedTime}:00`);
    if(!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function syncDueAt(t){
  if(!t.plannedDate || !t.plannedTime){
    t.dueAt=null;
    return;
  }
  t.dueAt=localDateTimeISO(new Date(`${t.plannedDate}T${t.plannedTime}:00`));
}

function resetReminderFlags(t){
  t.dueSent=false;
  if(Number(t.repeatMinutes)>0){
    t.leadSent=true;
    return;
  }
  const d=dueDateForTask(t);
  if(!d){ t.leadSent=false; return; }
  const diff=(d.getTime()-Date.now())/60000;
  const lead=Number(state.settings.leadMinutes)||10;
  t.leadSent=diff>0 && diff<=lead;
}
