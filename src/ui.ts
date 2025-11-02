const STORAGE_KEY = "obr:trail:color";
const DEFAULT_COLOR = "#FF3B3B";

let currentColor = readStoredColor();

function readStoredColor(): string {
  const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (!stored || !/^#([0-9a-fA-F]{6})$/.test(stored)) {
    return DEFAULT_COLOR;
  }
  return stored.toUpperCase();
}

function persistColor(hex: string) {
  currentColor = hex.toUpperCase();
  localStorage.setItem(STORAGE_KEY, currentColor);
}

export function getTrailColor(): string {
  return currentColor;
}

export function setTrailColor(hex: string) {
  if (!/^#([0-9a-fA-F]{6})$/.test(hex)) return;
  persistColor(hex);
  const input = document.querySelector<HTMLInputElement>("#obr-trail-color-input");
  if (input && input.value.toUpperCase() !== currentColor) {
    input.value = currentColor;
  }
  updateActivePreset(currentColor);
}

export function mountColorPicker(root: HTMLElement = document.body) {
  const wrapper = document.createElement("div");
  wrapper.className = "obr-trail-picker";
  wrapper.innerHTML = `
    <div class="obr-trail-card">
      <header>
        <strong>Trail color</strong>
        <small>${currentColor}</small>
      </header>
      <div class="presets" role="group" aria-label="Trail color presets">
        ${getPresetColors()
          .map(
            (color) => `
              <button
                type="button"
                class="${color === currentColor ? "is-active" : ""}"
                style="background:${color}"
                data-color="${color}"
                aria-label="Use ${color}"
              ></button>
            `.trim()
          )
          .join("")}
      </div>
      <input id="obr-trail-color-input" type="color" value="${currentColor}" aria-label="Custom trail color" />
    </div>
  `;

  root.appendChild(wrapper);

  const headerIndicator = wrapper.querySelector("small");
  const presets = wrapper.querySelector(".presets");
  const input = wrapper.querySelector<HTMLInputElement>("#obr-trail-color-input");

  presets?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const color = target.getAttribute("data-color");
    if (!color) return;
    setTrailColor(color);
    if (input) input.value = currentColor;
    if (headerIndicator) headerIndicator.textContent = currentColor;
  });

  input?.addEventListener("input", () => {
    const value = input.value.toUpperCase();
    setTrailColor(value);
    if (headerIndicator) headerIndicator.textContent = currentColor;
  });
}

function updateActivePreset(selected: string) {
  document.querySelectorAll<HTMLButtonElement>(".obr-trail-picker .presets button").forEach((button) => {
    const color = button.getAttribute("data-color");
    if (color?.toUpperCase() === selected) {
      button.classList.add("is-active");
    } else {
      button.classList.remove("is-active");
    }
  });
  const indicator = document.querySelector(".obr-trail-picker header small");
  if (indicator) indicator.textContent = selected;
}

function getPresetColors(): string[] {
  return ["#FF3B3B", "#1E90FF", "#2ECC71", "#F39C12", "#9B59B6", "#ECF0F1", "#34495E"];
}
