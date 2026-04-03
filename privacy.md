# Privacy Policy

## Overview

This extension is designed to respect your privacy. It does not collect, store, transmit, or share any personal or sensitive user data.

All functionality is performed locally within your browser.

---

## Data Collection

This extension does **not** collect any of the following:

- Personally identifiable information (PII)
- Health information
- Financial or payment information
- Authentication information (passwords, tokens, etc.)
- Personal communications (emails, messages, etc.)
- Location data
- Browsing history
- User activity data
- Website content (outside of temporary processing for screenshots)

---

## How the Extension Works

To function, the extension:

- Temporarily accesses the current tab when the user clicks the extension icon
- Captures visible portions of the page
- Stitches images together locally in the browser
- Saves the final image to the user’s device

All processing happens entirely on-device and is not transmitted anywhere.

---

## Data Storage

The extension uses Chrome's `storage` API only to store user preferences, such as:

- Capture length settings
- Delay timing
- UI toggles

This data:

- Is stored locally or synced via the user's Chrome profile
- Is never transmitted to external servers
- Is not used for tracking or analytics

---

## Permissions Justification

- **activeTab**
  Used to capture screenshots of the currently active tab when the user explicitly clicks the extension.

- **downloads**
  Used to save the generated screenshot image to the user’s device.

- **scripting**
  Used to inject a script into the page to control scrolling and prepare the page for capture.

- **offscreen**
  Used to process and stitch images into a final screenshot without blocking the UI.

- **storage**
  Used to store user preferences.

---

## Data Sharing

This extension:

- Does not send data to any external servers
- Does not share data with third parties
- Does not use analytics or tracking tools

---

## Changes to This Policy

If this privacy policy changes, updates will be reflected in this document.

---

## Contact

If you have any questions about this privacy policy, please contact:

Rob Taylor
manix84@gmail.com
