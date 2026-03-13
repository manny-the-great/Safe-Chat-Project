import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markAllRead, markNotifRead } from '../services/api';
import { format } from 'timeago.js';
import toast from 'react-hot-toast';

const AVATAR_COLORS = ['#7c6dfa', '#ff6b9d', '#10d9a0', '#ffad00', '#38bdf8', '#f472b6'];
const getColor = (str = '') => AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const TYPE_CONFIG = {
  like_post:    { icon: '❤️',  label: 'liked your post',          accent: 'var(--danger)' },
  like_comment: { icon: '❤️',  label: 'liked your comment',       accent: 'var(--danger)' },
  comment:      { icon: '💬',  label: 'commented on your post',   accent: 'var(--info)' },
  reply:        { icon: '↩️',  label: 'replied to your comment',  accent: 'var(--accent)' },
  follow:       { icon: '➕',  label: 'started following you',    accent: 'var(--success)' },
};

function NotifCard({ notif, onRead, onNavigate }) {
  const config = TYPE_CONFIG[notif.notif_type] || { icon: '🔔', label: notif.notif_type, accent: 'var(--accent)' };
  const avatarBg = `linear-gradient(135deg, ${getColor(notif.actor?.username)}, #a78bfa)`;
  const [hov, setHov] = useState(false);

  const handleClick = () => {
    if (!notif.is_read) onRead(notif.id);
    if (notif.post_id) onNavigate(`/post/${notif.post_id}`);
  };

  return (
    <div
      className="fade-in"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={handleClick}
      style={{
        display: 'flex',
        gap: 14,
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        cursor: notif.post_id ? 'pointer' : 'default',
        background: !notif.is_read
          ? 'rgba(124,109,250,0.05)'
          : hov ? 'var(--surface-hover)' : 'transparent',
        transition: 'background 0.15s',
        position: 'relative',
      }}
    >
      {/* Unread dot */}
      {!notif.is_read && (
        <div style={{
          position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
          width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)',
          boxShadow: '0 0 8px var(--accent)',
        }} />
      )}

      {/* Actor avatar with type icon overlay */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 46, height: 46, borderRadius: '50%',
          background: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 15, color: '#fff',
        }}>
          {(notif.actor?.display_name || notif.actor?.username || '?').slice(0, 2).toUpperCase()}
        </div>
        {/* Type icon badge */}
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, border: `2px solid var(--bg)`,
        }}>
          {config.icon}
        </div>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, marginBottom: 3 }}>
          <span style={{ fontWeight: 700 }}>{notif.actor?.display_name || notif.actor?.username}</span>
          {' '}
          <span style={{ color: 'var(--text-secondary)' }}>{config.label}</span>
        </div>
        {notif.post_content && (
          <div style={{
            fontSize: 13, color: 'var(--text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 340,
            fontStyle: 'italic',
          }}>
            "{notif.post_content}{notif.post_content.length >= 80 ? '…' : ''}"
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--mono)' }}>
          {format(notif.created_at)}
        </div>
      </div>
    </div>
  );
}

function SkeletonNotif() {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
      <div className="skeleton" style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 13, width: '60%', borderRadius: 6, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 6 }} />
      </div>
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async (pageNum = 1, replace = false) => {
    try {
      const res = await fetchNotifications(pageNum);
      const { results, next } = res.data;
      setNotifs(prev => replace ? results : [...prev, ...results]);
      setHasMore(!!next);
      setUnreadCount(results.filter(n => !n.is_read).length + (replace ? 0 : notifs.filter(n => !n.is_read).length));
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [notifs]);

  useEffect(() => { load(1, true); }, []); // eslint-disable-line

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotifRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    load(next, false);
  };

  return (
    <div>
      {/* Sticky header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0,
        background: 'rgba(8,8,16,0.88)', backdropFilter: 'blur(16px)',
        zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: 10, fontSize: 12, fontFamily: 'var(--mono)',
                background: 'var(--accent)', color: '#fff',
                padding: '2px 8px', borderRadius: 'var(--radius-full)',
                verticalAlign: 'middle',
              }}>
                {unreadCount}
              </span>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              fontSize: 12, fontWeight: 600,
              color: 'var(--accent)', background: 'none', border: 'none',
              cursor: 'pointer', padding: '5px 8px', borderRadius: 'var(--radius)',
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-glow)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* AI Shield pinned card */}
      <div style={{
        display: 'flex', gap: 14, padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(16,217,160,0.07), rgba(124,109,250,0.05))',
        borderBottom: '1px solid rgba(16,217,160,0.18)',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(16,217,160,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>🛡️</div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, marginBottom: 3 }}>
            AI Shield is protecting your feed
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.55 }}>
            All content is screened through our 4-layer zero-tolerance moderation system before reaching your feed.
          </div>
          <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 6, fontFamily: 'var(--mono)' }}>
            4 layers active · RoBERTa model loaded · Zero-tolerance policy
          </div>
        </div>
      </div>

      {/* Notification list */}
      {loading ? (
        <>{Array.from({ length: 5 }).map((_, i) => <SkeletonNotif key={i} />)}</>
      ) : notifs.length === 0 ? (
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔔</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            You're all caught up!
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto', lineHeight: 1.7 }}>
            Notifications for likes, replies, comments, and follows will appear here.
          </div>
        </div>
      ) : (
        <>
          {notifs.map(n => (
            <NotifCard
              key={n.id}
              notif={n}
              onRead={handleMarkRead}
              onNavigate={navigate}
            />
          ))}
          {hasMore && (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  padding: '10px 28px', borderRadius: 'var(--radius-full)',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--accent)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                {loadingMore ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Loading…
                  </span>
                ) : 'Load more'}
              </button>
            </div>
          )}
          {!hasMore && notifs.length > 3 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              🎉 You're all caught up!
            </div>
          )}
        </>
      )}
    </div>
  );
}
