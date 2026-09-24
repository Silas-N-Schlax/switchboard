import { ambientCuratedSwatches } from "../../../defaults.js";

const PAGE_SIZE = 20; // matches the 5x4 grid in swatch-picker.css

const pages = [];
for (let i = 0; i < ambientCuratedSwatches.length; i += PAGE_SIZE) {
  pages.push(ambientCuratedSwatches.slice(i, i + PAGE_SIZE));
}

let openPopover = null;

function closeOpenPopover() {
  openPopover?.classList.remove("swatch-picker__popover--open");
  openPopover = null;
}

document.addEventListener("click", (event) => {
  if (openPopover && !openPopover.parentElement.contains(event.target)) {
    closeOpenPopover();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeOpenPopover();
});

export function createSwatchPicker({ ariaLabel, value, onChange }) {
  let currentValue = value;
  let currentPage = 0;

  const wrapper = document.createElement("div");
  wrapper.className = "swatch-picker";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "swatch-picker__trigger";
  trigger.style.setProperty("--swatch-color", value);
  trigger.setAttribute("aria-label", ariaLabel);

  const popover = document.createElement("div");
  popover.className = "swatch-picker__popover surface";

  const options = [];
  const pageElements = pages.map((pageColors) => {
    const pageEl = document.createElement("div");
    pageEl.className = "swatch-picker__page";
    pageColors.forEach((hex) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "swatch-picker__option";
      option.style.setProperty("--swatch-color", hex);
      option.setAttribute("aria-label", hex);
      option.addEventListener("click", () => {
        applyValue(hex);
        onChange(hex);
        closeOpenPopover();
      });
      pageEl.appendChild(option);
      options.push(option);
    });
    popover.appendChild(pageEl);
    return pageEl;
  });

  let nav = null;
  let pageLabel = null;
  let prevBtn = null;
  let nextBtn = null;
  if (pages.length > 1) {
    nav = document.createElement("div");
    nav.className = "swatch-picker__nav";

    prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "swatch-picker__nav-btn";
    prevBtn.textContent = "‹";
    prevBtn.setAttribute("aria-label", "Previous colors");
    prevBtn.addEventListener("click", () => showPage(currentPage - 1));

    pageLabel = document.createElement("span");
    pageLabel.className = "swatch-picker__nav-label";

    nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "swatch-picker__nav-btn";
    nextBtn.textContent = "›";
    nextBtn.setAttribute("aria-label", "Next colors");
    nextBtn.addEventListener("click", () => showPage(currentPage + 1));

    nav.append(prevBtn, pageLabel, nextBtn);
    popover.appendChild(nav);
  }

  function showPage(index) {
    currentPage = Math.max(0, Math.min(pages.length - 1, index));
    pageElements.forEach((pageEl, i) => {
      pageEl.classList.toggle("swatch-picker__page--active", i === currentPage);
    });
    if (nav) {
      pageLabel.textContent = `${currentPage + 1} / ${pages.length}`;
      prevBtn.disabled = currentPage === 0;
      nextBtn.disabled = currentPage === pages.length - 1;
    }
  }
  showPage(0);

  trigger.addEventListener("click", () => {
    if (trigger.disabled) return;
    if (openPopover === popover) {
      closeOpenPopover();
      return;
    }
    closeOpenPopover();
    const containingPage = pages.findIndex((page) => page.includes(currentValue));
    showPage(containingPage === -1 ? 0 : containingPage);
    popover.classList.add("swatch-picker__popover--open");
    openPopover = popover;
  });

  wrapper.append(trigger, popover);

  function applyValue(hex) {
    currentValue = hex;
    trigger.style.setProperty("--swatch-color", hex);
    options.forEach((option) => {
      option.classList.toggle(
        "swatch-picker__option--selected",
        option.getAttribute("aria-label") === hex
      );
    });
  }

  return {
    element: wrapper,
    setValue: applyValue,
    setDisabled(disabled) {
      trigger.disabled = disabled;
      if (disabled) closeOpenPopover();
    },
  };
}
