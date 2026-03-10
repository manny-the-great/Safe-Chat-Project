import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPost, fetchComments, createComment, likeComment } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import ContentBox from '../components/ContentBox';
import PostCard from '../components/PostCard';
import { format } from 'timeago.js';
import toast from 'react-hot-toast';

const AVATAR_COLORS = ['#7c6dfa', '#ff6b9d', '#10d9a0', '#ffad00', '#38bdf8', '#f472b6'];
const getColor = (str = '') => AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function CommentItem({ comment, onReply, depth = 0 }) {
  const [liked, setLiked] = useState(comment.is_liked_by_me || false);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [showReply, setShowReply] = useState(false);

  const handleLike = async () => {
    const prev = liked;
    setLiked(!prev);
    setLikeCount((c) => prev ? c - 1 : c + 1);
    try { await likeComment(comment.id); }
    catch { setLiked(prev); setLikeCount(comment.like_count); }
  };

  const avatarBg = `linear-gradient(135deg, ${getColor(comment.author?.username)}, #a78bfa)`;

  return (
    <div
      className="fade-in"
      style={{
        marginLeft: depth * 36,
        borderLeft: depth > 0 ? '2px solid var(--border)' : 'none',
        paddingLeft: depth > 0 ? 14 : 0,
      }}
    >
      <div style={{
        display: 'flex', gap: 12, padding: '12px 0',
        borderBottom: depth === 0 ? '1px solid rgba(28,28,56,0.6)' : 'none',
      }}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 11, color: '#fff', flexShrink: 0,
        }}>
          {(comment.author?.display_name || '?').slice(0, 2).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Author row */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{comment.author?.display_name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>@{comment.author?.username}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>· {format(comment.created_at)}</span>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
            {comment.content}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={handleLike}
              style={{
                background: 'none', border: 'none',
                color: liked ? 'var(--danger)' : 'var(--text-muted)',
                fontSize: 13, display: 'flex', alignItems: 'center',
                gap: 5, padding: '3px 0', fontFamily: 'var(--font)',
                cursor: 'pointer', transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: 15 }}>{liked ? '❤️' : '🤍'}</span>
              {likeCount > 0 && likeCount}
            </button>
            {depth < 2 && (
              <button
                onClick={() => setShowReply(!showReply)}
                style={{
                  background: 'none', border: 'none',
                  color: showReply ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: 13, display: 'flex', alignItems: 'center',
                  gap: 5, padding: '3px 0', fontFamily: 'var(--font)',
                  cursor: 'pointer', transition: 'color 0.15s',
                }}
              >
                💬 Reply
              </button>
            )}
          </div>

          {showReply && (
            <div style={{ marginTop: 10 }}>
              <ContentBox
                placeholder={`Reply to @${comment.author?.username}…`}
                compact
                onSubmit={async (content) => {
                  const res = await createComment(comment.post_id, content, comment.id);
                  if (res.data.status === 'approved') {
                    onReply(res.data.comment);
                    setShowReply(false);
                  }
                  return res.data;
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies?.map((r) => (
        <CommentItem key={r.id} comment={r} onReply={onReply} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [postRes, commRes] = await Promise.all([fetchPost(id), fetchComments(id)]);
        setPost(postRes.data);
        setComments(commRes.data.results || commRes.data);
      } catch {
        toast.error('Post not found');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleNewComment = (comment) => {
    if (!comment.parent_id) {
      setComments((prev) => [comment, ...prev]);
      setPost((p) => p ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p);
    } else {
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.parent_id
            ? { ...c, replies: [comment, ...(c.replies || [])] }
            : c
        )
      );
    }
  };

  useSocket(null, (c) => { if (String(c.post_id) === String(id)) handleNewComment(c); }, null);

  if (loading) return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
    </div>
  );

  return (
    <div>
      {/* Sticky header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0,
        background: 'rgba(8,8,16,0.88)', backdropFilter: 'blur(16px)', zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', fontSize: 18,
            padding: '5px 10px', borderRadius: 'var(--radius)',
            cursor: 'pointer', transition: 'var(--transition)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >←</button>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Post</h1>
      </div>

      {/* Post */}
      {post && <PostCard post={post} />}

      {/* Comment composer */}
      <ContentBox
        placeholder="Share a respectful reply…"
        compact
        onSubmit={async (content) => {
          const res = await createComment(id, content);
          if (res.data.status === 'approved') handleNewComment(res.data.comment);
          return res.data;
        }}
      />

      {/* Comments */}
      <div style={{ padding: '0 20px' }}>
        {comments.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
            No comments yet. Start the conversation!
          </div>
        ) : (
          comments.map((c) => (
            <CommentItem key={c.id} comment={c} onReply={handleNewComment} />
          ))
        )}
      </div>
    </div>
  );
}
