'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ── Supabase config ──────────────────────────────────────────────────────────
// Replace these two values with your real credentials from
// Project Settings → API in the Supabase dashboard.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Venmo ────────────────────────────────────────────────────────────────────
const VENMO_URL = 'https://account.venmo.com/u/warnock126';

// ── Seed song list ───────────────────────────────────────────────────────────
// Used as fallback while Supabase loads, and as the seed data reference.
const SEED_SONGS = [
  { id: 1,  title: "Roadhouse Blues",              artist: "The Doors",                   genre: "Classic Rock" },
  { id: 2,  title: "Stuck in the Middle with You", artist: "Stealers Wheel",              genre: "Classic Rock" },
  { id: 3,  title: "Secret Agent Man",              artist: "Johnny Rivers",               genre: "Classic Rock" },
  { id: 4,  title: "Brown Eyed Girl",               artist: "Van Morrison",                genre: "Classic Rock" },
  { id: 5,  title: "Summer of '69",                 artist: "Bryan Adams",                 genre: "Classic Rock" },
  { id: 6,  title: "Jack & Diane",                  artist: "John Mellencamp",             genre: "Classic Rock" },
  { id: 7,  title: "Take On Me",                    artist: "a-ha",                        genre: "80s Pop" },
  { id: 8,  title: "I'm Gonna Be (500 Miles)",      artist: "The Proclaimers",             genre: "Pop Rock" },
  { id: 9,  title: "Don't Stop Believin'",          artist: "Journey",                     genre: "Classic Rock" },
  { id: 10, title: "Every Breath You Take",         artist: "The Police",                  genre: "80s Pop" },
  { id: 11, title: "Free Fallin'",                  artist: "Tom Petty",                   genre: "Classic Rock" },
  { id: 12, title: "Jessie's Girl",                 artist: "Rick Springfield",            genre: "80s Pop" },
  { id: 13, title: "The One I Love",                artist: "R.E.M.",                      genre: "Alt Rock" },
  { id: 14, title: "Hungry Like the Wolf",          artist: "Duran Duran",                 genre: "80s Pop" },
  { id: 15, title: "Hotel California",              artist: "Eagles",                      genre: "Classic Rock" },
  { id: 16, title: "The Joker",                     artist: "Steve Miller Band",           genre: "Classic Rock" },
  { id: 17, title: "I'm Shipping Up To Boston",     artist: "Dropkick Murphys",            genre: "Punk" },
  { id: 18, title: "Sweet Caroline",                artist: "Neil Diamond",                genre: "Classic Rock" },
  { id: 19, title: "What's Up?",                    artist: "4 Non Blondes",               genre: "90s Rock" },
  { id: 20, title: "Everlong",                      artist: "Foo Fighters",                genre: "Alt Rock" },
  { id: 21, title: "Fly Away",                      artist: "Lenny Kravitz",               genre: "Rock" },
  { id: 22, title: "Rocket Man",                    artist: "Elton John",                  genre: "Classic Rock" },
  { id: 23, title: "American Girl",                 artist: "Tom Petty and the Heartbreakers", genre: "Classic Rock" },
  { id: 24, title: "Tush",                          artist: "ZZ Top",                      genre: "Blues Rock" },
  { id: 25, title: "Santeria",                      artist: "Sublime",                     genre: "Ska Punk" },
  { id: 26, title: "Seven Nation Army",             artist: "The White Stripes",           genre: "Alt Rock" },
  { id: 27, title: "Zombie",                        artist: "The Cranberries",             genre: "Alt Rock" },
  { id: 28, title: "Stacy's Mom",                   artist: "Fountains of Wayne",          genre: "Pop Rock" },
  { id: 29, title: "Bitter Sweet Symphony",         artist: "The Verve",                   genre: "Alt Rock" },
  { id: 30, title: "Mr. Brightside",                artist: "The Killers",                 genre: "Indie Rock" },
  { id: 31, title: "The Middle",                    artist: "Jimmy Eat World",             genre: "Pop Punk" },
  { id: 32, title: "Chicken Fried",                 artist: "Zac Brown Band",              genre: "Country" },
  { id: 33, title: "Country Girl (Shake It for Me)", artist: "Luke Bryan",                 genre: "Country" },
  { id: 34, title: "First",                         artist: "Cold War Kids",               genre: "Indie Rock" },
  { id: 35, title: "My Own Worst Enemy",            artist: "Lit",                         genre: "Pop Punk" },
  { id: 36, title: "Tongue Tied",                   artist: "Grouplove",                   genre: "Indie Rock" },
  { id: 37, title: "I Love It",                     artist: "Icona Pop",                   genre: "Electropop" },
  { id: 38, title: "Ain't No Rest for the Wicked",  artist: "Cage the Elephant",           genre: "Alt Rock" },
  { id: 39, title: "Pink Pony Club",                artist: "Chappell Roan",               genre: "Pop" },
  { id: 40, title: "Watermelon Sugar",              artist: "Harry Styles",                genre: "Pop" },
  { id: 41, title: "Blinding Lights",               artist: "The Weeknd",                  genre: "Synth Pop" },
  { id: 42, title: "Ordinary",                      artist: "Alex Warren",                 genre: "Pop" },
  { id: 43, title: "Panama",                        artist: "Van Halen",                   genre: "Hard Rock" },
  { id: 44, title: "Tom Sawyer",                    artist: "Rush",                        genre: "Prog Rock" },
];

