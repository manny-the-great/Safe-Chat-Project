import React, { useState, useEffect } from 'react';
import { fetchFeed } from '../services/api';
import PostCard from '../components/PostCard';
import toast from 'react-hot-toast';

const TRENDING_TOPICS = [
    { tag: '#Kindness', count: '1.2K posts' },
    { tag: '#DigitalCivility', count: '983 posts' },
    { tag: '#SafeSpaces', count: '764 posts' },
    { tag: '#MentalHealth', count: '2.1K posts' },
    { tag: '#PositiveVibes', count: '4.8K posts' },
    { tag: '#RespectFirst', count: '1.7K posts' },
];

function TrendingCard({ tag, count }) {
    const [hov, setHov] = useState(false);
    return (
        <div
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                padding: '12px 16px', borderRadius: 'var(--radius)',
                background: hov ? 'var(--surface-hover)' : 'var(--surface)',
                border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'var(--transition)',
                marginBottom: 6,
            }}
        >
            <div style={{ fontWeight: 700, color: hov ? 'var(--accent)' : 'var(--text)', fontSize: 14 }}>{tag}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{count}</div>
        </div>
    );
}

export default function Explore() {
    const [query, setQuery] = useState('');
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetchFeed(1);
                setPosts(res.data.results || []);
            } catch {
                toast.error('Failed to load posts');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filtered = query.trim()
        ? posts.filter((p) =>
            p.content?.toLowerCase().includes(query.toLowerCase()) ||
            p.author?.username?.toLowerCase().includes(query.toLowerCase()) ||
            p.author?.display_name?.toLowerCase().includes(query.toLowerCase())
        )
        : posts;

    return (
        <div>
            {/* Header */}
            <div style={{
                padding: '14px 20px', borderBottom: '1px solid var(--border)',
                position: 'sticky', top: 0,
                background: 'rgba(8,8,16,0.88)', backdropFilter: 'blur(16px)', zIndex: 10,
            }}>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>Explore</h1>
                {/* Search bar */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--surface)',
                    border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-full)',
                    padding: '8px 16px',
                    transition: 'border-color 0.18s, box-shadow 0.18s',
                    boxShadow: focused ? '0 0 0 3px var(--accent-glow)' : 'none',
                }}>
                    <span style={{ fontSize: 17, color: 'var(--text-muted)', flexShrink: 0 }}>🔍</span>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="Search posts, people, topics…"
                        style={{
                            flex: 1, fontSize: 14, color: 'var(--text)',
                            background: 'transparent', border: 'none', outline: 'none',
                        }}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: 0 }}
                        >✕</button>
                    )}
                </div>
            </div>

            {/* Trending topics (only when not searching) */}
            {!query && (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 14 }}>🔥 Trending Topics</h2>
                    {TRENDING_TOPICS.map((t) => <TrendingCard key={t.tag} {...t} />)}
                </div>
            )}

            {/* Results */}
            <div>
                {loading ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 42, marginBottom: 12 }}>🔍</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>No results found</div>
                        <div style={{ fontSize: 13, marginTop: 6 }}>Try a different search term</div>
                    </div>
                ) : (
                    <>
                        {query && (
                            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13 }}>
                                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for <strong style={{ color: 'var(--accent)' }}>"{query}"</strong>
                            </div>
                        )}
                        {filtered.map((post) => <PostCard key={post.id} post={post} />)}
                    </>
                )}
            </div>
        </div>
    );
}
