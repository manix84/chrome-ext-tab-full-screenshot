let savedScrollX = 0;
let savedScrollY = 0;
let hiddenElements = [];
let styleElement = null;
let captureSettings = {
  hideStickyUi: true,
  hideDynamicMedia: false,
};

const CAPTURE_ATTRIBUTE = "data-fullpage-screenshot-hidden";

const getScrollRoot = () =>
  document.scrollingElement || document.documentElement;

const waitFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));
const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getDevicePixelSnappedValue = (value) => {
  const dpr = window.devicePixelRatio || 1;
  return Math.round(value * dpr) / dpr;
};

const getPageInfo = () => {
  const body = document.body;
  const html = document.documentElement;
  const scrollRoot = getScrollRoot();

  const totalWidth = Math.max(
    body ? body.scrollWidth : 0,
    body ? body.offsetWidth : 0,
    html ? html.clientWidth : 0,
    html ? html.scrollWidth : 0,
    html ? html.offsetWidth : 0,
    scrollRoot ? scrollRoot.scrollWidth : 0
  );

  const totalHeight = Math.max(
    body ? body.scrollHeight : 0,
    body ? body.offsetHeight : 0,
    html ? html.clientHeight : 0,
    html ? html.scrollHeight : 0,
    html ? html.offsetHeight : 0,
    scrollRoot ? scrollRoot.scrollHeight : 0,
    window.innerHeight
  );

  return {
    totalWidth,
    totalHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    originalScrollX: window.scrollX,
    originalScrollY: window.scrollY,
  };
};

const isLikelyHeaderOrFooter = (element) => {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  return (
    rect.width >= viewportWidth * 0.7 &&
    rect.height > 0 &&
    rect.height <= viewportHeight * 0.35 &&
    (rect.top <= 120 || rect.bottom >= viewportHeight - 120)
  );
};

const hideElement = (element) => {
  hiddenElements.push({
    element,
    visibility: element.style.visibility,
  });

  element.setAttribute(CAPTURE_ATTRIBUTE, "true");
  element.style.visibility = "hidden";
};

const hideStickyAndFixedElements = () => {
  hiddenElements = [];

  const allElements = Array.from(document.querySelectorAll("*"));

  for (const element of allElements) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }

    if (element === document.documentElement || element === document.body) {
      continue;
    }

    const style = window.getComputedStyle(element);
    const position = style.position;

    if (position !== "fixed" && position !== "sticky") {
      continue;
    }

    const rect = element.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    if (!isLikelyHeaderOrFooter(element)) {
      continue;
    }

    hideElement(element);
  }
};

const applyCaptureStyles = () => {
  if (styleElement) {
    return;
  }

  const dynamicMediaStyles = captureSettings.hideDynamicMedia
    ? `
    video,
    canvas {
      visibility: hidden !important;
    }
  `
    : "";

  styleElement = document.createElement("style");
  styleElement.id = "fullpage-screenshot-style";
  styleElement.textContent = `
    html,
    body,
    * {
      scroll-behavior: auto !important;
      scroll-snap-type: none !important;
    }

    * {
      animation-delay: 0s !important;
      animation-duration: 0s !important;
      animation-play-state: paused !important;
      transition: none !important;
      caret-color: transparent !important;
    }

    ::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    [${CAPTURE_ATTRIBUTE}="true"] {
      visibility: hidden !important;
    }

    ${dynamicMediaStyles}
  `;

  document.documentElement.appendChild(styleElement);
};

const preloadPage = async () => {
  const scrollRoot = getScrollRoot();
  const startY = scrollRoot.scrollTop;
  const maxHeight = scrollRoot.scrollHeight;
  const step = window.innerHeight;

  for (let y = 0; y < maxHeight; y += step) {
    const snappedY = getDevicePixelSnappedValue(y);
    scrollRoot.scrollTo(0, snappedY);
    await waitFrame();
    await waitMs(120);
  }

  scrollRoot.scrollTo(0, getDevicePixelSnappedValue(startY));
  await waitFrame();
  await waitFrame();
};

const restorePage = (x = savedScrollX, y = savedScrollY) => {
  for (const entry of hiddenElements) {
    entry.element.style.visibility = entry.visibility;
    entry.element.removeAttribute(CAPTURE_ATTRIBUTE);
  }

  hiddenElements = [];

  if (styleElement) {
    styleElement.remove();
    styleElement = null;
  }

  window.scrollTo(x, y);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case "PREPARE_CAPTURE": {
          savedScrollX = window.scrollX;
          savedScrollY = window.scrollY;

          captureSettings = {
            hideStickyUi: message.settings?.hideStickyUi !== false,
            hideDynamicMedia: message.settings?.hideDynamicMedia === true,
          };

          applyCaptureStyles();

          if (captureSettings.hideStickyUi) {
            hideStickyAndFixedElements();
          }

          await preloadPage();

          sendResponse({ ok: true });
          return;
        }

        case "GET_PAGE_INFO": {
          sendResponse({
            ok: true,
            data: getPageInfo(),
          });
          return;
        }

        case "SCROLL_TO": {
          const scrollRoot = getScrollRoot();
          const targetX = getDevicePixelSnappedValue(message.x ?? 0);
          const targetY = getDevicePixelSnappedValue(message.y ?? 0);

          scrollRoot.scrollTo(targetX, targetY);

          await waitFrame();
          await waitFrame();
          await waitFrame();

          const actualY = getDevicePixelSnappedValue(scrollRoot.scrollTop);

          sendResponse({
            ok: true,
            actualY,
          });
          return;
        }

        case "RESTORE_PAGE": {
          const x = typeof message.x === "number" ? message.x : savedScrollX;
          const y = typeof message.y === "number" ? message.y : savedScrollY;

          restorePage(x, y);

          sendResponse({ ok: true });
          return;
        }

        default: {
          sendResponse({
            ok: false,
            error: "Unknown message type.",
          });
        }
      }
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();

  return true;
});
