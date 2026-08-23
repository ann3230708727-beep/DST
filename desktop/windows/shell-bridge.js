(() => {
  if (!window.__TAURI__) return;

  const { window: tauriWindow, core } = window.__TAURI__;
  const appWindow = tauriWindow.getCurrentWindow();
  const EDGE_TRIGGER_PX = 24;
  const COLLAPSE_DELAY_MS = 650;
  const COLLAPSED_POLL_MS = 80;
  let collapseTimer = null;
  let collapsed = false;
  let animating = false;
  let pinBusy = false;

  function ensureEdgeHandle() {
    let handle = document.querySelector("#windowsEdgeHandle");
    if (handle) return handle;
    handle = document.createElement("div");
    handle.id = "windowsEdgeHandle";
    handle.setAttribute("aria-hidden", "true");
    Object.assign(handle.style, {
      position: "fixed",
      left: "2px",
      top: "50%",
      width: "8px",
      height: "72px",
      transform: "translateY(-50%)",
      borderRadius: "999px",
      background: "color-mix(in srgb, var(--accent, #7f9a88) 58%, transparent)",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "2147483647",
      transition: "opacity .14s ease"
    });
    document.body.appendChild(handle);
    return handle;
  }

  function setCollapsedVisual(value) {
    const handle = ensureEdgeHandle();
    handle.style.opacity = value ? "0.72" : "0";
    document.documentElement.dataset.windowsCollapsed = value ? "true" : "false";
  }

  async function animateEdge(nextCollapsed) {
    if (animating || collapsed === nextCollapsed) return;
    animating = true;
    if (nextCollapsed) setCollapsedVisual(true);
    try {
      await core.invoke("animate_edge", { collapsed: nextCollapsed });
      collapsed = nextCollapsed;
      if (!collapsed) setCollapsedVisual(false);
    } catch (error) {
      console.error("Windows edge animation failed", error);
      if (nextCollapsed) setCollapsedVisual(false);
    } finally {
      animating = false;
    }
  }

  function scheduleCollapse() {
    if (collapsed || animating || collapseTimer) return;
    collapseTimer = setTimeout(() => {
      collapseTimer = null;
      animateEdge(true).catch(console.error);
    }, COLLAPSE_DELAY_MS);
  }

  function cancelCollapse() {
    clearTimeout(collapseTimer);
    collapseTimer = null;
  }

  async function collapsedPointerTick() {
    if (!collapsed || animating) return;
    try {
      const [cursor, monitor, pos, size] = await Promise.all([
        tauriWindow.cursorPosition(),
        tauriWindow.currentMonitor(),
        appWindow.outerPosition(),
        appWindow.outerSize()
      ]);
      if (!cursor || !monitor || !pos || !size) return;
      const right = monitor.workArea.position.x + monitor.workArea.size.width;
      const withinY = cursor.y >= pos.y && cursor.y <= pos.y + size.height;
      const inTrigger = cursor.x >= right - EDGE_TRIGGER_PX && cursor.x <= right && withinY;
      if (inTrigger) {
        cancelCollapse();
        await animateEdge(false);
      }
    } catch (error) {
      console.error("Windows edge pointer watch failed", error);
    }
  }

  function applyPinVisual(btn, pinned) {
    btn.classList.toggle("active", pinned);
    btn.title = pinned ? "取消置顶" : "置顶";
    btn.setAttribute("aria-label", btn.title);
    btn.setAttribute("aria-pressed", pinned ? "true" : "false");
  }

  async function configurePinButton() {
    const btn = document.querySelector("#windowPinBtn");
    if (!btn) return false;
    if (btn.dataset.windowsShellBound === "true") return true;

    btn.dataset.windowsShellBound = "true";
    btn.disabled = false;
    btn.removeAttribute("disabled");

    try {
      const pinned = await core.invoke("always_on_top_state");
      applyPinVisual(btn, !!pinned);
    } catch (error) {
      console.error("Could not read always-on-top state", error);
      applyPinVisual(btn, false);
    }

    btn.addEventListener("click", async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (pinBusy) return;
      pinBusy = true;
      try {
        const pinned = await core.invoke("toggle_always_on_top");
        applyPinVisual(btn, !!pinned);
      } catch (error) {
        console.error("Could not toggle always-on-top", error);
      } finally {
        pinBusy = false;
      }
    }, true);
    return true;
  }

  async function waitForUi() {
    for (let i = 0; i < 80; i++) {
      if (await configurePinButton()) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  window.addEventListener("mouseenter", cancelCollapse);
  document.documentElement.addEventListener("mouseleave", scheduleCollapse);
  window.addEventListener("focus", cancelCollapse);

  window.addEventListener("DOMContentLoaded", async () => {
    ensureEdgeHandle();
    await waitForUi();
    const dragRegion = document.querySelector(".brand-block");
    if (dragRegion) dragRegion.setAttribute("data-tauri-drag-region", "");
    setInterval(() => collapsedPointerTick(), COLLAPSED_POLL_MS);
  });
})();
