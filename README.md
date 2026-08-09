# Souvik OS ⚡

A minimal, private, single-user Life Operating System built with React 19, Vite, and Supabase.

---

## 🚀 One-Click Deploy to Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** → **Project**.
3. Import the **`decode-pixel/SOUVIK-OS`** repository.
4. Vercel will automatically detect the settings from `vercel.json`:
   - **Framework Preset**: Vite
   - **Build Command**: `cd app && npm install && npm run build`
   - **Output Directory**: `app/dist`
5. Click **Deploy**. Your site will be live in seconds!

*Note: The app is pre-configured with the default Supabase endpoints and handles all SPA client-side route rewrites automatically.*

---

## 🛠️ Local Development

1. Navigate to the app directory:
   ```bash
   cd app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ✨ Features
- **Daily Check-in Flow**: Track sleep, exercise, energy, mood, and good/bad habits.
- **Finance Module**: Cash flow, category breakdown, and transaction logs.
- **Tasks & Projects**: Kanban and list views with due dates and priority tags.
- **Health & Metrics**: Body weight, calories, water, and sleep tracking.
- **Apple-inspired Liquid Glass UI**: Clean 3-layer surface hierarchy with fluid transitions and seamless Light/Dark modes.
