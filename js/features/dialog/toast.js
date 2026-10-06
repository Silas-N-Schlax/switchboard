const TOAST_DURATION_MS = 2600;

let regionEl = null;

function region() {
  if (!regionEl?.isConnected) {
    regionEl = document.createElement("div");
    regionEl.className = "toast-region";
    regionEl.setAttribute("role", "status");
    regionEl.setAttribute("aria-live", "polite");
    document.body.appendChild(regionEl);
  }
  return regionEl;
}

export function showToast(message, { tone = "default" } = {}) {
  const toast = document.createElement("div");
  toast.className = `toast surface toast--${tone}`;
  toast.textContent = message;
  region().appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast--leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
    // Reduced motion disables the exit animation, so animationend never fires.
    setTimeout(() => toast.remove(), 400);
  }, TOAST_DURATION_MS);
}
