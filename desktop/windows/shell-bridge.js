(() => {
  if (!window.__TAURI__) return;

  const { core, event } = window.__TAURI__;
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
      const pinned = await core.invoke("pinned_state");
      applyPinVisual(btn, !!pinned);
    } catch (error) {
      console.error("Could not read pinned state", error);
      applyPinVisual(btn, false);
    }

    btn.addEventListener("click", async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (pinBusy) return;
      pinBusy = true;
      try {
        const pinned = await core.invoke("toggle_pinned");
        applyPinVisual(btn, !!pinned);
      } catch (error) {
        console.error("Could not toggle pinned state", error);
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

  window.addEventListener("DOMContentLoaded", async () => {
    ensureEdgeHandle();
    await waitForUi();
    const dragRegion = document.querySelector(".brand-block");
    if (dragRegion) dragRegion.setAttribute("data-tauri-drag-region", "");

    try {
      await event.listen("windows-edge-state", ({ payload }) => {
        setCollapsedVisual(!!payload);
      });
    } catch (error) {
      console.error("Could not listen for Windows edge state", error);
    }
  });
})();
