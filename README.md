# 🎉 SignConnect: Indian Sign Language Translator

A production-grade web application that captures Indian Sign Language (ISL) gestures in real-time via webcam, recognizes signs using AI (MediaPipe), assembles them into coherent English sentences, translates them to 22 Indian regional languages, and outputs live captions + TTS audio.

## 🚀 How to Run the App (Quick Start)

The easiest way to run the application is to start the web frontend. The AI processing (MediaPipe) runs entirely in your browser locally using WebGL, so you don't need to boot up heavy Python ML servers!

### Prerequisites
- [Node.js](https://nodejs.org/en/) (Version 18 or higher)

### Run Instructions
1. Open your terminal in the root of the `PROJECT` folder.
2. Install all dependencies (you only need to do this once):
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev --workspace=apps/web
   ```
4. Look at the terminal output. It will tell you the exact URL the app is running on (usually `http://localhost:5173`).
5. Open that URL in your browser (Chrome, Edge, Firefox).

> **Note for Mobile Testing:** The app is configured to broadcast on your local network. If your PC and your phone are on the same WiFi, the terminal will show a Network URL (e.g., `http://192.168.1.5:5173`). You can open that link on your phone to use its camera!

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS v3 + shadcn/ui
- **ML Engine:** MediaPipe Tasks Vision (in-browser landmark extraction)
- **Database + Auth:** Supabase (PostgreSQL + Auth with JWT)
- **Translation Engine:** MyMemory API + Lingva API (22 Indian Languages supported)
- **TTS Engine:** Web Speech API (Native browser voices)

### Project Structure
```text
PROJECT/
├── apps/
│   └── web/               # React frontend (Vite)
│       ├── src/
│       │   ├── pages/     # All UI Pages (App, Dashboard, Gestures, Videos)
│       │   ├── services/  # AI logic (gestureRecognizer.ts, translator.ts)
│       │   └── stores/    # Zustand global state
├── infra/                 # Supabase DB Schema
├── packages/              # Shared Types
└── package.json           # Monorepo configs
```

## ✨ Core Features
- **Real-Time Tracking:** Extracts 21 hand landmarks and 33 body pose keypoints directly in the browser with zero latency.
- **Multilingual Support:** Translates ISL into Hindi, Tamil, Telugu, Marathi, and 18 other regional languages.
- **Custom Gesture Trainer:** Train the AI on your own custom signs directly through your webcam. The app saves the 3D hand spatial snapshot locally.
- **Video Review Gallery:** Watch official ISL tutorials and rate them (Edge & Chrome compatible).
- **Admin Telemetry:** Track active inferences, accuracy scores, and system latency.

## 🔒 Privacy
**No raw video ever leaves your browser.** The camera feed is processed entirely locally on your device's CPU/GPU. Only the final translated text is synced to your session history in Supabase.
