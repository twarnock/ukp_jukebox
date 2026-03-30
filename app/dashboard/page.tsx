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
  const [totalRequests, setTotalRequests] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
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
    setLastUpdated(new Date());
    setLoading(false);
  }

  const [confirmClearPlayed, setConfirmClearPlayed] = useState(false);
  const [clearingPlayed, setClearingPlayed] = useState(false);
  const [confirmClearRequests, setConfirmClearRequests] = useState(false);
  const [clearingRequests, setClearingRequests] = useState(false);

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
      <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', maxWidth: '900px', margin: '0 auto' }}>
        <div className="stat-box">
          <div className="stat-num">{totalRequests}</div>
          <div className="stat-label">Total Requests</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{leaderboard.length}</div>
          <div className="stat-label">Songs Requested</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{suggestions.length}</div>
          <div className="stat-label">Suggestions</div>
        </div>
      </div>

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
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.25rem', display: 'grid', gridTemplateColumns: '1fr minmax(0, 320px)', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── Leaderboard ── */}
        <div>
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
        </div>

        {/* ── Suggestions panel ── */}
        <div>
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
        </div>
      </div>
    </main>
  );
}
