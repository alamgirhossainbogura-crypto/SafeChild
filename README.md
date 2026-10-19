# SafeChild

SafeChild is a child and family safety app for Bangladesh and beyond. It combines hands-free voice SOS, an automatic call chain to trusted contacts and the local emergency number, a live family map, and a bilingual (English and Bangla) first aid assistant.

**Status:** the Android app is under development. A working web prototype exists. See [Project status](#project-status).

**Web prototype demo:** https://app-cdk7t9oatj41.appmedo.com

## Features

### Planned for the Android app

- **SOS from three triggers:** the in-app SOS button, the voice phrases "help help" or "বাঁচাও বাঁচাও" (also with the phone locked, when Always on is enabled), and a lock screen SOS button.
- **Call chain:** first contact, then second contact, then the emergency number of the selected country. Unanswered contacts get an SMS with a map link. A "Stop calls" button ends the chain.
- **Family map:** your own location in blue, connected people in green, and a person in SOS in red with the label "SOS". Up to 10 connections, shared only with consent. Everyone appears on the map with a nickname they choose themselves.
- **Pairing:** each person has their own 4-digit pair code. To connect, enter the other person's phone number or email and their pair code. The other person must accept. Either side can delete the connection at any time.
- **Pause sharing:** the screen shows when location sharing is on, with a "Pause sharing" switch. SOS overrides the pause.
- **Safe / Unsafe status:** SOS sets you to Unsafe. You set Safe again with your password (works offline).
- **First Aid AI:** text and voice input, answers in English, Bangla or Banglish, with a permanent medical disclaimer.
- **Works offline:** SOS and settings work without internet. The map and AI need internet.
- **Privacy:** nickname instead of real name, pair code instead of shared passwords, no audio recording.

### Web prototype (available now)

- Live GPS map (Leaflet and OpenStreetMap)
- SOS Help tab with two emergency contacts, a voice command ("help") and a 999 button
- First Aid AI chat (Gemini) in English and Bangla

## Project status

| Part | Status |
| :--- | :--- |
| Web prototype | Working |
| Android SOS core (call chain, SMS, foreground service) | Draft code, not yet tested on a device |
| Voice keyword detection (English and Bangla) | Not started, needs testing for Bangla |
| Backend (pairing, SOS, AI) | Code drafted, not deployed or tested |
| Accounts and OTP screens | Designed, not built |
| Map, live location, push notifications | Designed, not built |
| First Aid AI in the Android app | Designed, not built (server part drafted) |
| Emergency number data | Compiled from public lists, needs verification |

## Repository layout

```
SafeChild/
├── android/        Kotlin Android app (draft)
├── functions/      TypeScript backend (Firebase Cloud Functions)
├── src/            Web prototype (React)
├── api/            Web prototype serverless function (Gemini)
├── docs/           Documentation and reference data
│   └── reference-data/   Emergency numbers for 246 countries
├── firestore.rules Firestore security rules
└── requirement.md  Dependencies and technical requirements
```

The Android app reads `android/app/src/main/assets/emergency_numbers_app.json`. Details are in [docs/emergency-numbers.md](docs/emergency-numbers.md).

## Tech stack

| Layer | Technology |
| :--- | :--- |
| Android app | Kotlin, Jetpack Compose |
| Backend | Firebase (Auth, Firestore, Cloud Messaging), TypeScript Cloud Functions |
| Maps | OpenStreetMap |
| AI | Gemini, called only from the server |
| Web prototype | React, TypeScript, Vite, Leaflet |

The Gemini API key is only read on the server. It is never in the app or in this repository.

## Run the web prototype

```bash
npm install
cp .env.example .env     # add your GEMINI_API_KEY
npm run dev
```

For the AI chat to work locally, run `vercel dev` instead. See [requirement.md](requirement.md).

## Limitations

- If the phone is switched off, nothing works.
- Background voice detection and calling from a locked phone depend on the phone model and Android version, and need real-device testing. Some brands (for example Xiaomi, Oppo, Vivo) stop background apps unless battery optimization is turned off.
- Without internet, notifications to connected people are not delivered. Only SMS reaches contacts.
- Emergency numbers come from public lists and are not official. Verify them before relying on them.

## Disclaimer

SafeChild's AI assistant gives general first aid information only. It is not medical advice, diagnosis or treatment. In a serious emergency, call your local emergency number or go to the nearest hospital immediately.

## Recognition

- Shortlisted among the top 118 of 355 projects, BIIN Awards 2026
- Finalist, USAII Hackathon

## License

MIT. See [LICENSE](LICENSE).
