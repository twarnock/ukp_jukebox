'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type LeaderboardEntry = {
  song_id: number;
  title: string;
  artist: string;
  genre: string;
  count: number;
  played: boolean;
};

type Suggestion = {
  id: number;
  title: string;
  created_at: string;
};

type Song = {
  id: number;
  title: string;
  artist: string;
  genre: string;
  played: boolean;
  lyrics: string | null;
  chords: string | null;
  now_playing: boolean;
};

type BacklogSong = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  notes: string | null;
  status: 'requested' | 'learning' | 'ready';
  created_at: string;
};

const BACKLOG_STATUSES = ['requested', 'learning', 'ready'] as const;
const STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  learning: 'Learning',
  ready: 'Ready',
};
const STATUS_COLORS: Record<string, string> = {
  requested: '#0369a1',
  learning: '#a16207',
  ready: '#15803d',
};

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

export default function Dashboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [catalog, setCatalog] = useState<Song[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'catalog' | 'backlog'>('leaderboard');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [backlog, setBacklog] = useState<BacklogSong[]>([]);
  const [backlogForm, setBacklogForm] = useState({ title: '', artist: '', genre: '', notes: '', status: 'requested' as BacklogSong['status'] });
  const [addingBacklog, setAddingBacklog] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<Song | null>(null);
  const [npTab, setNpTab] = useState<'lyrics' | 'chords'>('lyrics');
  const [expandedSongId, setExpandedSongId] = useState<number | null>(null);
  const [editLyrics, setEditLyrics] = useState('');
  const [editChords, setEditChords] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const prevRanks = useRef<Record<number, number>>({});

  async function fetchData() {
    // Fetch requests joined with songs, grouped by song
    const { data: reqData } = await supabase
      .from('requests')
      .select('song_id, songs(title, artist, genre, played)');

    if (reqData) {
      const counts: Record<number, LeaderboardEntry> = {};
      for (const row of reqData as any[]) {
        const id = row.song_id;
        if (!counts[id]) {
          counts[id] = {
            song_id: id,
            title: row.songs?.title ?? 'Unknown',
            artist: row.songs?.artist ?? '',
            genre: row.songs?.genre ?? '',
            count: 0,
            played: row.songs?.played ?? false,
          };
        }
        counts[id].count++;
      }
      const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
      setLeaderboard(sorted);
      setTotalRequests(reqData.length);
    }

    // Fetch suggestions (newest first, last 20)
    const { data: sugData } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (sugData) setSuggestions(sugData);

    // Fetch full song catalog sorted by artist then title
    const { data: catalogData } = await supabase
      .from('songs')
      .select('id, title, artist, genre, played, lyrics, chords, now_playing')
      .order('artist', { ascending: true });

    if (catalogData) {
      setCatalog(catalogData as Song[]);
      const np = (catalogData as Song[]).find(s => s.now_playing) ?? null;
      setNowPlaying(np);
    }

    // Fetch backlog
    const { data: backlogData } = await supabase
      .from('backlog')
      .select('*')
      .order('created_at', { ascending: false });

    if (backlogData) setBacklog(backlogData as BacklogSong[]);

    setLastUpdated(new Date());
    setLoading(false);
  }

  const addBacklogSong = async () => {
    if (!backlogForm.title.trim() || !backlogForm.artist.trim()) return;
    setAddingBacklog(true);
    await supabase.from('backlog').insert({
      title: backlogForm.title.trim(),
      artist: backlogForm.artist.trim(),
      genre: backlogForm.genre.trim(),
      notes: backlogForm.notes.trim() || null,
      status: backlogForm.status,
    });
    setBacklogForm({ title: '', artist: '', genre: '', notes: '', status: 'requested' });
    setAddingBacklog(false);
    fetchData();
  };

  const updateBacklogStatus = async (id: string, status: BacklogSong['status']) => {
    await supabase.from('backlog').update({ status }).eq('id', id);
    fetchData();
  };

  const deleteBacklogSong = async (id: string) => {
    await supabase.from('backlog').delete().eq('id', id);
    fetchData();
  };

  const promoteToSetlist = async (song: BacklogSong) => {
    setPromotingId(song.id);
    await supabase.from('songs').insert({
      title: song.title,
      artist: song.artist,
      genre: song.genre || 'Rock',
      played: false,
    });
    await supabase.from('backlog').delete().eq('id', song.id);
    setPromotingId(null);
    fetchData();
  };

  const setNowPlayingSong = async (song: Song) => {
    await supabase.from('songs').update({ now_playing: false }).eq('now_playing', true);
    await supabase.from('songs').update({ now_playing: true }).eq('id', song.id);
    fetchData();
  };

  const clearNowPlaying = async () => {
    await supabase.from('songs').update({ now_playing: false }).eq('now_playing', true);
    fetchData();
  };

  const openEdit = (song: Song) => {
    setExpandedSongId(song.id);
    setEditLyrics(song.lyrics ?? '');
    setEditChords(song.chords ?? '');
  };

  const saveEdit = async (songId: number) => {
    setSavingEdit(true);
    await supabase.from('songs').update({ lyrics: editLyrics || null, chords: editChords || null }).eq('id', songId);
    setSavingEdit(false);
    setExpandedSongId(null);
    fetchData();
  };

  const [confirmClearPlayed, setConfirmClearPlayed] = useState(false);
  const [clearingPlayed, setClearingPlayed] = useState(false);
  const [confirmClearRequests, setConfirmClearRequests] = useState(false);
  const [clearingRequests, setClearingRequests] = useState(false);
  const [confirmClearSuggestions, setConfirmClearSuggestions] = useState(false);
  const [clearingSuggestions, setClearingSuggestions] = useState(false);

  const togglePlayed = async (songId: number, currentPlayed: boolean) => {
    await supabase.from('songs').update({ played: !currentPlayed }).eq('id', songId);
    fetchData();
  };

  const clearPlayed = async () => {
    setClearingPlayed(true);
    await supabase.from('songs').update({ played: false }).eq('played', true);
    setConfirmClearPlayed(false);
    setClearingPlayed(false);
    fetchData();
  };

  const clearRequests = async () => {
    setClearingRequests(true);
    await supabase.from('requests').delete().gte('id', 0);
    setConfirmClearRequests(false);
    setClearingRequests(false);
    fetchData();
  };

  const clearSuggestions = async () => {
    setClearingSuggestions(true);
    await supabase.from('suggestions').delete().gte('id', 0);
    setConfirmClearSuggestions(false);
    setClearingSuggestions(false);
    fetchData();
  };

  useEffect(() => {
    fetchData();

    // Real-time subscription on requests
    const requestSub = supabase
      .channel('requests-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, () => {
        fetchData();
      })
      .subscribe();

    // Real-time subscription on suggestions
    const suggestionSub = supabase
      .channel('suggestions-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suggestions' }, () => {
        fetchData();
      })
      .subscribe();

    // Real-time subscription on songs (played status)
    const songsSub = supabase
      .channel('songs-channel')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'songs' }, () => {
        fetchData();
      })
      .subscribe();

    // Fallback polling every 15s
    const interval = setInterval(fetchData, 15000);

    return () => {
      supabase.removeChannel(requestSub);
      supabase.removeChannel(suggestionSub);
      supabase.removeChannel(songsSub);
      clearInterval(interval);
    };
  }, []);

  // Track rank changes
  useEffect(() => {
    const newRanks: Record<number, number> = {};
    leaderboard.forEach((entry, i) => { newRanks[entry.song_id] = i; });
    prevRanks.current = newRanks;
  }, [leaderboard]);

  const maxCount = leaderboard[0]?.count ?? 1;

  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <main style={{
      minHeight: '100vh',
      background: '#080808',
      color: '#fff',
      fontFamily: "'Barlow Condensed', sans-serif",
      padding: '0 0 3rem',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes barGrow {
          from { width: 0%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .live-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e;
          animation: pulse 1.8s ease-in-out infinite;
          display: inline-block;
        }

        .bar-track {
          height: 6px;
          background: #1a1a1a;
          border-radius: 3px;
          overflow: hidden;
          margin-top: 0.4rem;
        }
        .bar-fill {
          height: 100%;
          border-radius: 3px;
          background: #f59e0b;
          animation: barGrow 0.6s ease forwards;
          transition: width 0.5s ease;
        }
        .bar-fill.top { background: linear-gradient(90deg, #f59e0b, #fcd34d); }

        .rank-num {
          font-size: 1.5rem;
          font-weight: 900;
          min-width: 2rem;
          text-align: right;
          line-height: 1;
        }
        .rank-num.top { color: #f59e0b; }
        .rank-num.rest { color: #333; }

        .song-row {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 0.9rem 1.25rem;
          border-bottom: 1px solid #111;
          animation: slideIn 0.3s ease forwards;
          transition: background 0.2s, opacity 0.2s;
        }
        .song-row:hover { background: #0f0f0f; }
        .song-row.top-3 { background: #0d0d00; }
        .song-row.top-3:hover { background: #121200; }
        .song-row.played { opacity: 0.5; }
        .song-row.played:hover { opacity: 0.75; }

        .played-btn { transition: all 0.15s; }
        .played-btn:hover { border-color: #22c55e55 !important; color: #22c55e !important; }

        .admin-btn { transition: all 0.15s; }
        .admin-btn:hover { border-color: #444 !important; color: #aaa !important; }

        .vote-badge {
          background: #1a1a1a;
          color: #f59e0b;
          font-weight: 700;
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }
        .vote-badge.top { background: #f59e0b22; }

        .genre-chip {
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.1rem 0.4rem;
          border-radius: 3px;
          display: inline-block;
        }

        .sug-card {
          background: #111;
          border: 1px solid #1a1a1a;
          border-radius: 8px;
          padding: 0.6rem 0.85rem;
          animation: fadeUp 0.25s ease forwards;
          opacity: 0;
        }

        .stat-box {
          background: #111;
          border: 1px solid #1a1a1a;
          border-radius: 10px;
          padding: 0.85rem 1.1rem;
          text-align: center;
        }
        .stat-num {
          font-size: 2rem;
          font-weight: 900;
          color: #f59e0b;
          line-height: 1;
        }
        .stat-label {
          font-family: 'Barlow', sans-serif;
          font-size: 0.65rem;
          color: #444;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-top: 0.25rem;
        }

        .section-label {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #f59e0b;
          border-left: 3px solid #f59e0b;
          padding-left: 0.6rem;
        }

        .empty-state {
          font-family: 'Barlow', sans-serif;
          color: #2a2a2a;
          text-align: center;
          padding: 3rem 1rem;
          font-size: 0.9rem;
        }

        .tab-btn {
          background: transparent;
          border: none;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 0.8rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.5rem 1rem;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s;
          color: #444;
        }
        .tab-btn:hover { color: #888; }
        .tab-btn.active { color: #f59e0b; border-bottom-color: #f59e0b; }

        .catalog-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 1rem;
          border-bottom: 1px solid #111;
          transition: background 0.15s, opacity 0.15s;
        }
        .catalog-row:hover { background: #0f0f0f; }
        .catalog-row.played { opacity: 0.45; }
        .catalog-row.played:hover { opacity: 0.7; }

        .catalog-search {
          background: #111;
          border: 1px solid #1a1a1a;
          border-radius: 6px;
          color: #ccc;
          font-family: 'Barlow', sans-serif;
          font-size: 0.85rem;
          padding: 0.45rem 0.75rem;
          width: 100%;
          outline: none;
          transition: border-color 0.15s;
        }
        .catalog-search:focus { border-color: #333; }
        .catalog-search::placeholder { color: #333; }

        .backlog-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.8rem 1rem;
          border-bottom: 1px solid #111;
          transition: background 0.15s;
        }
        .backlog-row:hover { background: #0f0f0f; }

        .backlog-input {
          background: #111;
          border: 1px solid #1a1a1a;
          border-radius: 6px;
          color: #ccc;
          font-family: 'Barlow', sans-serif;
          font-size: 0.85rem;
          padding: 0.4rem 0.65rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .backlog-input:focus { border-color: #333; }
        .backlog-input::placeholder { color: #333; }

        .status-btn {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 0.65rem;
          letter-spacing: 0.08em;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .del-btn {
          background: transparent;
          color: #333;
          border: 1px solid #1a1a1a;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 0.65rem;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .del-btn:hover { color: #dc2626; border-color: #dc262644; }

        .np-card {
          background: #0a0a00;
          border: 1px solid #f59e0b33;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          margin-bottom: 1rem;
        }
        .np-tab-btn {
          background: transparent;
          border: none;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.3rem 0.7rem;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s;
          color: #444;
        }
        .np-tab-btn:hover { color: #888; }
        .np-tab-btn.active { color: #f59e0b; border-bottom-color: #f59e0b; }

        .edit-textarea {
          background: #0d0d0d;
          border: 1px solid #1a1a1a;
          border-radius: 6px;
          color: #ccc;
          font-family: 'Barlow', monospace;
          font-size: 0.8rem;
          padding: 0.5rem 0.75rem;
          width: 100%;
          outline: none;
          resize: vertical;
          line-height: 1.5;
          transition: border-color 0.15s;
        }
        .edit-textarea:focus { border-color: #333; }
        .edit-textarea::placeholder { color: #333; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        background: '#0f0f0f',
        borderBottom: '1px solid #1a1a1a',
        padding: '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 900, lineHeight: 1, textTransform: 'uppercase' }}>
            URBAN KNIGHT <span style={{ color: '#f59e0b' }}>PUNKS</span>
          </div>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#444', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '0.2rem' }}>
            Band Dashboard
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="live-dot" />
          <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live</span>
          {lastUpdated && (
            <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#333', marginLeft: '0.5rem' }}>
              {fmt(lastUpdated)}
            </span>
          )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', maxWidth: '900px', margin: '0 auto' }}>
        <div className="stat-box">
          <div className="stat-num">{totalRequests}</div>
          <div className="stat-label">Total Requests</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{leaderboard.length}</div>
          <div className="stat-label">Songs Requested</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{catalog.filter(s => s.played).length}</div>
          <div className="stat-label">Songs Played</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{suggestions.length}</div>
          <div className="stat-label">Suggestions</div>
        </div>
      </div>

      {/* ── Now Playing card ── */}
      {nowPlaying && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.25rem' }}>
          <div className="np-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              {/* Left: song info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.6rem', color: '#f59e0b', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="live-dot" style={{ background: '#f59e0b' }} /> Now Playing
                </div>
                <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 900, lineHeight: 1, color: '#fff', marginBottom: '0.2rem' }}>{nowPlaying.title}</div>
                <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.85rem', color: '#666' }}>{nowPlaying.artist}</div>
              </div>
              {/* Right: clear button */}
              <button
                onClick={clearNowPlaying}
                style={{
                  background: 'transparent',
                  color: '#444',
                  border: '1px solid #222',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  letterSpacing: '0.06em',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                ✕ CLEAR
              </button>
            </div>

            {/* Lyrics / Chords tabs */}
            {(nowPlaying.lyrics || nowPlaying.chords) && (
              <div style={{ marginTop: '0.85rem' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a', marginBottom: '0.75rem' }}>
                  <button className={`np-tab-btn${npTab === 'lyrics' ? ' active' : ''}`} onClick={() => setNpTab('lyrics')}>Lyrics</button>
                  <button className={`np-tab-btn${npTab === 'chords' ? ' active' : ''}`} onClick={() => setNpTab('chords')}>Chords</button>
                </div>
                {npTab === 'lyrics' && (
                  <pre style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.85rem', color: '#aaa', whiteSpace: 'pre-wrap', maxHeight: '220px', overflowY: 'auto', lineHeight: 1.6, margin: 0 }}>
                    {nowPlaying.lyrics ?? <span style={{ color: '#333', fontStyle: 'italic' }}>No lyrics saved.</span>}
                  </pre>
                )}
                {npTab === 'chords' && (
                  <pre style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#f59e0b', whiteSpace: 'pre-wrap', maxHeight: '220px', overflowY: 'auto', lineHeight: 1.8, margin: 0 }}>
                    {nowPlaying.chords ?? <span style={{ color: '#333', fontFamily: 'Barlow, sans-serif', fontStyle: 'italic', fontSize: '0.85rem' }}>No chords saved.</span>}
                  </pre>
                )}
              </div>
            )}
            {!nowPlaying.lyrics && !nowPlaying.chords && (
              <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#333', marginTop: '0.6rem' }}>No lyrics or chords saved — add them in the Full Catalog tab.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Admin controls ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto 1rem', padding: '0 1.25rem' }}>
        <div style={{
          background: '#0d0d0d',
          border: '1px solid #1a1a00',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#555', letterSpacing: '0.15em', textTransform: 'uppercase', flex: '0 0 auto' }}>Admin</span>
          <div style={{ width: '1px', height: '1rem', background: '#222' }} />
          {confirmClearPlayed ? (
            <>
              <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#f59e0b' }}>Clear all played marks?</span>
              <button
                onClick={clearPlayed}
                disabled={clearingPlayed}
                style={{
                  background: '#dc262622',
                  color: '#dc2626',
                  border: '1px solid #dc262644',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  letterSpacing: '0.06em',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  cursor: clearingPlayed ? 'not-allowed' : 'pointer',
                  opacity: clearingPlayed ? 0.6 : 1,
                }}
              >
                {clearingPlayed ? 'CLEARING…' : 'YES, CLEAR'}
              </button>
              <button
                onClick={() => setConfirmClearPlayed(false)}
                style={{
                  background: 'transparent',
                  color: '#444',
                  border: '1px solid #222',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  letterSpacing: '0.06em',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
            </>
          ) : (
            <button
              className="admin-btn"
              onClick={() => setConfirmClearPlayed(true)}
              style={{
                background: 'transparent',
                color: '#555',
                border: '1px solid #222',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 700,
                fontSize: '0.7rem',
                letterSpacing: '0.06em',
                padding: '0.25rem 0.65rem',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              CLEAR PLAYED
            </button>
          )}
          <div style={{ width: '1px', height: '1rem', background: '#222' }} />
          {confirmClearRequests ? (
            <>
              <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#f59e0b' }}>Clear all request votes?</span>
              <button
                onClick={clearRequests}
                disabled={clearingRequests}
                style={{
                  background: '#dc262622',
                  color: '#dc2626',
                  border: '1px solid #dc262644',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  letterSpacing: '0.06em',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  cursor: clearingRequests ? 'not-allowed' : 'pointer',
                  opacity: clearingRequests ? 0.6 : 1,
                }}
              >
                {clearingRequests ? 'CLEARING…' : 'YES, CLEAR'}
              </button>
              <button
                onClick={() => setConfirmClearRequests(false)}
                style={{
                  background: 'transparent',
                  color: '#444',
                  border: '1px solid #222',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  letterSpacing: '0.06em',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
            </>
          ) : (
            <button
              className="admin-btn"
              onClick={() => setConfirmClearRequests(true)}
              style={{
                background: 'transparent',
                color: '#555',
                border: '1px solid #222',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 700,
                fontSize: '0.7rem',
                letterSpacing: '0.06em',
                padding: '0.25rem 0.65rem',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              CLEAR REQUESTS
            </button>
          )}
          <div style={{ width: '1px', height: '1rem', background: '#222' }} />
          {confirmClearSuggestions ? (
            <>
              <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#f59e0b' }}>Clear all suggestions?</span>
              <button
                onClick={clearSuggestions}
                disabled={clearingSuggestions}
                style={{
                  background: '#dc262622',
                  color: '#dc2626',
                  border: '1px solid #dc262644',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  letterSpacing: '0.06em',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  cursor: clearingSuggestions ? 'not-allowed' : 'pointer',
                  opacity: clearingSuggestions ? 0.6 : 1,
                }}
              >
                {clearingSuggestions ? 'CLEARING…' : 'YES, CLEAR'}
              </button>
              <button
                onClick={() => setConfirmClearSuggestions(false)}
                style={{
                  background: 'transparent',
                  color: '#444',
                  border: '1px solid #222',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  letterSpacing: '0.06em',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
            </>
          ) : (
            <button
              className="admin-btn"
              onClick={() => setConfirmClearSuggestions(true)}
              style={{
                background: 'transparent',
                color: '#555',
                border: '1px solid #222',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 700,
                fontSize: '0.7rem',
                letterSpacing: '0.06em',
                padding: '0.25rem 0.65rem',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              CLEAR SUGGESTIONS
            </button>
          )}
        </div>
      </div>

      {/* ── Tab nav ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.25rem', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '0' }}>
        <button className={`tab-btn${activeTab === 'leaderboard' ? ' active' : ''}`} onClick={() => setActiveTab('leaderboard')}>Requests</button>
        <button className={`tab-btn${activeTab === 'catalog' ? ' active' : ''}`} onClick={() => setActiveTab('catalog')}>Full Catalog</button>
        <button className={`tab-btn${activeTab === 'backlog' ? ' active' : ''}`} onClick={() => setActiveTab('backlog')}>Backlog {backlog.length > 0 && `(${backlog.length})`}</button>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.25rem', display: activeTab === 'leaderboard' ? 'grid' : 'block', gridTemplateColumns: '1fr minmax(0, 320px)', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── Backlog tab ── */}
        {activeTab === 'backlog' && (
          <div style={{ paddingTop: '1rem' }}>

            {/* Add form */}
            <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
              <div className="section-label" style={{ marginBottom: '0.85rem' }}>Add to Backlog</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  className="backlog-input"
                  placeholder="Song title *"
                  value={backlogForm.title}
                  onChange={e => setBacklogForm(f => ({ ...f, title: e.target.value }))}
                />
                <input
                  className="backlog-input"
                  placeholder="Artist *"
                  value={backlogForm.artist}
                  onChange={e => setBacklogForm(f => ({ ...f, artist: e.target.value }))}
                />
                <input
                  className="backlog-input"
                  placeholder="Genre (optional)"
                  value={backlogForm.genre}
                  onChange={e => setBacklogForm(f => ({ ...f, genre: e.target.value }))}
                />
                <select
                  className="backlog-input"
                  value={backlogForm.status}
                  onChange={e => setBacklogForm(f => ({ ...f, status: e.target.value as BacklogSong['status'] }))}
                  style={{ cursor: 'pointer' }}
                >
                  {BACKLOG_STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <input
                className="backlog-input"
                placeholder="Notes (optional)"
                value={backlogForm.notes}
                onChange={e => setBacklogForm(f => ({ ...f, notes: e.target.value }))}
                style={{ width: '100%', marginBottom: '0.5rem' }}
              />
              <button
                onClick={addBacklogSong}
                disabled={addingBacklog || !backlogForm.title.trim() || !backlogForm.artist.trim()}
                style={{
                  background: backlogForm.title.trim() && backlogForm.artist.trim() ? '#f59e0b22' : 'transparent',
                  color: backlogForm.title.trim() && backlogForm.artist.trim() ? '#f59e0b' : '#333',
                  border: `1px solid ${backlogForm.title.trim() && backlogForm.artist.trim() ? '#f59e0b44' : '#1a1a1a'}`,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.06em',
                  padding: '0.35rem 1rem',
                  borderRadius: '6px',
                  cursor: addingBacklog || !backlogForm.title.trim() || !backlogForm.artist.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {addingBacklog ? 'ADDING…' : '+ ADD SONG'}
              </button>
            </div>

            {/* Backlog list */}
            {loading ? (
              <div className="empty-state">Loading…</div>
            ) : backlog.length === 0 ? (
              <div className="empty-state">No songs in the backlog yet.</div>
            ) : (
              <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '12px', overflow: 'hidden' }}>
                {backlog.map(song => {
                  const statusColor = STATUS_COLORS[song.status];
                  const nextStatus = BACKLOG_STATUSES[BACKLOG_STATUSES.indexOf(song.status) + 1];
                  const genreColor = GENRE_COLORS[song.genre] ?? '#888';
                  return (
                    <div key={song.id} className="backlog-row">
                      {/* Status badge — click to advance */}
                      <button
                        className="status-btn"
                        onClick={() => nextStatus && updateBacklogStatus(song.id, nextStatus)}
                        title={nextStatus ? `Advance to ${STATUS_LABELS[nextStatus]}` : 'Ready — promote to setlist'}
                        style={{
                          background: statusColor + '22',
                          color: statusColor,
                          border: `1px solid ${statusColor}44`,
                          cursor: nextStatus ? 'pointer' : 'default',
                          flexShrink: 0,
                        }}
                      >
                        {STATUS_LABELS[song.status]}
                      </button>

                      {/* Song info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                        <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#555' }}>{song.artist}{song.notes && <span style={{ color: '#333', marginLeft: '0.5rem' }}>— {song.notes}</span>}</div>
                      </div>

                      {song.genre && (
                        <span className="genre-chip" style={{ background: genreColor + '22', color: genreColor, flexShrink: 0 }}>{song.genre}</span>
                      )}

                      {/* Promote button (only when ready) */}
                      {song.status === 'ready' && (
                        <button
                          onClick={() => promoteToSetlist(song)}
                          disabled={promotingId === song.id}
                          style={{
                            background: '#22c55e22',
                            color: '#22c55e',
                            border: '1px solid #22c55e44',
                            fontFamily: 'Barlow Condensed, sans-serif',
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            letterSpacing: '0.06em',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            cursor: promotingId === song.id ? 'not-allowed' : 'pointer',
                            opacity: promotingId === song.id ? 0.6 : 1,
                            flexShrink: 0,
                          }}
                        >
                          {promotingId === song.id ? '…' : '→ SETLIST'}
                        </button>
                      )}

                      <button className="del-btn" onClick={() => deleteBacklogSong(song.id)}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Catalog tab ── */}
        {activeTab === 'catalog' && (() => {
          const q = catalogSearch.toLowerCase();
          const filtered = catalog.filter(s =>
            s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
          );
          return (
            <div style={{ paddingTop: '1rem' }}>
              <div style={{ marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="section-label" style={{ whiteSpace: 'nowrap' }}>Song Catalog</div>
                <input
                  className="catalog-search"
                  placeholder="Search title or artist…"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                />
                <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#333', whiteSpace: 'nowrap' }}>{filtered.length} / {catalog.length}</span>
              </div>
              {loading ? (
                <div className="empty-state">Loading…</div>
              ) : (
                <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '12px', overflow: 'hidden' }}>
                  {filtered.map(song => {
                    const genreColor = GENRE_COLORS[song.genre] ?? '#888';
                    return (
                      <div key={song.id}>
                        <div className={`catalog-row${song.played ? ' played' : ''}`}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                            <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</div>
                          </div>
                          <span className="genre-chip" style={{ background: genreColor + '22', color: genreColor, flexShrink: 0 }}>{song.genre}</span>
                          {/* Now playing button */}
                          <button
                            onClick={() => song.now_playing ? clearNowPlaying() : setNowPlayingSong(song)}
                            title={song.now_playing ? 'Stop now playing' : 'Set as now playing'}
                            style={{
                              background: song.now_playing ? '#f59e0b22' : 'transparent',
                              color: song.now_playing ? '#f59e0b' : '#444',
                              border: `1px solid ${song.now_playing ? '#f59e0b44' : '#222'}`,
                              fontFamily: 'Barlow Condensed, sans-serif',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >▶</button>
                          {/* Edit lyrics/chords */}
                          <button
                            onClick={() => expandedSongId === song.id ? setExpandedSongId(null) : openEdit(song)}
                            style={{
                              background: expandedSongId === song.id ? '#22222255' : 'transparent',
                              color: (song.lyrics || song.chords) ? '#888' : '#333',
                              border: '1px solid #222',
                              fontFamily: 'Barlow Condensed, sans-serif',
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              letterSpacing: '0.06em',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >{expandedSongId === song.id ? '▲' : (song.lyrics || song.chords ? '✎' : '+ WORDS')}</button>
                          <button
                            className="played-btn"
                            onClick={() => togglePlayed(song.id, song.played)}
                            style={{
                              background: song.played ? '#22c55e22' : 'transparent',
                              color: song.played ? '#22c55e' : '#444',
                              border: `1px solid ${song.played ? '#22c55e55' : '#222'}`,
                              fontFamily: 'Barlow Condensed, sans-serif',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              letterSpacing: '0.06em',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            {song.played ? '✓ PLAYED' : 'PLAYED?'}
                          </button>
                        </div>
                        {/* Inline lyrics/chords editor */}
                        {expandedSongId === song.id && (
                          <div style={{ padding: '0.75rem 1rem', background: '#080808', borderBottom: '1px solid #111' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                              <div>
                                <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Lyrics</div>
                                <textarea
                                  className="edit-textarea"
                                  rows={8}
                                  placeholder="Paste lyrics here…"
                                  value={editLyrics}
                                  onChange={e => setEditLyrics(e.target.value)}
                                />
                              </div>
                              <div>
                                <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Chords</div>
                                <textarea
                                  className="edit-textarea"
                                  rows={8}
                                  placeholder="e.g. | Am | F | C | G |"
                                  value={editChords}
                                  onChange={e => setEditChords(e.target.value)}
                                />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => saveEdit(song.id)}
                                disabled={savingEdit}
                                style={{
                                  background: '#f59e0b22',
                                  color: '#f59e0b',
                                  border: '1px solid #f59e0b44',
                                  fontFamily: 'Barlow Condensed, sans-serif',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  letterSpacing: '0.06em',
                                  padding: '0.3rem 0.85rem',
                                  borderRadius: '4px',
                                  cursor: savingEdit ? 'not-allowed' : 'pointer',
                                  opacity: savingEdit ? 0.6 : 1,
                                }}
                              >{savingEdit ? 'SAVING…' : 'SAVE'}</button>
                              <button
                                onClick={() => setExpandedSongId(null)}
                                style={{
                                  background: 'transparent',
                                  color: '#444',
                                  border: '1px solid #222',
                                  fontFamily: 'Barlow Condensed, sans-serif',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  letterSpacing: '0.06em',
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >CANCEL</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Leaderboard ── */}
        {activeTab === 'leaderboard' && <div>
          <div className="section-label" style={{ marginBottom: '0.85rem' }}>Song Requests</div>

          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-state">No requests yet — share the QR code!</div>
          ) : (
            <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '12px', overflow: 'hidden' }}>
              {leaderboard.map((entry, i) => {
                const isTop = i < 3;
                const pct = Math.round((entry.count / maxCount) * 100);
                const genreColor = GENRE_COLORS[entry.genre] ?? '#888';
                return (
                  <div
                    key={entry.song_id}
                    className={`song-row${isTop ? ' top-3' : ''}${entry.played ? ' played' : ''}`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {/* Rank */}
                    <div className={`rank-num ${isTop ? 'top' : 'rest'}`}>
                      {i === 0 ? '①' : i === 1 ? '②' : i === 2 ? '③' : i + 1}
                    </div>

                    {/* Song info + bar */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: isTop ? '#fff' : '#ccc',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>{entry.title}</div>
                          <div style={{
                            fontFamily: 'Barlow, sans-serif',
                            fontSize: '0.75rem',
                            color: '#555',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>{entry.artist}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                          <span className="genre-chip" style={{ background: genreColor + '22', color: genreColor }}>{entry.genre}</span>
                          <span className={`vote-badge${isTop ? ' top' : ''}`}>{entry.count} {entry.count === 1 ? 'vote' : 'votes'}</span>
                          <button
                            onClick={() => {
                              const song = catalog.find(s => s.id === entry.song_id);
                              if (song) setNowPlayingSong(song);
                            }}
                            style={{
                              background: nowPlaying?.song_id === entry.song_id || nowPlaying?.id === entry.song_id ? '#f59e0b22' : 'transparent',
                              color: nowPlaying?.id === entry.song_id ? '#f59e0b' : '#444',
                              border: `1px solid ${nowPlaying?.id === entry.song_id ? '#f59e0b44' : '#222'}`,
                              fontFamily: 'Barlow Condensed, sans-serif',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              letterSpacing: '0.06em',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ▶
                          </button>
                          <button
                            className="played-btn"
                            onClick={() => togglePlayed(entry.song_id, entry.played)}
                            style={{
                              background: entry.played ? '#22c55e22' : 'transparent',
                              color: entry.played ? '#22c55e' : '#444',
                              border: `1px solid ${entry.played ? '#22c55e55' : '#222'}`,
                              fontFamily: 'Barlow Condensed, sans-serif',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              letterSpacing: '0.06em',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {entry.played ? '✓ PLAYED' : 'PLAYED?'}
                          </button>
                        </div>
                      </div>
                      <div className="bar-track">
                        <div className={`bar-fill${isTop ? ' top' : ''}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>}

        {/* ── Suggestions panel ── */}
        {activeTab === 'leaderboard' && <div>
          <div className="section-label" style={{ marginBottom: '0.85rem' }}>Song Suggestions</div>

          {loading ? (
            <div className="empty-state" style={{ padding: '2rem' }}>Loading…</div>
          ) : suggestions.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>No suggestions yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {suggestions.map((s, i) => (
                <div key={s.id} className="sug-card" style={{ animationDelay: `${i * 25}ms` }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ddd' }}>{s.title}</div>
                  <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.65rem', color: '#333', marginTop: '0.2rem' }}>
                    {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>}
      </div>
    </main>
  );
}