// ── Genre color map ──────────────────────────────────────────────────────────
const GENRE_COLORS: Record<string, string> = {
  "Classic Rock": "#b45309",
  "80s Pop":      "#7c3aed",
  "Alt Rock":     "#0369a1",
  "Indie Rock":   "#0891b2",
  "Pop Rock":     "#4f46e5",
  "Pop Punk":     "#be185d",
  "Punk":         "#dc2626",
  "90s Rock":     "#15803d",
  "Rock":         "#b45309",
  "Blues Rock":   "#92400e",
  "Ska Punk":     "#15803d",
  "Hard Rock":    "#b91c1c",
  "Prog Rock":    "#6d28d9",
  "Country":      "#a16207",
  "Pop":          "#db2777",
  "Synth Pop":    "#7c3aed",
  "Electropop":   "#0ea5e9",
};

type Song = typeof SEED_SONGS[0] & { requested?: boolean; played?: boolean };

// ── SQL to set up Supabase (paste into SQL Editor in Supabase dashboard) ─────
/*
create table if not exists songs (
  id serial primary key,
  title text not null,
  artist text not null,
  genre text not null
);

create table if not exists requests (
  id serial primary key,
  song_id int references songs(id),
  created_at timestamptz default now()
);

-- Add played tracking (run once)
alter table songs add column if not exists played boolean not null default false;

create table if not exists suggestions (
  id serial primary key,
  title text not null,
  created_at timestamptz default now()
);

-- Seed songs (run once)
insert into songs (title, artist, genre) values
  ('Roadhouse Blues','The Doors','Classic Rock'),
  ('Stuck in the Middle with You','Stealers Wheel','Classic Rock'),
  ('Secret Agent Man','Johnny Rivers','Classic Rock'),
  ('Brown Eyed Girl','Van Morrison','Classic Rock'),
  ('Summer of ''69','Bryan Adams','Classic Rock'),
  ('Jack & Diane','John Mellencamp','Classic Rock'),
  ('Take On Me','a-ha','80s Pop'),
  ('I''m Gonna Be (500 Miles)','The Proclaimers','Pop Rock'),
  ('Don''t Stop Believin''','Journey','Classic Rock'),
  ('Every Breath You Take','The Police','80s Pop'),
  ('Free Fallin''','Tom Petty','Classic Rock'),
  ('Jessie''s Girl','Rick Springfield','80s Pop'),
  ('The One I Love','R.E.M.','Alt Rock'),
  ('Hungry Like the Wolf','Duran Duran','80s Pop'),
  ('Hotel California','Eagles','Classic Rock'),
  ('The Joker','Steve Miller Band','Classic Rock'),
  ('I''m Shipping Up To Boston','Dropkick Murphys','Punk'),
  ('Sweet Caroline','Neil Diamond','Classic Rock'),
  ('What''s Up?','4 Non Blondes','90s Rock'),
  ('Everlong','Foo Fighters','Alt Rock'),
  ('Fly Away','Lenny Kravitz','Rock'),
  ('Rocket Man','Elton John','Classic Rock'),
  ('American Girl','Tom Petty and the Heartbreakers','Classic Rock'),
  ('Tush','ZZ Top','Blues Rock'),
  ('Santeria','Sublime','Ska Punk'),
  ('Seven Nation Army','The White Stripes','Alt Rock'),
  ('Zombie','The Cranberries','Alt Rock'),
  ('Stacy''s Mom','Fountains of Wayne','Pop Rock'),
  ('Bitter Sweet Symphony','The Verve','Alt Rock'),
  ('Mr. Brightside','The Killers','Indie Rock'),
  ('The Middle','Jimmy Eat World','Pop Punk'),
  ('Chicken Fried','Zac Brown Band','Country'),
  ('Country Girl (Shake It for Me)','Luke Bryan','Country'),
  ('First','Cold War Kids','Indie Rock'),
  ('My Own Worst Enemy','Lit','Pop Punk'),
  ('Tongue Tied','Grouplove','Indie Rock'),
  ('I Love It','Icona Pop','Electropop'),
  ('Ain''t No Rest for the Wicked','Cage the Elephant','Alt Rock'),
  ('Pink Pony Club','Chappell Roan','Pop'),
  ('Watermelon Sugar','Harry Styles','Pop'),
  ('Blinding Lights','The Weeknd','Synth Pop'),
  ('Ordinary','Alex Warren','Pop'),
  ('Panama','Van Halen','Hard Rock'),
  ('Tom Sawyer','Rush','Prog Rock');
*/

