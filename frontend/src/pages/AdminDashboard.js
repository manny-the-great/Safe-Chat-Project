import React, { useState, useEffect } from 'react';
import { fetchModerationLog, overrideModeration, banUser, fetchAdminStats } from '../services/api';
import { format } from 'timeago.js';
import toast from 'react-hot-toast';

const LAYER_LABELS = {
  LAYER_1_PROFANITY: '⚡ L1 Profanity',
  LAYER_2_THREAT: '🔫 L2 Threat',
  LAYER_3_ML_MODEL: '🧠 L3 ML Model',
  LAYER_4_SENTIMENT: '💭 L4 Sentiment',
  // legacy
  LAYER_2_ML_MODEL: '🧠 L2 ML Model',
  LAYER_3_SENTIMENT: '💭 L3 Sentiment',
  USER_BANNED: '🔨 Banned',
};
const LAYER_COLORS = {
  LAYER_1_PROFANITY: 'var(--danger)',
  LAYER_2_THREAT: '#ff7849',
  LAYER_3_ML_MODEL: 'var(--warning)',
  LAYER_4_SENTIMENT: 'var(--accent)',
  LAYER_2_ML_MODEL: 'var(--warning)',
  LAYER_3_SENTIMENT: 'var(--accent)',
  USER_BANNED: 'var(--danger)',
};

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '18px 20px',
      borderTop: `3px solid ${color || 'var(--accent)'}`,
    }}>
      <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: color || 'var(--text)', fontFamily: 'var(--mono)', letterSpacing: '-1px' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ label, val, total, color }) {
  const pct = total > 0 ? Math.round((val / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</span>
        <span style={{ color, fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)' }}>{val} ({pct}%)</span>
      </div>
      <div style={{ height: 7, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: color, borderRadius: 4,
          width: `${pct}%`, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('flagged');
  const [log, setLog] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [confirmBan, setConfirmBan] = useState(null);

  useEffect(() => {
    fetchAdminStats().then((r) => setStats(r.data)).catch(() => { });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchModerationLog(page, filter)
      .then((r) => {
        setLog((prev) => page === 1 ? r.data.results : [...prev, ...r.data.results]);
        setHasMore(!!r.data.next);
      })
      .catch(() => toast.error('Failed to load moderation log'))
      .finally(() => setLoading(false));
  }, [page, filter]);

  const changeFilter = (f) => { setFilter(f); setPage(1); setLog([]); };

  const handleOverride = async (id, action) => {
    try {
      await overrideModeration(id, action);
      setLog((prev) => prev.map((e) => e.id === id ? { ...e, status: action === 'approve' ? 'overridden_approved' : 'rejected' } : e));
      toast.success(action === 'approve' ? '✅ Content approved and published' : 'Decision unchanged');
    } catch { toast.error('Override failed'); }
  };

  const handleBan = async (userId, username) => {
    try {
      await banUser(userId, 'Manually banned by admin');
      toast.success(`@${username} has been suspended`);
      setConfirmBan(null);
    } catch { toast.error('Ban failed'); }
  };

  const totalContent = (stats?.total_posts || 0) + (stats?.total_comments || 0) + (stats?.total_blocked || 0);

  return (
    <div>
      {/* Sticky header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0,
        background: 'rgba(8,8,16,0.88)', backdropFilter: 'blur(16px)', zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>🛡️ Admin Dashboard</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>SafeChat Moderation Center</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, color: 'var(--success)', fontFamily: 'var(--mono)', fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Stats row */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <StatCard icon="📝" label="Total Posts" value={stats.total_posts} color="var(--accent)" />
            <StatCard icon="🚫" label="Blocked Content" value={stats.total_blocked} color="var(--danger)" sub={`${stats.toxicity_rate}% of all content`} />
            <StatCard icon="👥" label="Total Users" value={stats.total_users} color="var(--info)" />
            <StatCard icon="🔨" label="Suspended Users" value={stats.banned_users} color="var(--warning)" />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          {[
            ['flagged', '🚩 Flagged Content'],
            ['analytics', '📈 Analytics'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: '8px 20px', borderRadius: 'var(--radius-full)',
                fontWeight: 600, fontSize: 13,
                background: tab === id ? 'var(--accent)' : 'var(--surface)',
                color: tab === id ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${tab === id ? 'var(--accent)' : 'var(--border)'}`,
                boxShadow: tab === id ? '0 2px 12px rgba(124,109,250,0.3)' : 'none',
                transition: 'var(--transition)',
                cursor: 'pointer',
              }}
            >{label}</button>
          ))}
        </div>

        {/* ─── FLAGGED TAB ─── */}
        {tab === 'flagged' && (
          <>
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['all', 'All'], ['rejected', 'Rejected'], ['overridden_approved', 'Overridden']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => changeFilter(val)}
                  style={{
                    padding: '5px 16px', borderRadius: 'var(--radius-full)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: filter === val ? 'var(--accent-glow2)' : 'transparent',
                    color: filter === val ? 'var(--accent)' : 'var(--text-muted)',
                    border: `1px solid ${filter === val ? 'rgba(124,109,250,0.4)' : 'var(--border)'}`,
                    transition: 'var(--transition)',
                  }}
                >{label}</button>
              ))}
            </div>

            {loading && page === 1 ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {log.map((entry) => {
                  const layerColor = LAYER_COLORS[entry.rejection_layer] || 'var(--accent)';
                  const isRejected = entry.status === 'rejected';
                  return (
                    <div
                      key={entry.id}
                      className="fade-in"
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${isRejected ? 'var(--danger)' : 'var(--success)'}`,
                        borderRadius: 'var(--radius)',
                        padding: '14px 16px',
                        transition: 'var(--transition)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        {/* Left: content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Meta row */}
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{entry.author?.display_name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>@{entry.author?.username}</span>
                            {entry.rejection_layer && (
                              <span style={{
                                fontSize: 10, padding: '2px 9px', borderRadius: 'var(--radius-full)',
                                background: `${layerColor}15`, color: layerColor,
                                border: `1px solid ${layerColor}35`, fontWeight: 600,
                              }}>
                                {LAYER_LABELS[entry.rejection_layer] || entry.rejection_layer}
                              </span>
                            )}
                            <span style={{
                              fontSize: 10, padding: '2px 9px', borderRadius: 'var(--radius-full)',
                              fontFamily: 'var(--mono)',
                              background: 'var(--bg-elevated)',
                              color: entry.toxicity_score > 0.7
                                ? 'var(--danger)'
                                : entry.toxicity_score > 0.4
                                  ? 'var(--warning)'
                                  : 'var(--success)',
                              border: '1px solid var(--border)',
                            }}>
                              {(entry.toxicity_score * 100).toFixed(0)}% toxic
                            </span>
                            {entry.auto_banned && (
                              <span style={{ fontSize: 10, padding: '2px 9px', borderRadius: 'var(--radius-full)', background: 'rgba(255,71,102,0.15)', color: 'var(--danger)', border: '1px solid rgba(255,71,102,0.3)', fontWeight: 700 }}>
                                🔨 AUTO-BANNED
                              </span>
                            )}
                            {entry.status === 'overridden_approved' && (
                              <span style={{ fontSize: 10, padding: '2px 9px', borderRadius: 'var(--radius-full)', background: 'rgba(16,217,160,0.12)', color: 'var(--success)', border: '1px solid rgba(16,217,160,0.25)', fontWeight: 700 }}>
                                ✓ OVERRIDDEN
                              </span>
                            )}
                            <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 'auto' }}>{format(entry.created_at)}</span>
                          </div>

                          {/* Blocked content */}
                          <div style={{
                            background: 'var(--bg-elevated)', padding: '10px 14px',
                            borderRadius: 'var(--radius)', color: 'var(--text-secondary)',
                            fontSize: 13, fontStyle: 'italic', marginBottom: 6,
                            borderLeft: '2px solid rgba(255,71,102,0.4)',
                          }}>
                            "{entry.content}"
                          </div>

                          <div style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>⚠️</span>
                            <span>{entry.rejection_reason}</span>
                          </div>

                          {entry.violation_count > 1 && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                              Violation #{entry.violation_count} for this user · {entry.content_type}
                            </div>
                          )}
                        </div>

                        {/* Right: actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                          {isRejected && (
                            <button
                              onClick={() => handleOverride(entry.id, 'approve')}
                              style={{
                                padding: '7px 14px', background: 'rgba(16,217,160,0.1)',
                                color: 'var(--success)', border: '1px solid rgba(16,217,160,0.3)',
                                borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                transition: 'var(--transition)',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16,217,160,0.2)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(16,217,160,0.1)'}
                            >Override ✓</button>
                          )}
                          <button
                            onClick={() => setConfirmBan({ id: entry.author?.id, username: entry.author?.username })}
                            style={{
                              padding: '7px 14px', background: 'rgba(255,71,102,0.08)',
                              color: 'var(--danger)', border: '1px solid rgba(255,71,102,0.25)',
                              borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              transition: 'var(--transition)',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,71,102,0.18)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,71,102,0.08)'}
                          >Ban User</button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {hasMore && (
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loading}
                    style={{
                      padding: '12px', background: 'var(--surface)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                      color: 'var(--accent)', fontWeight: 600, cursor: 'pointer',
                    }}
                  >Load more</button>
                )}

                {log.length === 0 && !loading && (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>Clean as a whistle</div>
                    <div style={{ marginTop: 6, fontSize: 13 }}>No entries in this category</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ─── ANALYTICS TAB ─── */}
        {tab === 'analytics' && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Classification breakdown */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <h3 style={{ color: 'var(--text)', marginBottom: 20, fontSize: 15, fontWeight: 700 }}>🎯 Detection Breakdown</h3>
              <ProgressBar label="✅ Safe Content" val={stats.total_posts + (stats.total_comments || 0)} total={totalContent} color="var(--success)" />
              <ProgressBar label="⚡ L1 Profanity" val={stats.blocked_by_layer?.layer1 || 0} total={totalContent} color="var(--danger)" />
              <ProgressBar label="🔫 L2 Threat Detection" val={stats.blocked_by_layer?.layer2 || 0} total={totalContent} color="#ff7849" />
              <ProgressBar label="🧠 L3 ML Model" val={stats.blocked_by_layer?.layer3 || 0} total={totalContent} color="var(--warning)" />
              <ProgressBar label="💭 L4 Sentiment Guard" val={stats.blocked_by_layer?.layer4 || 0} total={totalContent} color="var(--accent)" />
            </div>

            {/* Platform overview */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <h3 style={{ color: 'var(--text)', marginBottom: 20, fontSize: 15, fontWeight: 700 }}>🌐 Platform Overview</h3>
              {[
                ['👥 Total Users', stats.total_users, 'var(--info)'],
                ['🟢 Active Today', stats.active_today, 'var(--success)'],
                ['📝 Total Posts', stats.total_posts, 'var(--text)'],
                ['💬 Total Comments', stats.total_comments, 'var(--text)'],
                ['🚫 Total Blocked', stats.total_blocked, 'var(--danger)'],
                ['✅ Content Safe Rate', `${100 - parseFloat(stats.toxicity_rate || 0)}%`, 'var(--success)'],
                ['🔨 Suspended Users', stats.banned_users, 'var(--warning)'],
              ].map(([label, val, color]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid rgba(28,28,56,0.5)',
                }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</span>
                  <span style={{ color, fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 14 }}>{val ?? '—'}</span>
                </div>
              ))}
            </div>

            {/* Toxicity rate gauge */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, gridColumn: '1 / -1' }}>
              <h3 style={{ color: 'var(--text)', marginBottom: 16, fontSize: 15, fontWeight: 700 }}>📊 Moderation Effectiveness</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, textAlign: 'center' }}>
                {[
                  { label: 'Content Safe Rate', val: `${Math.max(0, 100 - parseFloat(stats.toxicity_rate || 0)).toFixed(1)}%`, color: 'var(--success)', icon: '✅' },
                  { label: 'Toxicity Rate', val: `${stats.toxicity_rate || 0}%`, color: 'var(--danger)', icon: '🚨' },
                  { label: 'Auto-Ban Rate', val: stats.total_blocked > 0 ? `${((stats.banned_users / stats.total_users) * 100).toFixed(1)}%` : '0%', color: 'var(--warning)', icon: '🔨' },
                ].map((item) => (
                  <div key={item.label} style={{ padding: 20, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{item.icon}</div>
                    <div style={{ fontSize: 30, fontWeight: 900, color: item.color, fontFamily: 'var(--mono)', letterSpacing: '-1px' }}>{item.val}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ban confirmation modal */}
      {confirmBan && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }} onClick={() => setConfirmBan(null)}>
          <div
            className="scale-pop"
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)', padding: 28, maxWidth: 360, width: '90%',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>🔨</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', textAlign: 'center', marginBottom: 10 }}>Suspend User?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
              This will prevent <strong style={{ color: 'var(--text)' }}>@{confirmBan.username}</strong> from posting or commenting on SafeChat.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmBan(null)}
                style={{
                  flex: 1, padding: '11px', background: 'var(--surface-hover)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  color: 'var(--text)', fontWeight: 600, cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={() => handleBan(confirmBan.id, confirmBan.username)}
                style={{
                  flex: 1, padding: '11px',
                  background: 'linear-gradient(135deg, #ff4766, #ff7849)',
                  border: 'none', borderRadius: 'var(--radius)',
                  color: '#fff', fontWeight: 700, cursor: 'pointer',
                }}
              >Suspend</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
