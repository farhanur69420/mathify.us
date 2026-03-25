# Mathify — Astro Setup

## One-time setup (run once on your machine)

```bash
# 1. Install Node.js if not already installed
#    Download from https://nodejs.org (LTS version)

# 2. Clone your repo and navigate into it
git clone https://github.com/YOUR_USERNAME/mathify.us.git
cd mathify.us

# 3. Copy these Astro files into the repo root
#    (the files you received: package.json, astro.config.mjs, src/, .github/)

# 4. Install dependencies (one time only)
npm install
```

## Daily workflow

```bash
# Start local dev server (live reload at http://localhost:4321)
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview the production build locally
npm run preview
```

## Deploy to GitHub Pages

```bash
# Just push to main — GitHub Actions handles the rest automatically
git add .
git commit -m "your message"
git push

# GitHub Actions will:
# 1. Run npm run build
# 2. Deploy dist/ to GitHub Pages
# Done in ~60 seconds
```

## Enable GitHub Actions in your repo

Go to: Settings → Pages → Source → **GitHub Actions** (not "Deploy from branch")

## Adding a new year's questions

```bash
# 1. Create the data file
nano src/data/ssc-2025-dhaka.json   # copy ssc-2024-dhaka.json as template

# 2. Create the page (copy ssc-math-2024.astro, update imports)
cp src/pages/ssc-math-2024.astro src/pages/ssc-math-2025.astro
nano src/pages/ssc-math-2025.astro  # update import paths

# 3. Done — no HTML to write
```

## Adding a new board question card

Inside any `ssc-2024-BOARD.json`, add one object to the `"mcq"` array:

```json
{
  "n": 31,
  "ch": "Algebra",
  "en": "If x+y=7 and xy=12, find x²+y²",
  "bn": "যদি x+y=7 এবং xy=12 হয়, তাহলে x²+y² = ?",
  "opts": ["21", "25", "49", "1"],
  "ans": 1,
  "viz": "null",
  "sol": [
    {"t": "Use identity: x²+y² = (x+y)² - 2xy"},
    {"m": "(7)^2 - 2(12) = 49 - 24 = \\boxed{25}"}
  ]
}
```

That's it. No HTML. No templates. Just data.

## File structure

```
src/
├── layouts/Base.astro          ← nav + MathJax + CSS vars (edit once)
├── pages/ssc-math-2024.astro   ← page template (edit once per year)
├── components/QuestionCard.svelte ← card UI (edit once ever)
└── data/
    ├── ssc-2024-dhaka.json     ← Dhaka: 30 MCQ + 7 CQ, all solved
    ├── ssc-2024-rajshahi.json
    ├── ...                     ← one file per board
```

## Chatbot Setup (Gemini AI)

The chatbot uses Google's Gemini 1.5 Flash model to provide step-by-step math tutoring.

### 1. Prerequisites
Install the Google Generative AI SDK:
```bash
npm install @google/generative-ai
```

### 2. API Configuration
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create a `.env` file in the root directory (copy from `.env.example`).
3. Add your key: `GEMINI_API_KEY=your_key_here`.

### 3. Architecture
- **Backend**: `src/pages/api/chat.json.ts` handles secure communication with Gemini.
- **Frontend**: `src/components/MathifyChatbot.svelte` is a floating Svelte widget.
- **Rendering**: Uses MathJax (global) and custom HTML parsing for Markdown/LaTeX support.
