import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      toast.success('Welcome back! 👋');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid credentials';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Background orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>🛡️</div>
          <h1 style={styles.logoText}>SafeChat</h1>
          <p style={styles.logoTagline}>SPEAK FREELY · STAY RESPECTFUL</p>
        </div>

        {/* Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Sign in to SafeChat</h2>
          <p style={styles.cardSub}>Your safe space on the internet</p>

          <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
            <Field
              id="username"
              label="Username"
              value={form.username}
              onChange={set('username')}
              placeholder="your_username"
              autoComplete="username"
            />
            <Field
              id="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <button id="login-btn" type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? (
                <span style={styles.spinnerRow}>
                  <span style={styles.spinner} />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p style={styles.switchText}>
            Don't have an account?{' '}
            <Link to="/register" style={styles.switchLink}>Create one →</Link>
          </p>
        </div>

        {/* Shield note */}
        <div style={styles.shieldNote}>
          <span style={styles.shieldDot} />
          AI Shield Active — Zero-tolerance moderation
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, type = 'text', value, onChange, placeholder, autoComplete }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'var(--bg-elevated)',
          border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          color: 'var(--text)',
          fontSize: 15,
          transition: 'border-color 0.18s, box-shadow 0.18s',
          boxShadow: focused ? '0 0 0 3px var(--accent-glow)' : 'none',
          outline: 'none',
        }}
      />
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  orb1: {
    position: 'absolute', top: '-20%', left: '-10%',
    width: 500, height: 500,
    background: 'radial-gradient(circle, rgba(124,109,250,0.12), transparent 65%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute', bottom: '-20%', right: '-10%',
    width: 600, height: 600,
    background: 'radial-gradient(circle, rgba(167,139,250,0.08), transparent 65%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  container: {
    width: '100%', maxWidth: 420,
    position: 'relative', zIndex: 1,
    animation: 'fadeIn 0.4s cubic-bezier(0.4,0,0.2,1) both',
  },
  logoWrap: { textAlign: 'center', marginBottom: 36 },
  logoIcon: {
    fontSize: 48, marginBottom: 14,
    display: 'inline-block', lineHeight: 1,
    filter: 'drop-shadow(0 0 20px rgba(124,109,250,0.5))',
  },
  logoText: {
    fontSize: 34, fontWeight: 900, letterSpacing: '-1px',
    background: 'linear-gradient(135deg, #fff 40%, var(--accent-alt))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    marginBottom: 8,
  },
  logoTagline: {
    fontSize: 10, letterSpacing: '2.5px', color: 'var(--text-muted)',
    fontWeight: 600, fontFamily: 'var(--mono)',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '36px 32px',
    boxShadow: 'var(--shadow-lg)',
    backdropFilter: 'blur(12px)',
  },
  cardTitle: { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 },
  cardSub: { fontSize: 13, color: 'var(--text-muted)' },
  submitBtn: {
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, var(--accent), var(--accent-alt))',
    color: '#fff', border: 'none', borderRadius: 'var(--radius)',
    fontWeight: 700, fontSize: 15, marginTop: 8,
    boxShadow: '0 4px 18px rgba(124,109,250,0.3)',
    transition: 'var(--transition)',
    cursor: 'pointer',
  },
  spinnerRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  spinner: {
    width: 18, height: 18, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
  switchText: { textAlign: 'center', marginTop: 24, color: 'var(--text-muted)', fontSize: 14 },
  switchLink: { color: 'var(--accent)', fontWeight: 600 },
  shieldNote: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 20,
    fontSize: 11, color: 'var(--text-muted)',
    fontFamily: 'var(--mono)',
  },
  shieldDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: 'var(--success)',
    boxShadow: '0 0 8px var(--success)',
    animation: 'pulse 2s infinite',
    flexShrink: 0,
  },
};
