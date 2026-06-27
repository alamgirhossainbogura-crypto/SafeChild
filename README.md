# 🛡️ SafeChild

**SafeChild** is a premium, mobile-responsive web application explicitly designed to enhance children's safety and emergency response efficiency in Bangladesh. Built with a modern **Neon-Soft Minimalist UI**, the platform features dark theme consistency, continuous background processes for threat tracking, and smart serverless AI execution.

---

## 📸 App Previews

<p align="center">
  <img src="AXRecorder_20260616_04.jpg" width="280" alt="Live GPS Tracking Map" />
  <img src="AXRecorder_20260616_05.jpg" width="280" alt="SOS Emergency Panel" />
  <img src="AXRecorder_20260616_06.jpg" width="280" alt="Gemini First Aid AI Chat" />
</p>

---

## ✨ Key Features

### 📍 1. Live Bangladesh GPS Map
* **Interactive Mapping:** Powered by Leaflet.js and OpenStreetMap layers centered seamlessly on Bangladesh.
* **Real-time Geolocation:** Integrates native HTML5 Geolocation APIs to pull live latitude and longitude streams.
* **Visual Identifiers:** Renders a unique pulsing, glowing **Electric Cyan live marker** tracking user displacement.

### 🚨 2. Intelligent SOS Help System
* **Voice-Activated Triggers:** Features hands-free continuous processing listening specifically for the phrase `"Help Help"` using the Web Speech token mechanism.
* **Alternating Call Routing Logic:** Cycling execution infrastructure that forwards emergency operations dynamically (First trigger targets Contact 1; subsequent continuous trigger routes to Contact 2).
* **National Redirection:** Persistent high-contrast Neon Red backup panel targeting the direct **999 National Emergency Routing Hub**.
* **Local Persistence:** Contact configuration updates are saved locally via browser `localStorage` ensuring configuration continuity across sessions.

### 🤖 3. First Aid Conversational AI
* **Dual-Language Core:** Seamless semantic understanding across both **English** and **Bangla (বাংলা)** inputs.
* **Medical Context Engine:** Driven by the **Gemini 2.5 Flash** large language model, delivering structured, highly empathetic step-by-step immediate treatment steps.
* **Embedded Guardrail UI:** Permanent high-visibility yellow-bordered disclaimer highlighting clear operational limits—declaring it strictly a temporary support mechanism that does not replace real doctor prescriptions.

---

## 🏗️ Technical Architecture & AI Workflow

* **Data Entry (Inputs):** Free-form medical query strings (English/Bangla), browser-derived physical GPS coordinates, and real-time mic streaming tokens.
* **Core Processing Engine:** Edge-routed function logic built securely around the **Gemini 2.5 Flash API** infrastructure. Secure gateway headers handle private operational keys (`X-Gateway-Authorization`) safely to mitigate malicious public intercepts.
* **Outputs Received:** Dynamic UI rendering of tracked movement matrices, immediate dial triggers, and empathetic, markdown-compliant step-by-step clinical first aid walkthrough responses.

---

## 🎨 UI Theme Metrics

* **Background Matrix:** Dark Midnight Blue (`#0F172A`)
* **Action & Emergency Components:** Neon Red / Coral (`#FF4757`)
* **Geospatial & Cognitive AI Nodes:** Electric Cyan (`#00D2D3`)

---

## 🔗 Live Demo

Deploy লিংকটি দেখতে এবং অ্যাপটি সরাসরি ব্যবহার করতে নিচের বাটনে ক্লিক করুন:

[![Live Demo](https://img.shields.io/badge/🟢%20Live%20Demo-Visit%20SafeChild%20App-00D2D3?style=for-the-badge&logo=vercel&logoColor=white)](https://app-cdk7t9oatj41.appmedo.com/)
