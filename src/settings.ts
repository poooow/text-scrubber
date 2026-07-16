export interface ScrubberSettings {
  bold: boolean;
  italic: boolean;
  links: boolean;
  lists: boolean;
  detectLists: boolean;
  headings: boolean;
  tables: boolean;
  colors: boolean;
  fonts: boolean;
  alignment: boolean;
}

const SETTINGS_KEY = 'text-scrubber-settings';

let settingsElements: Record<keyof ScrubberSettings, HTMLInputElement> | null = null;

let currentSettings: ScrubberSettings = {
  bold: true,
  italic: true,
  links: true,
  lists: true,
  detectLists: true,
  headings: true,
  tables: true,
  colors: false,
  fonts: false,
  alignment: false,
};

type OnChangeCallback = () => void;
let onChangeCallback: OnChangeCallback | null = null;

export function initSettings(onChange: OnChangeCallback) {
  onChangeCallback = onChange;
  
  settingsElements = {
    bold: document.getElementById('setting-bold') as HTMLInputElement,
    italic: document.getElementById('setting-italic') as HTMLInputElement,
    links: document.getElementById('setting-links') as HTMLInputElement,
    lists: document.getElementById('setting-lists') as HTMLInputElement,
    detectLists: document.getElementById('setting-detect-lists') as HTMLInputElement,
    headings: document.getElementById('setting-headings') as HTMLInputElement,
    tables: document.getElementById('setting-tables') as HTMLInputElement,
    colors: document.getElementById('setting-colors') as HTMLInputElement,
    fonts: document.getElementById('setting-fonts') as HTMLInputElement,
    alignment: document.getElementById('setting-alignment') as HTMLInputElement,
  };

  loadSettings();

  for (const el of Object.values(settingsElements)) {
    el.addEventListener('change', saveSettings);
  }
}

export function getSettings(): ScrubberSettings {
  return currentSettings;
}

function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved && settingsElements) {
    try {
      const parsed = JSON.parse(saved);
      for (const key of Object.keys(settingsElements) as Array<keyof ScrubberSettings>) {
        if (typeof parsed[key] === 'boolean') {
          settingsElements[key].checked = parsed[key];
          currentSettings[key] = parsed[key];
        } else {
          currentSettings[key] = settingsElements[key].checked;
        }
      }
    } catch (e) {
      console.error('Chyba při načítání nastavení', e);
      syncSettingsFromDOM();
    }
  } else {
    syncSettingsFromDOM();
  }
}

function syncSettingsFromDOM() {
  if (!settingsElements) return;
  for (const key of Object.keys(settingsElements) as Array<keyof ScrubberSettings>) {
    currentSettings[key] = settingsElements[key].checked;
  }
}

function saveSettings() {
  if (!settingsElements) return;
  
  for (const key of Object.keys(settingsElements) as Array<keyof ScrubberSettings>) {
    currentSettings[key] = settingsElements[key].checked;
  }
  
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
  
  if (onChangeCallback) {
    onChangeCallback();
  }
}
