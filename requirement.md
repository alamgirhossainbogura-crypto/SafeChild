# 📋 Project Dependencies & Technical Requirements

This document outlines the structural dependencies, system specifications, and environment metrics required to execute and build the **SafeChild** AI safety platform locally.

---

## 🛠️ Core Infrastructure Stack

| Dependency / Tool | Version | Target Purpose / Execution Node |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.x.x` | JavaScript Runtime Environment |
| **Vite** | `^5.3.1` | Next-generation Frontend Tooling & Dev Server |
| **React** | `^18.3.1` | UI Library for Component-Driven Architecture |
| **TypeScript** | `^5.2.2` | Static Type System for Robust Memory Scoping |

---

## 📦 Dynamic Software Modules (package.json Configuration)

### 🔵 Production Dependencies
*   `react` (`^18.3.1`): Main application rendering matrix.
*   `react-dom` (`^18.3.1`): Virtual-DOM binding connector.

### 🔴 Development Dependencies
*   `typescript` (`^5.2.2`): Local transpilation engine.
*   `vite` (`^5.3.1`): Asset bundling and hot-reloading pipeline.

---

## 🌐 Hardware & Browser API Interfacing Requirements

To successfully initiate all interactive safety workflows, the host deployment machine must support and allow access to the following underlying native system layers:

1.  **HTML5 Geolocation API:**
    *   *Purpose:* Pulling active runtime latitude/longitude vectors.
    *   *Permission Needed:* Secure Location Tracking prompt must be verified by the user.
2.  **Web Speech Recognition API (Speech-to-Text Layer):**
    *   *Purpose:* Real-time hardware microphone listening matrix for the `"Help Help"` phrase token.
    *   *Permission Needed:* Microphone hardware permission access.
3.  **Leaflet.js & OpenStreetMap CDN:**
    *   *Purpose:* Rendering real-time geospatial coordinate movements across active Bangladesh mapping tiles.
    *   *Network Layer:* Requires active web connections to pull mapping tiles via public OpenStreetMap infrastructure.
4.  **Network Access & Gateway Integrity:**
    *   *Purpose:* Transporting free-form first-aid diagnostic query arrays.
    *   *Endpoint:* Secure serverless handshake to `https://app-cdk7t9oatj41.appmedo.com/api/gemini-chat` containing valid proxy gateway authentication headers (`X-Gateway-Authorization`).
