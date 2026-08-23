(() => {
  if (!window.__TAURI__) return;

  const { window: tauriWindow, dpi } = window.__TAURI__;
  const appWindow = tauriWindow.getCurrentWindow();
  const VISIBLE_EDGE_PX = 10;
  const COLLAPSE_DELAY_MS = 650;
  let collapseTimer = null;
  let collapsed = false;
  let pinned = false;

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

  async function snapRight() {
    const g = await monitorGeometry();
    if (!g) return;
    const current = await appWindow.outerPosition();
    const x = g.left + g.width - g.outer.width;
    const maxY = g.top + g.height - g.outer.height;
    const y = Math.min(Math.max(current.y, g.top), Math.max(g.top, maxY));
    await appWindow.setPosition(new dpi.PhysicalPosition(x, y));
    collapsed = false;
  }

  async function collapseRight() {
    if (collapsed) return;
    const g = await monitorGeometry();
    if (!g) return;
    const current = await appWindow.outerPosition();
    const x = g.left + g.width - VISIBLE_EDGE_PX;
    await appWindow.setPosition(new dpi.PhysicalPosition(x, current.y));
    collapsed = true;
  }

  async function expandRight() {
    if (!collapsed) return;
    await snapRight();
  }

  function scheduleCollapse() {
    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(() => collapseRight().catch(console.error), COLLAPSE_DELAY_MS);
  }

  function cancelCollapse() {
    clearTimeout(collapseTimer);
    collapseTimer = null;
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

  window.addEventListener("mouseenter", () => {
    cancelCollapse();
    expandRight().catch(console.error);
  });
  document.documentElement.addEventListener("mouseleave", scheduleCollapse);
  window.addEventListener("focus", () => {
    cancelCollapse();
    expandRight().catch(console.error);
  });

  window.addEventListener("DOMContentLoaded", async () => {
    await waitForUi();
    const dragRegion = document.querySelector(".brand-block");
    if (dragRegion) dragRegion.setAttribute("data-tauri-drag-region", "");
    await snapRight();
  });
})();
