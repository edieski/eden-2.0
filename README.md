# Eden 2.0 — Life Transformation App

Your personal life operating system. Ballet-core, preppy clean-girl aesthetic. ADHD-friendly. Built with intention.

## Features

- **Dashboard** — Daily overview, habit progress, chibi companion
- **Transformation Plan** — 6-week ballet roadmap pre-loaded, milestones, habits by life pillar, morning/evening routines
- **To-Do + Spin Wheel** — Task list with a wheel randomizer for when you can't decide what to start (ADHD initiation aid)
- **Focus Timer** — Pomodoro-style with chibi body double, affirmations, ADHD tips
- **Food Diary** — Intuitive eating journal, no calorie counting, mood + hunger tracking
- **Meal Planner** — Weekly grid meal planning
- **Notes** — Freeform journaling with pillar tags and pinning
- **Discipline System** — Life pillars (Health, Mind, Finances, Purpose, Relationships, Spirituality, Home) + weekly review
- **Home & Cleaning** — Room-by-room tasks, Minimum Viable Day mode, duration timers
- **Vision Board** — Drag-and-drop canvas with image uploads, text cards, affirmations
- **Eden AI** — DBT/ACT/ADHD-aware chatbot with persistent memory (GPT-4o)
- **Chibi Mini-Me** — Illustrated character that changes mood based on your daily progress

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the entire contents of `supabase/schema.sql`
3. Copy your Project URL and anon key

### 2. OpenAI

1. Get an API key at [platform.openai.com](https://platform.openai.com)
2. Recommended model: `gpt-4o`

### 3. Environment Variables

Edit `.env.local` and fill in your keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-openai-key
```

### 4. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

```bash
npx vercel
```

Add your three environment variables in the Vercel dashboard.

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS v4** (custom design tokens)
- **Supabase** (Postgres, Auth, Storage)
- **OpenAI GPT-4o** (streaming, persistent memory)
- **Lucide React** (icons)
- **Zustand** (state management)

## Design

Preppy clean-girl — cream, blush pink, sage green, champagne gold. Cormorant Garamond headings, Inter body. Soft shadows, generous whitespace, no harsh edges. Premium wellness aesthetic.
