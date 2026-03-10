import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const AVATAR_COLORS = ['#7c6dfa', '#ff6b9d', '#10d9a0', '#ffad00', '#38bdf8', '#f472b6'];
const getColor = (str = '') => AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const NAV_LINKS = [
  { to: '/', icon: '🏠', label: 'Home', exact: true },
  { to: '/explore', icon: '🔍', label: 'Explore' },
  { to: '/notifications', icon: '🔔', label: 'Notifications' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const avatarBg = `linear-gradient(135deg, ${getColor(user?.username)}, #a78bfa)`;

  return (
    <div style={outerWrap}>
      <div style={innerGrid}>

        {/* ─── LEFT SIDEBAR ───────────────────────────────── */}
        <aside style={sidebar}>

          {/* Logo */}
          <NavLink to="/" style={{ textDecoration: 'none' }}>
            <div style={logoWrap}>
              <div style={logoIcon}>🛡️</div>
              <div>
                <div style={logoName}>SafeChat</div>
                <div style={logoSub}>AI-Protected · Respectful</div>
              </div>
            </div>
          </NavLink>

          {/* Nav */}
          <nav style={{ flex: 1, marginTop: 8 }}>
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                style={({ isActive }) => navLink(isActive)}
              >
                <span style={navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}

            {/* Profile */}
            <NavLink
              to={`/profile/${user?.username}`}
              style={({ isActive }) => navLink(isActive)}
            >
              <span style={navIcon}>👤</span>
              <span>Profile</span>
            </NavLink>

            {/* Admin (only if admin) */}
            {user?.is_admin && (
              <NavLink
                to="/admin"
                style={({ isActive }) => ({
                  ...navLink(isActive),
                  ...(isActive ? {
                    background: 'rgba(255,71,102,0.1)',
                    border: '1px solid rgba(255,71,102,0.25)',
                    color: 'var(--danger)',
                  } : {}),
                })}
              >
                <span style={navIcon}>🛡️</span>
                <span>Admin Panel</span>
              </NavLink>
            )}
          </nav>

          {/* AI Shield status */}
          <div style={shieldBadge}>
            <div style={shieldDot} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--success)' }}>AI Shield Active</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>3-Layer · RoBERTa · Zero-Tolerance</div>
            </div>
          </div>

          {/* User card */}
          <div style={userCard} onClick={() => setShowMenu(!showMenu)}>
            <div style={{ ...avatarStyle, background: avatarBg }}>
              {(user?.display_name || user?.username || '?').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.display_name || user?.username}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{user?.username}</div>
            </div>
            <span style={{ fontSize: 16, color: 'var(--text-muted)', flexShrink: 0 }}>···</span>

            {showMenu && (
              <div style={dropdownMenu} onClick={(e) => e.stopPropagation()}>
                <div
                  style={dropdownItem}
                  onClick={() => { navigate(`/profile/${user?.username}`); setShowMenu(false); }}
                >
                  👤 View Profile
                </div>
                <div
                  style={{ ...dropdownItem, color: 'var(--danger)' }}
                  onClick={handleLogout}
                >
                  🚪 Log Out
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ─── MAIN FEED ──────────────────────────────────── */}
        <main style={mainContent}>
          <Outlet />
        </main>

        {/* ─── RIGHT SIDEBAR ──────────────────────────────── */}
        <aside style={rightSidebar}>

          {/* Community Guidelines */}
          <div style={widgetCard}>
            <h3 style={widgetTitle}>📋 Community Rules</h3>
            {[
              '✅ Be kind and build others up',
              '🚫 No profanity or hate speech',
              '🚫 No bullying or harassment',
              '🚫 No threats or violent content',
              '🔒 Respect everyone\'s privacy',
            ].map((r) => (
              <div key={r} style={ruleRow}>{r}</div>
            ))}
          </div>

          {/* Detection Layers */}
          <div style={widgetCard}>
            <h3 style={widgetTitle}>🧠 Moderation Layers</h3>
            {[
              { label: 'L1 · Profanity Filter', sub: 'Instant keyword block', color: 'var(--danger)' },
              { label: 'L2 · Threat Detection', sub: 'Violence & threat intent', color: 'var(--warning)' },
              { label: 'L3 · ML Model (RoBERTa)', sub: 'AI toxicity score ≥0.40', color: 'var(--accent)' },
              { label: 'L4 · Sentiment Guard', sub: 'Hostile directed language', color: 'var(--info)' },
            ].map((l) => (
              <div key={l.label} style={{ ...layerRow, background: `${l.color}08`, borderColor: `${l.color}20` }}>
                <div style={{ ...layerDot, background: l.color }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: l.color }}>{l.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{l.sub}</div>
                </div>
              </div>
            ))}
          </div>

        </aside>
      </div>
    </div>
  );
}

/* ── styles ── */
const outerWrap = {
  width: '100%',
  background: 'var(--bg)',
};
const innerGrid = {
  maxWidth: 1200,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: '260px 1fr 290px',
  minHeight: '100vh',
  gap: 0,
};
const sidebar = {
  padding: '20px 12px 20px 0',
  position: 'sticky', top: 0, height: '100vh',
  display: 'flex', flexDirection: 'column',
  gap: 4, overflow: 'auto',
  borderRight: '1px solid var(--border)',
};
const logoWrap = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '4px 10px 24px',
};
const logoIcon = {
  fontSize: 30,
  filter: 'drop-shadow(0 0 12px rgba(124,109,250,0.5))',
  flexShrink: 0,
};
const logoName = {
  fontWeight: 900, fontSize: 20, letterSpacing: '-0.5px',
  background: 'linear-gradient(135deg, var(--text) 50%, var(--accent-alt))',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  lineHeight: 1.2,
};
const logoSub = {
  fontSize: 9, letterSpacing: '0.5px', color: 'var(--text-muted)',
  fontFamily: 'var(--mono)', marginTop: 2,
};
const navLink = (active) => ({
  display: 'flex', alignItems: 'center', gap: 13,
  padding: '11px 14px',
  borderRadius: 'var(--radius)',
  marginBottom: 2,
  textDecoration: 'none',
  fontWeight: active ? 700 : 500,
  fontSize: 15,
  transition: 'var(--transition)',
  background: active ? 'var(--accent-glow2)' : 'transparent',
  border: `1px solid ${active ? 'rgba(124,109,250,0.28)' : 'transparent'}`,
  color: active ? 'var(--accent)' : 'var(--text-secondary)',
});
const navIcon = { fontSize: 20, lineHeight: 1, flexShrink: 0 };
const shieldBadge = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 14px',
  background: 'rgba(16,217,160,0.07)',
  border: '1px solid rgba(16,217,160,0.18)',
  borderRadius: 'var(--radius)',
  marginTop: 8, marginBottom: 4,
};
const shieldDot = {
  width: 9, height: 9, borderRadius: '50%',
  background: 'var(--success)',
  boxShadow: '0 0 10px var(--success)',
  animation: 'pulse 2s infinite', flexShrink: 0,
};
const userCard = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '12px 14px',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  position: 'relative',
  transition: 'var(--transition)',
  marginTop: 4,
};
const avatarStyle = {
  width: 38, height: 38, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0,
};
const dropdownMenu = {
  position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
  background: 'var(--surface-alt)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  overflow: 'hidden',
  boxShadow: 'var(--shadow-lg)',
  zIndex: 50,
};
const dropdownItem = {
  padding: '12px 16px', fontSize: 14, fontWeight: 500,
  color: 'var(--text-secondary)', cursor: 'pointer',
  transition: 'background 0.15s',
  borderBottom: '1px solid var(--border)',
};
const mainContent = {
  borderLeft: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  minHeight: '100vh',
};
const rightSidebar = {
  padding: '20px 0 20px 16px',
  position: 'sticky', top: 0, height: '100vh',
  display: 'flex', flexDirection: 'column',
  gap: 14, overflow: 'auto',
};
const widgetCard = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px 18px',
};
const widgetTitle = {
  fontSize: 13, fontWeight: 700, color: 'var(--text)',
  marginBottom: 12,
};
const ruleRow = {
  fontSize: 12, color: 'var(--text-muted)',
  padding: '6px 0',
  borderBottom: '1px solid var(--border)',
};
const layerRow = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 10px', borderRadius: 8,
  border: '1px solid transparent', marginBottom: 6,
};
const layerDot = {
  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
};
