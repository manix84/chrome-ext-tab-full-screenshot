const DEFAULT_SETTINGS = {
  maxCaptureHeight: 15000,
  captureDelayMs: 700,
  hideStickyUi: true,
  hideDynamicMedia: false,
  overlapPx: 8,
};

const captureLengthSelect = document.getElementById("captureLength");
const captureDelayInput = document.getElementById("captureDelay");
const captureDelayValue = document.getElementById("captureDelayValue");
const hideStickyUiInput = document.getElementById("hideStickyUi");
const hideDynamicMediaInput = document.getElementById("hideDynamicMedia");
const saveButton = document.getElementById("save");
const statusElement = document.getElementById("status");

const renderDelayValue = () => {
  captureDelayValue.textContent = `${captureDelayInput.value}ms`;
};

const loadSettings = async () => {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  captureLengthSelect.value = String(settings.maxCaptureHeight);
  captureDelayInput.value = String(settings.captureDelayMs);
  hideStickyUiInput.checked = Boolean(settings.hideStickyUi);
  hideDynamicMediaInput.checked = Boolean(settings.hideDynamicMedia);

  renderDelayValue();
};

const saveSettings = async () => {
  const existingSettings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  const settings = {
    ...existingSettings,
    maxCaptureHeight: Number(captureLengthSelect.value),
    captureDelayMs: Number(captureDelayInput.value),
    hideStickyUi: hideStickyUiInput.checked,
    hideDynamicMedia: hideDynamicMediaInput.checked,
  };

  await chrome.storage.sync.set(settings);

  statusElement.textContent = "Saved.";

  window.setTimeout(() => {
    statusElement.textContent = "";
  }, 1500);
};

captureDelayInput.addEventListener("input", renderDelayValue);
saveButton.addEventListener("click", saveSettings);

loadSettings();
