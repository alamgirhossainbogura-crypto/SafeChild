# 📋 Project Dependencies & Technical Requirements

This document outlines the structural dependencies, system specifications, and environment
setup required to run and build the **SafeChild** AI safety platform locally and in production.

---

## 🛠️ Core Infrastructure Stack

| Dependency / Tool | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.x.x` | JavaScript runtime environment |
| **Vite** | `^5.3.1` | Frontend build tool & dev server |
| **React** | `^18.3.1` | UI library |
| **TypeScript** | `^5.2.2` | Static typing |
| **Leaflet / react-leaflet** | `^1.9.4` / `^4.2.1` | Live GPS map rendering |

---

## 📦 Dependencies (package.json)

### Production
* `react`, `react-dom` — UI rendering
* `leaflet`, `react-leaflet` — interactive map + live location marker

### Development
* `typescript` — type checking, compiled via `tsc` before build
* `vite`, `@vitejs/plugin-react` — dev server & bundling
* `@types/react`, `@types/react-dom`, `@types/leaflet` — type definitions

---

## 🔐 Backend / API Architecture

SafeChild's First Aid chatbot is powered by **Gemini 2.5 Flash**, called through a secure
**serverless function** (`api/gemini-chat.ts`), designed for deployment on **Vercel**.

* The real `GEMINI_API_KEY` lives **only** in the server environment variable
  (set in Vercel project settings, or in a local `.env` file when using `vercel dev`).
  It is **never** sent to or exposed in the browser.
* The frontend calls its own origin's `/api/gemini-chat` endpoint — no hardcoded external
  gateway URLs or client-side auth headers are used.
* The function validates the request, forwards the prompt to Gemini with a fixed system
  prompt (first-aid guidance only, no diagnosis), and returns a reply plus an `escalate`
  flag when the input or reply matches emergency keywords (e.g. unconscious, not breathing,
  severe bleeding, poison — and their Bangla equivalents).

### Local development
1. Copy `.env.example` to `.env` and add your own Gemini API key
   (get one from https://aistudio.google.com/app/apikey).
2. Run `vercel dev` (or `vite` for frontend-only work — API calls will proxy to
   `http://localhost:3000` per `vite.config.ts`).

### Production
Set `GEMINI_API_KEY` as an environment variable in the Vercel project dashboard before deploying.

---

## 🌐 Browser & Hardware API Requirements

To use all interactive safety features, the device/browser must support and grant:

1. **HTML5 Geolocation API** — for live latitude/longitude tracking on the map.
2. **Web Speech Recognition API** — for the voice-activated `"Help"` SOS trigger.
   Chrome/Chromium-based browsers currently have the most reliable support.
3. **Microphone permission** — requested on app load for voice SOS.
4. **Notification permission** — optional, used to confirm SOS actions (e.g. "Calling Contact 1...").
5. **Network access** — required for OpenStreetMap map tiles and for the `/api/gemini-chat` endpoint.

---

## 📱 Known Limitations

* Voice recognition (`Help` trigger) depends on browser support — not all mobile browsers
  implement the Web Speech API consistently.
* `tel:` links used for calling only work on devices with actual calling capability
  (a phone/SIM) — they will not trigger a real call in a desktop browser.
* The AI chatbot gives first-aid guidance only; it explicitly is not a substitute for
  a doctor and always recommends contacting 999 or a guardian for serious situations.
