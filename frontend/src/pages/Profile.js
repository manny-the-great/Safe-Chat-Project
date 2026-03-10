import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProfile, fetchUserPosts, followUser, updateProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import toast from 'react-hot-toast';
import { format } from 'timeago.js';

const AVATAR_COLORS = ['#7c6dfa', '#ff6b9d', '#10d9a0', '#ffad00', '#38bdf8', '#f472b6'];
const getColor = (str = '') => AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function Profile() {
  const { username } = useParams();
  const { user: me, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', bio: '' });
  const [saving, setSaving] = useState(false);

  const isMe = me?.username === username;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [pRes, postsRes] = await Promise.all([
          fetchProfile(username),
          fetchUserPosts(username),
        ]);
        setProfile(pRes.data);
        setPosts(postsRes.data.results || postsRes.data);
        setFollowing(pRes.data.is_followed_by_me || false);
        setEditForm({ display_name: pRes.data.display_name || '', bio: pRes.data.bio || '' });
      } catch {
        toast.error('User not found');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, navigate]);

  const handleFollow = async () => {
    const prev = following;
    setFollowing(!prev);
    setProfile((p) => ({ ...p, follower_count: prev ? p.follower_count - 1 : p.follower_count + 1 }));
    try { await followUser(username); }
    catch { setFollowing(prev); toast.error('Action failed'); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(editForm);
      setProfile((p) => ({ ...p, ...editForm }));
      if (isMe) updateUser(editForm);
      setEditing(false);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
    </div>
  );

  const avatarBg = `linear-gradient(135deg, ${getColor(profile?.username)}, #a78bfa)`;
  const bannerBg = `linear-gradient(135deg, ${getColor(profile?.username)}44, #7c6dfa22)`;

  return (
    <div>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0,
        background: 'rgba(8,8,16,0.88)', backdropFilter: 'blur(16px)', zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 18, padding: '5px 10px', borderRadius: 'var(--radius)', cursor: 'pointer' }}
        >←</button>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>{profile?.display_name}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{posts.length} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div style={{ height: 120, background: bannerBg, borderBottom: '1px solid var(--border)' }} />

      {/* Profile card */}
      <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        {/* Avatar — overlapping banner */}
        <div style={{
          width: 84, height: 84, borderRadius: '50%', background: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 28, color: '#fff',
          border: '4px solid var(--bg)',
          marginTop: -42, marginBottom: 14,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          {(profile?.display_name || profile?.username || '?').slice(0, 2).toUpperCase()}
        </div>

        {/* Action buttons */}
        <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', gap: 8 }}>
          {isMe ? (
            <button
              onClick={() => setEditing(!editing)}
              style={{
                padding: '8px 20px', borderRadius: 'var(--radius-full)',
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text)', fontWeight: 600, fontSize: 14,
                cursor: 'pointer', transition: 'var(--transition)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {editing ? 'Cancel' : '✏️ Edit Profile'}
            </button>
          ) : (
            <button
              onClick={handleFollow}
              style={{
                padding: '9px 24px', borderRadius: 'var(--radius-full)',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                background: following
                  ? 'transparent'
                  : 'linear-gradient(135deg, var(--accent), var(--accent-alt))',
                color: following ? 'var(--text)' : '#fff',
                border: following ? '1px solid var(--border)' : 'none',
                boxShadow: following ? 'none' : '0 2px 12px rgba(124,109,250,0.3)',
                transition: 'var(--transition)',
              }}
            >
              {following ? 'Following ✓' : 'Follow'}
            </button>
          )}
        </div>

        {/* Edit form */}
        {editing ? (
          <div className="fade-in" style={{ maxWidth: 420 }}>
            <div className="field">
              <label>Display Name</label>
              <input
                value={editForm.display_name}
                onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
                maxLength={60}
                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 15, outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div className="field">
              <label>Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value.slice(0, 300) }))}
                rows={3}
                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 14, resize: 'none', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{editForm.bio.length}/300</div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '9px 24px', borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-alt))',
                color: '#fff', border: 'none', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 3 }}>{profile?.display_name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 10 }}>@{profile?.username}</p>
            {profile?.bio && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.65, marginBottom: 14, maxWidth: 480 }}>
                {profile.bio}
              </p>
            )}
            {profile?.created_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, color: 'var(--text-muted)', fontSize: 13 }}>
                <span>📅</span>
                <span>Joined {format(profile.created_at)}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 24 }}>
              {[['Following', profile?.following_count || 0], ['Followers', profile?.follower_count || 0]].map(([label, val]) => (
                <div key={label}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{val}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 5, fontSize: 14 }}>{label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Banned badge */}
        {profile?.is_banned && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '5px 12px', background: 'rgba(255,71,102,0.1)', border: '1px solid rgba(255,71,102,0.3)', borderRadius: 'var(--radius-full)' }}>
            <span>🔨</span>
            <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>Account Suspended</span>
          </div>
        )}
      </div>

      {/* Posts tab header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 24 }}>
        <span style={{
          fontSize: 15, fontWeight: 700, color: 'var(--accent)',
          borderBottom: '2px solid var(--accent)', paddingBottom: 8,
        }}>Posts</span>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>No posts yet</div>
          {isMe && <div style={{ fontSize: 13, marginTop: 6 }}>Share something kind with the community!</div>}
        </div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </div>
  );
}
