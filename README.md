# Gmail Calendar Options (Chrome Extension)
> **Repo:** `Kevinjohn/chome-extension-gmail-calendar-options`  
> A Chrome Extension, to give Gmail users, options to interact with calendar emails
> Lightweight MV3 extension that lets Gmail users toggle the visibility of calendar-related e-mails directly inside the web interface.

---

## Table of Contents

1. [Features](#features)  
2. [Screenshots](#screenshots)  
3. [Requirements](#requirements)  
4. [Quick Start](#quick-start)  
5. [Building for Production](#building-for-production)  
6. [Debug Mode](#debug-mode)  
7. [Keyboard & Accessibility Notes](#keyboard--accessibility-notes)  
8. [Localisation](#localisation)  
9. [Project Structure](#project-structure)  
10. [Scripts](#scripts)  
11. [Testing](#testing)  
12. [Contributing](#contributing)  
13. [Road-map](#road-map)  
14. [Licence](#licence)

---

## Features

| Button | Result | Status text (right-hand side) |
|--------|--------|--------------------------------|
| **Yes** | Show ordinary e-mails **and** calendar invites | “Showing e-mails and calendar invites” |
| **No** | Hide calendar invites only | “Calendar is hidden” |
| **Only** | Show **only** calendar invites | “Only showing calendars” |

* MV3-compliant (`service_worker` background, no persistent pages).  
* Zero network calls – all filtering happens client-side.  
* **Debug mode** tints hidden rows blue at 50 % opacity.  
* Fully keyboard accessible and WCAG 2.1 AA compliant.  
* Strings externalised for easy translation (`_locales`).  
* CSS uses logical properties so RTL languages render correctly.

---

## Screenshots

| Toolbar (default) | Toolbar (debug mode) |
|-------------------|----------------------|
| ![](docs/screenshot_default.png) | ![](docs/screenshot_debug.png) |

*(PNG placeholders – update after first build)*

---

## Requirements

* **Google Chrome / Microsoft Edge ≥ 114** (desktop)  
* **Node ≥ 18** (for build & test tooling)  
* macOS, Windows, or Linux

---

## Quick Start

```bash
git clone https://github.com/Kevinjohn/chome-extension-gmail-calendar-options.git
cd chome-extension-gmail-calendar-options

# install dev dependencies
npm ci

# create dist/ with manifest and assets
npm run build

# load unpacked extension
# 1. Open chrome://extensions (or edge://extensions)
# 2. Enable “Developer mode”
# 3. Click “Load unpacked” → select the dist/ folder
