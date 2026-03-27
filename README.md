# One-Click Full Page Screenshot

[![Release Chrome Extension](https://github.com/manix84/chrome-ext-tab-full-screenshot/actions/workflows/release-extension.yml/badge.svg)](https://github.com/manix84/chrome-ext-tab-full-screenshot/actions/workflows/release-extension.yml)

A lightweight Chrome extension that captures a full-page screenshot of the current tab with a single click — no accounts, no tracking, no nonsense.

## ✨ Features

- 📸 Capture entire webpages (not just the visible area)
- 🧠 Smart stitching with overlap handling (no seams or gaps)
- ⚡ One-click capture from the toolbar
- 💾 Automatically downloads the image (no prompts)
- 🎯 Handles tricky pages:
  - Sticky headers/footers
  - Infinite scroll (with configurable limits)
  - Lazy-loaded content
  - High-DPI / zoomed displays
- 🎛 Customisable behaviour via options:
  - Maximum capture length
  - Delay between scrolls
  - Hide sticky UI elements
  - Hide video/canvas content

## 🧰 How It Works

1. Click the extension icon
2. The page is prepared for capture (animations paused, optional UI hidden)
3. The page is scrolled in segments and screenshots are taken
4. Images are stitched together in the background
5. The final image is automatically downloaded

## ⚙️ Settings

You can configure behaviour from the extension options page:

- **Capture Length**
  - Short (10,000px)
  - Medium (15,000px)
  - Long (30,000px)
  - Unlimited

- **Delay Between Scrolls**
  - Helps with slow or lazy-loading pages

- **Hide Sticky UI**
  - Prevents duplicated headers/footers

- **Hide Video/Canvas**
  - Useful for animated or dynamic content

## 🔒 Privacy First

This extension is designed with privacy as a priority:

- No tracking
- No analytics
- No data collection
- No external requests
- No accounts required

Everything runs locally in your browser.

## 🚫 Limitations

- Extremely long pages may be truncated (by design or browser limits)
- Some complex web apps may not render perfectly when captured
- Pages using heavy GPU transforms may still produce minor artifacts

## 🧪 Development

This extension uses plain JavaScript and does not require a build step.

### Install locally

1. Clone this repository
2. Go to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the project folder

## 📦 Packaging

To publish:

- Zip the extension directory
- Upload via the Chrome Web Store Developer Dashboard

## 📄 License

MIT (or whatever you prefer)

---

Built with a focus on simplicity, performance, and respecting users.
