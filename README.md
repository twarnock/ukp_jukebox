# Urban Knight Punks

A live song request jukebox and band dashboard for real-time audience interaction at shows. Fans can browse a setlist, request songs, and suggest new ones — the band gets a live leaderboard to see what the crowd wants.

## Features

**Public Jukebox** (`/`)
- Browse a curated setlist of 44 songs with title, artist, and genre
- Search by song title or artist
- Filter by genre (Classic Rock, 80s Pop, Alt Rock, Indie Rock, etc.)
- Request songs with one click
- See which songs have already been played
- Suggest new songs for the band to learn
- Tip the band via Venmo

**Band Dashboard** (`/dashboard`)
- Live leaderboard of most-requested songs with vote counts
- Toggle played status for songs
- View recent audience suggestions
- Stats: total requests, unique songs requested, suggestion count
- Real-time updates via Supabase subscriptions (15-second polling fallback)

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS 4
- **Database:** Supabase (PostgreSQL + real-time subscriptions)
- **Deploy:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (optional — app falls back to seed data if unavailable)

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Database Setup

Run the following in your Supabase SQL editor. The full schema and seed data SQL can be found in the comments at the top of `app/page.tsx`.

Tables required:
- `songs` — setlist entries (id, title, artist, genre, played)
- `requests` — vote records (id, song_id, created_at)
- `suggestions` — user-submitted songs (id, title, artist, created_at)

### Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |

## Deployment

Deploy to Vercel with one click or via the CLI:

```bash
vercel deploy
```

Make sure to add your Supabase environment variables in the Vercel project settings.
