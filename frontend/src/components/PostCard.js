import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { likePost, sharePost } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'timeago.js';

const AVATAR_COLORS = ['#7c6dfa', '#ff6b9d', '#10d9a0', '#ffad00', '#38bdf8', '#f472b6'];
const getColor = (str = '') => AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function PostCard({ post, onUpdate }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.is_liked_by_me || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [shareCount, setShareCount] = useState(post.share_count || 0);
  const [loadingLike, setLoadingLike] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (loadingLike) return;
    setLoadingLike(true);
    const prev = liked;
    setLiked(!prev);
    setLikeCount((c) => prev ? c - 1 : c + 1);
    try {
      await likePost(post.id);
    } catch {
      setLiked(prev);
      setLikeCount(likeCount);
      toast.error('Failed to like');
    } finally {
      setLoadingLike(false);
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    try {
      await sharePost(post.id);
      setShareCount((c) => c + 1);
      toast.success('Post shared!');
    } catch {
      toast.error('Failed to share');
    }
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast.success('Link copied!');
  };

  const goPost = () => navigate(`/post/${post.id}`);
  const goAuthor = (e) => { e.stopPropagation(); navigate(`/profile/${post.author?.username}`); };

  const avatarBg = `linear-gradient(135deg, ${getColor(post.author?.username)}, #a78bfa)`;

  return (
    <article
      className="fade-in"
      onClick={goPost}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '18px 20px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: hovered ? 'var(--surface-hover)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', gap: 14 }}>
        {/* Avatar */}
        <div
          onClick={goAuthor}
          style={{
            width: 46, height: 46, borderRadius: '50%',
            background: avatarBg, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 15, color: '#fff',
            cursor: 'pointer', transition: 'transform 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {(post.author?.display_name || '?').slice(0, 2).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span onClick={goAuthor} style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', cursor: 'pointer' }}>
                {post.author?.display_name}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>@{post.author?.username}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>·</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{format(post.created_at)}</span>
            </div>
            {/* Safe badge */}
            <span className="badge badge-safe">✓ SAFE</span>
          </div>

          {/* Content */}
          <p style={{
            color: 'var(--text)', fontSize: 15, lineHeight: 1.7,
            marginBottom: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {post.content}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 2, marginLeft: -8 }}>
            <ActionBtn icon="💬" count={post.comment_count || 0} onClick={goPost} label="Reply" hoverColor="var(--info)" />
            <ActionBtn icon={liked ? '❤️' : '🤍'} count={likeCount} onClick={handleLike} active={liked} activeColor="var(--danger)" hoverColor="var(--danger)" label="Like" />
            <ActionBtn icon="🔁" count={shareCount} onClick={handleShare} hoverColor="var(--success)" label="Repost" />
            <ActionBtn icon="🔗" count={null} onClick={handleCopy} hoverColor="var(--accent)" label="Copy link" />
          </div>
        </div>
      </div>
    </article>
  );
}

function ActionBtn({ icon, count, onClick, active, activeColor, hoverColor, label }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? `${hoverColor || '#fff'}12` : 'none',
        border: 'none', borderRadius: 'var(--radius-full)',
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 12px',
        color: active ? activeColor : hov ? (hoverColor || 'var(--text)') : 'var(--text-muted)',
        fontSize: 14, fontWeight: 500,
        transition: 'all 0.15s',
        minWidth: 48,
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      {count !== null && count !== undefined && (
        <span style={{ fontSize: 13 }}>{count > 0 ? count : ''}</span>
      )}
    </button>
  );
}
