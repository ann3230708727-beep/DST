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

  function pinButton() {
    return document.querySelector('[data-shell-action="pin"]');
  }

  function enablePinButton() {
    const btn = pinButton();
    if (!btn) return null;
    btn.disabled = false;
    btn.removeAttribute("disabled");
    if (!btn.hasAttribute("aria-pressed")) btn.setAttribute("aria-pressed", "false");
    return btn;
  }

  function applyPinVisual(pinned) {
    const btn = enablePinButton();
    if (!btn) return;
    btn.classList.toggle("active", pinned);
    btn.title = pinned ? "取消置顶" : "置顶";
    btn.setAttribute("aria-label", btn.title);
    btn.setAttribute("aria-pressed", pinned ? "true" : "false");
  }

  async function refreshPinState() {
    enablePinButton();
    try {
      applyPinVisual(!!(await core.invoke("pinned_state")));
    } catch (error) {
      console.error("Could not read pinned state", error);
    }
  }

  // The Web UI is created asynchronously. Observe insertion and remove the
  // Web/PWA-only disabled state immediately, before any invoke is attempted.
  const pinObserver = new MutationObserver(() => {
    if (enablePinButton()) pinObserver.disconnect();
  });
  pinObserver.observe(document.documentElement, { childList: true, subtree: true });
  enablePinButton();

  document.addEventListener("click", async e => {
    const btn = e.target.closest?.('[data-shell-action="pin"]');
    if (!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (pinBusy) return;
    pinBusy = true;

    const previous = btn.getAttribute("aria-pressed") === "true";
    applyPinVisual(!previous);
    try {
      const pinned = await core.invoke("toggle_pinned");
      applyPinVisual(!!pinned);
    } catch (error) {
      applyPinVisual(previous);
      console.error("Could not toggle pinned state", error);
    } finally {
      pinBusy = false;
    }
  }, true);

  async function waitForPinButton() {
    for (let i = 0; i < 120; i++) {
      if (enablePinButton()) {
        await refreshPinState();
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  window.addEventListener("DOMContentLoaded", async () => {
    ensureEdgeHandle();
    await waitForPinButton();
    const dragRegion = document.querySelector(".brand-block");
    if (dragRegion) dragRegion.setAttribute("data-tauri-drag-region", "");

    try {
      await event.listen("windows-edge-state", ({ payload }) => {
        setCollapsedVisual(!!payload);
      });
      await event.listen("windows-pin-state", ({ payload }) => {
        applyPinVisual(!!payload);
      });
    } catch (error) {
      console.error("Could not listen for Windows shell state", error);
    }
  });
})();
