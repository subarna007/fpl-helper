# ⚽ FPL Analytics Dashboard

A modern **Fantasy Premier League (FPL) analytics web app** built with **Next.js App Router**.  
It helps FPL managers analyze their squad, fixtures, and player performance using a clean, professional dashboard inspired by tools like Fantasy Football Hub and Fantasy Football Scout.

---

## 📸 Screenshot

> Add a screenshot of the dashboard UI here.

![FPL Dashboard Screenshot](1.png)
![FPL Dashboard Screenshot](2.png)


## 🚀 Features

- 🔐 **Enter FPL Entry ID once** – works across the entire app
- 🏟️ **Pitch-based squad view**
  - Proper Starting XI & Bench
  - Position-aware layout
  - Click players for detailed stats
- 🧩 **Player cards**
  - Price, form, ownership
  - xPoints (Next GW & 5 GWs)
  - Upcoming fixture & difficulty
- 📊 **Analytics widgets**
  - Quick insights for the current gameweek
- 🧠 **Expandable architecture**
  - Built to support AI transfers, captaincy, and optimal team selection

---

## 🛠️ Tech Stack

- **Next.js** (App Router)
- **TypeScript**
- **React**
- **Tailwind CSS**
- **FPL Official APIs (proxied)**

---

## 🧭 How It Works

1. Enter your **FPL Entry ID**
2. App fetches:
   - Squad
   - Fixtures
   - Player stats
3. Data is stored globally → available everywhere
4. Dashboard renders:
   - Squad pitch
   - Widgets
   - Player drawer with deep stats

---

## 🏗️ Project Structure (Simplified)

```text
app/
 ├─ api/              # FPL API routes
 ├─ _components/      # UI components (Pitch, PlayerTile, Widgets)
 ├─ _state/           # Global dashboard context
 ├─ layout.tsx
 └─ page.tsx
