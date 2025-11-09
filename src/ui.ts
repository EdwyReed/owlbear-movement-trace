const STORAGE_KEY = "obr:trail:color";
const ENABLED_STORAGE_KEY = "obr:trail:enabled";
const DEFAULT_COLOR = "#FF3B3B";

let currentColor = readStoredColor();
let trailEnabled = readStoredEnabled();
const enabledListeners = new Set<(enabled: boolean) => void>();

function readStoredColor(): string {
  const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (!stored || !/^#([0-9a-fA-F]{6})$/.test(stored)) {
    return DEFAULT_COLOR;
  }
  return stored.toUpperCase();
}

function readStoredEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(ENABLED_STORAGE_KEY);
  if (stored === null) return true;
  return stored === "true";
}

function persistColor(hex: string) {
  currentColor = hex.toUpperCase();
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, currentColor);
  }
}

function persistEnabled(enabled: boolean) {
  trailEnabled = enabled;
  if (typeof window !== "undefined") {
    localStorage.setItem(ENABLED_STORAGE_KEY, String(enabled));
  }
  enabledListeners.forEach((listener) => listener(trailEnabled));
}

export function getTrailColor(): string {
  return currentColor;
}

export function getTrailEnabled(): boolean {
  return trailEnabled;
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

export function setTrailEnabled(enabled: boolean) {
  if (trailEnabled === enabled) return;
  persistEnabled(enabled);
  updateEnabledState();
}

export function onTrailEnabledChange(listener: (enabled: boolean) => void): () => void {
  enabledListeners.add(listener);
  return () => enabledListeners.delete(listener);
}

export function mountColorPicker(root: HTMLElement = document.body) {
  const wrapper = document.createElement("div");
  wrapper.className = "obr-trail-picker";
  wrapper.innerHTML = `
    <div class="obr-trail-card">
      <label class="obr-trail-toggle">
        <input id="obr-trail-enabled-toggle" type="checkbox" ${trailEnabled ? "checked" : ""} aria-label="Toggle trail drawing" />
        <span class="label">Отрисовка пути</span>
        <span class="obr-trail-toggle-state">${trailEnabled ? "Вкл" : "Выкл"}</span>
      </label>
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
  const toggle = wrapper.querySelector<HTMLInputElement>("#obr-trail-enabled-toggle");

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

  toggle?.addEventListener("change", () => {
    setTrailEnabled(Boolean(toggle.checked));
  });

  updateEnabledState(wrapper);
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

function updateEnabledState(scope: ParentNode = document) {
  const toggle = scope.querySelector<HTMLInputElement>("#obr-trail-enabled-toggle");
  const toggleState = scope.querySelector<HTMLSpanElement>(".obr-trail-toggle-state");
  if (toggle) {
    toggle.checked = trailEnabled;
  }
  if (toggleState) {
    toggleState.textContent = trailEnabled ? "Вкл" : "Выкл";
  }

  scope.querySelectorAll<HTMLButtonElement>(".obr-trail-picker .presets button").forEach((button) => {
    button.disabled = !trailEnabled;
  });

  const input = scope.querySelector<HTMLInputElement>("#obr-trail-color-input");
  if (input) {
    input.disabled = !trailEnabled;
  }

  const card = scope.querySelector(".obr-trail-card");
  if (card) {
    card.classList.toggle("is-disabled", !trailEnabled);
  }
}
