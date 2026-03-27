const OFFSCREEN_DOCUMENT_PATH = "src/offscreen.html";

const DEFAULT_SETTINGS = {
  maxCaptureHeight: 15000,
  captureDelayMs: 700,
  hideStickyUi: true,
  hideDynamicMedia: false,
  overlapPx: 8,
};

const CAPTURE_RETRY_DELAY_MS = 1200;
const MAX_CAPTURE_RETRIES = 4;
const SUCCESS_BADGE_DURATION_MS = 3000;

let creatingOffscreenDocument = null;
let badgePulseInterval = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getFilename = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `screenshot-${timestamp}.png`;
};

const getSettings = async () => {
  const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  return {
    maxCaptureHeight:
      Number(result.maxCaptureHeight) || DEFAULT_SETTINGS.maxCaptureHeight,
    captureDelayMs:
      Number(result.captureDelayMs) || DEFAULT_SETTINGS.captureDelayMs,
    hideStickyUi: Boolean(result.hideStickyUi),
    hideDynamicMedia: Boolean(result.hideDynamicMedia),
    overlapPx: Math.max(
      1,
      Number(result.overlapPx) || DEFAULT_SETTINGS.overlapPx
    ),
  };
};

const ensureOffscreenDocument = async () => {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);

  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl],
    });

    if (contexts.length > 0) {
      return;
    }
  }

  if (creatingOffscreenDocument) {
    await creatingOffscreenDocument;
    return;
  }

  creatingOffscreenDocument = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ["BLOBS"],
    justification:
      "Stitch multiple viewport screenshots into one full-page image.",
  });

  try {
    await creatingOffscreenDocument;
  } finally {
    creatingOffscreenDocument = null;
  }
};

const sendMessageToTab = async (tabId, message) =>
  chrome.tabs.sendMessage(tabId, message);

const injectPageScript = async (tabId) => {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["src/page.js"],
  });
};

const captureVisibleTabWithRetry = async (windowId, attempt = 0) => {
  try {
    return await chrome.tabs.captureVisibleTab(windowId, {
      format: "png",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const hitQuota = message.includes(
      "MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND"
    );

    if (!hitQuota || attempt >= MAX_CAPTURE_RETRIES) {
      throw error;
    }

    const retryDelay = CAPTURE_RETRY_DELAY_MS * (attempt + 1);
    await sleep(retryDelay);

    return captureVisibleTabWithRetry(windowId, attempt + 1);
  }
};

const clearBadge = async () => {
  if (badgePulseInterval) {
    clearInterval(badgePulseInterval);
    badgePulseInterval = null;
  }

  await chrome.action.setBadgeText({ text: "" });
};

const setBadge = async (text, backgroundColor) => {
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
  await chrome.action.setBadgeBackgroundColor({ color: backgroundColor });
};

const startCapturingBadge = async () => {
  if (badgePulseInterval) {
    clearInterval(badgePulseInterval);
    badgePulseInterval = null;
  }

  const pulseColors = [
    "#B00020",
    "#C62828",
    "#D32F2F",
    "#E53935",
    "#D32F2F",
    "#C62828",
  ];

  let pulseIndex = 0;

  await setBadge("CAP", pulseColors[pulseIndex]);

  badgePulseInterval = setInterval(() => {
    pulseIndex = (pulseIndex + 1) % pulseColors.length;

    chrome.action
      .setBadgeBackgroundColor({
        color: pulseColors[pulseIndex],
      })
      .catch(() => {
        // Ignore badge update failures if the extension is unloading.
      });
  }, 180);
};

const showDoneBadge = async () => {
  if (badgePulseInterval) {
    clearInterval(badgePulseInterval);
    badgePulseInterval = null;
  }

  await setBadge("Done", "#1B5E20");
  await sleep(SUCCESS_BADGE_DURATION_MS);
  await clearBadge();
};

const showErrorBadge = async () => {
  if (badgePulseInterval) {
    clearInterval(badgePulseInterval);
    badgePulseInterval = null;
  }

  await setBadge("Err", "#B00020");
  await sleep(3000);
  await clearBadge();
};

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.windowId) {
    return;
  }

  await startCapturingBadge();

  try {
    const settings = await getSettings();

    await ensureOffscreenDocument();
    await injectPageScript(tab.id);

    const prepareResponse = await sendMessageToTab(tab.id, {
      type: "PREPARE_CAPTURE",
      settings,
    });

    if (!prepareResponse?.ok) {
      throw new Error(
        prepareResponse?.error || "Failed to prepare page for capture."
      );
    }

    const pageInfo = await sendMessageToTab(tab.id, { type: "GET_PAGE_INFO" });

    if (!pageInfo?.ok) {
      throw new Error(pageInfo?.error || "Failed to get page information.");
    }

    const {
      totalWidth,
      totalHeight,
      viewportWidth,
      viewportHeight,
      originalScrollX,
      originalScrollY,
    } = pageInfo.data;

    const effectiveHeight =
      settings.maxCaptureHeight > 0
        ? Math.min(totalHeight, settings.maxCaptureHeight)
        : totalHeight;

    const captureStep = Math.max(1, viewportHeight - settings.overlapPx);
    const captures = [];
    let lastActualY = -1;

    for (
      let requestedY = 0;
      requestedY < effectiveHeight;
      requestedY += captureStep
    ) {
      const scrollResponse = await sendMessageToTab(tab.id, {
        type: "SCROLL_TO",
        x: originalScrollX,
        y: requestedY,
      });

      if (!scrollResponse?.ok) {
        throw new Error(
          scrollResponse?.error || `Failed to scroll to ${requestedY}px.`
        );
      }

      const actualY =
        typeof scrollResponse.actualY === "number"
          ? scrollResponse.actualY
          : requestedY;

      if (actualY <= lastActualY && captures.length > 0) {
        break;
      }

      await sleep(settings.captureDelayMs);

      const dataUrl = await captureVisibleTabWithRetry(tab.windowId);

      captures.push({
        y: actualY,
        dataUrl,
      });

      lastActualY = actualY;

      if (actualY + viewportHeight >= effectiveHeight) {
        break;
      }
    }

    const stitched = await chrome.runtime.sendMessage({
      type: "STITCH_SCREENSHOTS",
      payload: {
        totalWidth,
        totalHeight: effectiveHeight,
        viewportWidth,
        viewportHeight,
        captures,
        overlapPx: settings.overlapPx,
      },
    });

    if (!stitched?.ok || !stitched?.dataUrl) {
      throw new Error(stitched?.error || "Failed to stitch screenshots.");
    }

    await chrome.downloads.download({
      url: stitched.dataUrl,
      filename: getFilename(),
      saveAs: false,
    });

    await sendMessageToTab(tab.id, {
      type: "RESTORE_PAGE",
      x: originalScrollX,
      y: originalScrollY,
    });

    await showDoneBadge();
  } catch (error) {
    console.error("Failed to capture full-page screenshot:", error);

    try {
      await sendMessageToTab(tab.id, {
        type: "RESTORE_PAGE",
      });
    } catch {
      // Ignore restore failures.
    }

    await showErrorBadge();
  }
});
