import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { fetchFeed, createPost } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import PostCard from '../components/PostCard';
import ContentBox from '../components/ContentBox';

function SkeletonPost() {
  return (
    <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: 14 }}>
        <div className="skeleton" style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 14, width: '40%', borderRadius: 6, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 13, width: '100%', borderRadius: 6, marginBottom: 6 }} />
          <div className="skeleton" style={{ height: 13, width: '80%', borderRadius: 6, marginBottom: 14 }} />
          <div style={{ display: 'flex', gap: 16 }}>
            {[80, 70, 70].map((w, i) => <div key={i} className="skeleton" style={{ height: 28, width: w, borderRadius: 20 }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newPosts, setNewPosts] = useState([]);
  const [liveCount, setLiveCount] = useState(0);
  const loadMoreRef = useRef(null);

  const loadPosts = useCallback(async (pageNum = 1, replace = false) => {
    try {
      const res = await fetchFeed(pageNum);
      const { results, next } = res.data;
      setPosts((prev) => replace ? results : [...prev, ...results]);
      setHasMore(!!next);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadPosts(1, true); }, [loadPosts]);

  // WebSocket: queue new posts from other users
  const handleNewPost = useCallback((post) => {
    setNewPosts((prev) => [post, ...prev]);
    setLiveCount((c) => c + 1);
  }, []);

  const handleLikeUpdate = useCallback((data) => {
    setPosts((prev) => prev.map((p) =>
      p.id === data.post_id ? { ...p, like_count: data.like_count } : p
    ));
  }, []);

  useSocket(handleNewPost, null, handleLikeUpdate);

  const showNewPosts = () => {
    setPosts((prev) => [...newPosts, ...prev]);
    setNewPosts([]);
    setLiveCount(0);
  };

  const handleSubmit = async (content) => {
    const res = await createPost(content);
    if (res.data.status === 'approved') {
      setPosts((prev) => [res.data.post, ...prev]);
    }
    return res.data;
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    loadPosts(next, false);
  };

  return (
    <div>
      {/* Sticky header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0,
        background: 'rgba(8,8,16,0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Home</h1>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
          AI Shield · Active
        </span>
      </div>

      {/* Compose area */}
      <ContentBox
        placeholder="What's on your mind? Be respectful ✨"
        onSubmit={handleSubmit}
      />

      {/* Live new posts banner */}
      {liveCount > 0 && (
        <button
          onClick={showNewPosts}
          className="fade-down"
          style={{
            display: 'block', width: '100%', padding: '12px 20px',
            background: 'linear-gradient(135deg, var(--accent-glow), rgba(124,109,250,0.06))',
            border: 'none', borderBottom: '1px solid rgba(124,109,250,0.22)',
            color: 'var(--accent)', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', textAlign: 'center',
            transition: 'var(--transition)',
          }}
        >
          ↑ Show {liveCount} new post{liveCount > 1 ? 's' : ''}
        </button>
      )}

      {/* Posts list */}
      {loading ? (
        <>{Array.from({ length: 4 }).map((_, i) => <SkeletonPost key={i} />)}</>
      ) : posts.length === 0 ? (
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🕊️</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No posts yet</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Be the first to say something kind!</div>
        </div>
      ) : (
        <>
          {posts.map((post) => <PostCard key={post.id} post={post} />)}
          {hasMore && (
            <div ref={loadMoreRef} style={{ padding: '20px', textAlign: 'center' }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  padding: '10px 28px', borderRadius: 'var(--radius-full)',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--accent)', fontWeight: 600, fontSize: 14,
                  cursor: 'pointer',
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
          {!hasMore && posts.length > 5 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              🎉 You're all caught up!
            </div>
          )}
        </>
      )}
    </div>
  );
}
