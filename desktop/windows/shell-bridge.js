(() => {
  if (!window.__TAURI__) return;

  const { window: tauriWindow, dpi } = window.__TAURI__;
  const appWindow = tauriWindow.getCurrentWindow();
  const VISIBLE_EDGE_PX = 16;
  const EDGE_TRIGGER_PX = 24;
  const COLLAPSE_DELAY_MS = 650;
  const POINTER_POLL_MS = 120;
  let collapseTimer = null;
  let collapsed = false;
  let pinned = false;
  let geometryBusy = false;

  async function monitorGeometry() {
    const monitor = await tauriWindow.currentMonitor();
    if (!monitor) return null;
    const outer = await appWindow.outerSize();
    return {
      outer,
      left: monitor.workArea.position.x,
      top: monitor.workArea.position.y,
      width: monitor.workArea.size.width,
      height: monitor.workArea.size.height
    };
  }

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
      transition: "opacity .16s ease"
    });
    document.body.appendChild(handle);
    return handle;
  }

  function setCollapsedVisual(value) {
    const handle = ensureEdgeHandle();
    handle.style.opacity = value ? "0.78" : "0";
    document.documentElement.dataset.windowsCollapsed = value ? "true" : "false";
  }

  async function snapRight() {
    const g = await monitorGeometry();
    if (!g) return;
    const current = await appWindow.outerPosition();
    const x = g.left + g.width - g.outer.width;
    const maxY = g.top + g.height - g.outer.height;
    const y = Math.min(Math.max(current.y, g.top), Math.max(g.top, maxY));
    await appWindow.setPosition(new dpi.PhysicalPosition(x, y));
    collapsed = false;
    setCollapsedVisual(false);
  }

  async function collapseRight() {
    if (collapsed) return;
    const g = await monitorGeometry();
    if (!g) return;
    const current = await appWindow.outerPosition();
    const x = g.left + g.width - VISIBLE_EDGE_PX;
    await appWindow.setPosition(new dpi.PhysicalPosition(x, current.y));
    collapsed = true;
    setCollapsedVisual(true);
  }

  async function expandRight() {
    if (!collapsed) return;
    await snapRight();
  }

  function scheduleCollapse() {
    if (collapsed || collapseTimer) return;
    collapseTimer = setTimeout(() => {
      collapseTimer = null;
      collapseRight().catch(console.error);
    }, COLLAPSE_DELAY_MS);
  }

  function cancelCollapse() {
    clearTimeout(collapseTimer);
    collapseTimer = null;
  }

  async function pointerTick() {
    if (geometryBusy) return;
    geometryBusy = true;
    try {
      const [cursor, g, pos] = await Promise.all([
        tauriWindow.cursorPosition(),
        monitorGeometry(),
        appWindow.outerPosition()
      ]);
      if (!cursor || !g || !pos) return;

      const right = g.left + g.width;
      const withinWindowY = cursor.y >= pos.y && cursor.y <= pos.y + g.outer.height;

      if (collapsed) {
        const inRightEdgeTrigger = cursor.x >= right - EDGE_TRIGGER_PX && cursor.x <= right && withinWindowY;
        if (inRightEdgeTrigger) {
          cancelCollapse();
          await expandRight();
        }
        return;
      }

      const withinWindowX = cursor.x >= pos.x && cursor.x <= pos.x + g.outer.width;
      if (withinWindowX && withinWindowY) cancelCollapse();
      else scheduleCollapse();
    } catch (error) {
      console.error("Windows edge pointer watch failed", error);
    } finally {
      geometryBusy = false;
    }
  }

  async function configurePinButton() {
    const btn = document.querySelector("#windowPinBtn");
    if (!btn) return false;
    btn.disabled = false;
    btn.title = "置顶";
    btn.setAttribute("aria-label", "置顶");
    pinned = await appWindow.isAlwaysOnTop();
    btn.classList.toggle("active", pinned);
    btn.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();
      pinned = !pinned;
      await appWindow.setAlwaysOnTop(pinned);
      btn.classList.toggle("active", pinned);
      btn.title = pinned ? "取消置顶" : "置顶";
      btn.setAttribute("aria-label", btn.title);
    });
    return true;
  }

  async function waitForUi() {
    for (let i = 0; i < 80; i++) {
      if (await configurePinButton()) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  window.addEventListener("focus", () => {
    cancelCollapse();
    expandRight().catch(console.error);
  });

  window.addEventListener("DOMContentLoaded", async () => {
    ensureEdgeHandle();
    await waitForUi();
    const dragRegion = document.querySelector(".brand-block");
    if (dragRegion) dragRegion.setAttribute("data-tauri-drag-region", "");
    await snapRight();
    setInterval(() => pointerTick(), POINTER_POLL_MS);
  });
})();