export default function Home() {
  const [songs, setSongs]           = useState<Song[]>(SEED_SONGS);
  const [requested, setRequested]   = useState<Set<number>>(new Set());
  const [suggestion, setSuggestion] = useState('');
  const [suggestedMsg, setSuggestedMsg] = useState('');
  const [search, setSearch]         = useState('');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load songs from Supabase ─────────────────────────────────────────────
  const loadSongs = async () => {
    try {
      const { data, error } = await supabase.from('songs').select('*').order('id');
      if (!error && data && data.length > 0) {
        setSongs(data);
        setDbConnected(true);
      }
    } catch (_) {
      // Falls back to seed data silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSongs();

    // Real-time: reflect played status changes from the dashboard instantly
    const songsSub = supabase
      .channel('songs-played-channel')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'songs' }, () => {
        loadSongs();
      })
      .subscribe();

    return () => { supabase.removeChannel(songsSub); };
  }, []);

  // ── Request a song ───────────────────────────────────────────────────────
  const handleRequest = async (song: Song) => {
    if (requested.has(song.id)) return;
    setRequested(prev => new Set(prev).add(song.id));

    if (dbConnected) {
      await supabase.from('requests').insert({ song_id: song.id });
    }
  };

  // ── Submit suggestion ────────────────────────────────────────────────────
  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;

    if (dbConnected) {
      await supabase.from('suggestions').insert({ title: suggestion.trim() });
    }

    setSuggestedMsg(`We'll look into "${suggestion.trim()}" for the next gig!`);
    setSuggestion('');
    setTimeout(() => setSuggestedMsg(''), 5000);
  };

  // ── Filtering ────────────────────────────────────────────────────────────
  const genres = Array.from(new Set(songs.map(s => s.genre))).sort();

  const filtered = songs.filter(s => {
    const matchesSearch = search === '' ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.artist.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = activeGenre === null || s.genre === activeGenre;
    return matchesSearch && matchesGenre;
  });

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: "'Barlow Condensed', 'Oswald', 'Impact', sans-serif",
      paddingBottom: '5rem',
    }}>
      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        ::placeholder { color: #555; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #f59e0b; border-radius: 2px; }

        .song-card {
          background: #111;
          border: 1px solid #222;
          border-radius: 10px;
          padding: 0.85rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          transition: border-color 0.15s, background 0.15s;
        }
        .song-card:hover { border-color: #333; background: #151515; }
        .song-card.done { border-color: #f59e0b33; background: #111a00; }

        .req-btn {
          background: #f59e0b;
          color: #000;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 0.8rem;
          letter-spacing: 0.08em;
          border: none;
          border-radius: 6px;
          padding: 0.45rem 0.85rem;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, transform 0.1s;
          flex-shrink: 0;
        }
        .req-btn:hover { background: #fbbf24; }
        .req-btn:active { transform: scale(0.95); }
        .req-btn.done {
          background: transparent;
          color: #f59e0b;
          border: 1px solid #f59e0b44;
          cursor: default;
        }

        .genre-pill {
          background: transparent;
          border: 1px solid #333;
          color: #888;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          padding: 0.3rem 0.7rem;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .genre-pill:hover { border-color: #f59e0b; color: #f59e0b; }
        .genre-pill.active { background: #f59e0b; border-color: #f59e0b; color: #000; }

        .tip-btn {
          display: inline-block;
          background: #f59e0b;
          color: #000;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 1.1rem;
          letter-spacing: 0.1em;
          text-decoration: none;
          padding: 0.8rem 2rem;
          border-radius: 999px;
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
          box-shadow: 0 0 24px rgba(245,158,11,0.25);
        }
        .tip-btn:hover { background: #fbbf24; box-shadow: 0 0 36px rgba(245,158,11,0.4); }
        .tip-btn:active { transform: scale(0.97); }

        .search-input {
          width: 100%;
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: #fff;
          font-family: 'Barlow', sans-serif;
          font-size: 0.95rem;
          padding: 0.65rem 1rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .search-input:focus { border-color: #f59e0b; }

        .suggest-input {
          flex: 1;
          background: #0a0a0a;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: #fff;
          font-family: 'Barlow', sans-serif;
          font-size: 0.9rem;
          padding: 0.65rem 1rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .suggest-input:focus { border-color: #f59e0b; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.25s ease forwards; }

        .divider {
          border: none;
          border-top: 1px solid #1a1a1a;
          margin: 0;
        }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        padding: '2.5rem 1.5rem 2rem',
        textAlign: 'center',
        borderBottom: '1px solid #1a1a1a',
        background: 'linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%)',
      }}>
        {/* Band name */}
        <div style={{ marginBottom: '0.25rem' }}>
          <span style={{
            fontSize: 'clamp(2.4rem, 9vw, 3.5rem)',
            fontWeight: 900,
            letterSpacing: '-0.01em',
            lineHeight: 1,
            color: '#fff',
            textTransform: 'uppercase',
          }}>URBAN KNIGHT&nbsp;</span>
          <span style={{
            fontSize: 'clamp(2.4rem, 9vw, 3.5rem)',
            fontWeight: 900,
            letterSpacing: '-0.01em',
            lineHeight: 1,
            color: '#f59e0b',
            textTransform: 'uppercase',
          }}>PUNKS</span>
        </div>

        <p style={{
          fontFamily: 'Barlow, sans-serif',
          color: '#555',
          fontSize: '0.7rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
        }}>Live Request Line</p>

        <a href={VENMO_URL} target="_blank" rel="noopener noreferrer" className="tip-btn">
          TIP THE BAND 💸
        </a>

        {!dbConnected && !loading && (
          <p style={{
            fontFamily: 'Barlow, sans-serif',
            color: '#555',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: '1rem',
          }}>Demo mode — add Supabase credentials to go live</p>
        )}
      </header>

      {/* ── Song List ── */}
      <section style={{ padding: '1.5rem 1rem 0', maxWidth: '480px', margin: '0 auto' }}>
        {/* Section heading */}
        <h2 style={{
          fontSize: '1rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#f59e0b',
          borderLeft: '3px solid #f59e0b',
          paddingLeft: '0.65rem',
          marginBottom: '1rem',
        }}>Request a Song</h2>

        {/* Search */}
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="Search songs or artists…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Genre filter pills */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          padding: '0.85rem 0',
          scrollbarWidth: 'none',
        }}>
          <button
            className={`genre-pill${activeGenre === null ? ' active' : ''}`}
            onClick={() => setActiveGenre(null)}
          >All</button>
          {genres.map(g => (
            <button
              key={g}
              className={`genre-pill${activeGenre === g ? ' active' : ''}`}
              onClick={() => setActiveGenre(activeGenre === g ? null : g)}
            >{g}</button>
          ))}
        </div>

        {/* Song cards */}
        {loading ? (
          <p style={{ fontFamily: 'Barlow, sans-serif', color: '#444', textAlign: 'center', padding: '2rem 0' }}>
            Loading setlist…
          </p>
        ) : filtered.length === 0 ? (
          <p style={{ fontFamily: 'Barlow, sans-serif', color: '#444', textAlign: 'center', padding: '2rem 0' }}>
            No songs match your search.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map((song, i) => {
              const isDone = requested.has(song.id);
              const isPlayed = !!song.played;
              return (
                <div
                  key={song.id}
                  className={`song-card fade-in${isDone ? ' done' : ''}`}
                  style={{ animationDelay: `${Math.min(i * 18, 300)}ms` }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: isDone ? '#f59e0b' : '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>{song.title}</div>
                    <div style={{
                      fontFamily: 'Barlow, sans-serif',
                      fontSize: '0.78rem',
                      color: '#666',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>{song.artist}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                      <div style={{
                        background: GENRE_COLORS[song.genre] + '22',
                        color: GENRE_COLORS[song.genre] ?? '#888',
                        fontFamily: 'Barlow Condensed, sans-serif',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '4px',
                      }}>{song.genre}</div>
                      {song.played && (
                        <div style={{
                          background: '#22c55e22',
                          color: '#22c55e',
                          fontFamily: 'Barlow Condensed, sans-serif',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '4px',
                        }}>✓ Played</div>
                      )}
                    </div>
                  </div>
                  <button
                    className={`req-btn${isDone || isPlayed ? ' done' : ''}`}
                    onClick={() => handleRequest(song)}
                    disabled={isDone || isPlayed}
                  >
                    {isPlayed ? '✓ PLAYED' : isDone ? '✓ SENT' : 'REQUEST'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Suggestion Box ── */}
      <section style={{ padding: '2rem 1rem 0', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{
          background: '#111',
          border: '1px solid #1e1e1e',
          borderRadius: '12px',
          padding: '1.25rem',
        }}>
          <h2 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: '1.05rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: '#f59e0b',
            marginBottom: '0.25rem',
          }}>Don't see your jam?</h2>
          <p style={{
            fontFamily: 'Barlow, sans-serif',
            color: '#555',
            fontSize: '0.82rem',
            marginBottom: '1rem',
          }}>Suggest a song and we might learn it for the next gig.</p>

          <form onSubmit={handleSuggest} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="suggest-input"
              type="text"
              value={suggestion}
              onChange={e => setSuggestion(e.target.value)}
              placeholder="Song Name & Artist"
            />
            <button
              type="submit"
              style={{
                background: '#f59e0b',
                color: '#000',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 700,
                fontSize: '0.85rem',
                letterSpacing: '0.08em',
                border: 'none',
                borderRadius: '8px',
                padding: '0 1rem',
                cursor: 'pointer',
                transition: 'background 0.15s',
                flexShrink: 0,
              }}
            >SEND</button>
          </form>

          {suggestedMsg && (
            <p className="fade-in" style={{
              fontFamily: 'Barlow, sans-serif',
              color: '#f59e0b',
              fontSize: '0.82rem',
              marginTop: '0.75rem',
            }}>{suggestedMsg}</p>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        textAlign: 'center',
        padding: '2.5rem 1rem 1rem',
        fontFamily: 'Barlow, sans-serif',
        fontSize: '0.65rem',
        color: '#2a2a2a',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
      }}>
        Urban Knight Punks · Live Request Line
      </footer>
    </main>
  );
}
