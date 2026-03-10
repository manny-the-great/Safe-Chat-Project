import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', displayName: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((prev) => ({ ...prev, [k]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = 'Username is required';
    else if (!/^[a-zA-Z0-9_.]+$/.test(form.username)) e.username = 'Letters, numbers, underscores, dots only';
    else if (form.username.length < 3) e.username = 'At least 3 characters';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (!form.password || form.password.length < 8) e.password = 'At least 8 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await register(form.username.trim(), form.email.trim(), form.password, form.displayName.trim() || form.username.trim());
      toast.success('Account created! Welcome to SafeChat 🛡️');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(form.password);

  return (
    <div style={styles.page}>
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>🛡️</div>
          <h1 style={styles.logoText}>SafeChat</h1>
          <p style={styles.logoTagline}>JOIN THE RESPECTFUL COMMUNITY</p>
        </div>

        {/* Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Create your account</h2>
          <p style={styles.cardSub}>Free forever · No spam · AI-protected space</p>

          <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <Field id="username" label="Username *" value={form.username} onChange={set('username')} placeholder="cool_username" error={errors.username} />
              <Field id="displayName" label="Display Name" value={form.displayName} onChange={set('displayName')} placeholder="Cool Username" />
            </div>
            <Field id="email" label="Email *" type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" error={errors.email} />
            <Field id="password" label="Password *" type="password" value={form.password} onChange={set('password')} placeholder="Min 8 characters" error={errors.password}>
              {form.password.length > 0 && (
                <PasswordStrength strength={strength} />
              )}
            </Field>
            <Field id="confirm" label="Confirm Password *" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" error={errors.confirm} />

            <button id="register-btn" type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? (
                <span style={styles.spinnerRow}><span style={styles.spinner} /> Creating account…</span>
              ) : 'Create Account'}
            </button>
          </form>

          <p style={styles.termsText}>
            By signing up, you agree to our <span style={{ color: 'var(--accent)' }}>Community Standards</span>.<br />
            Zero tolerance for toxic content. AI moderation enforced.
          </p>

          <p style={styles.switchText}>
            Already have an account?{' '}
            <Link to="/login" style={styles.switchLink}>Sign in →</Link>
          </p>
        </div>

        <div style={styles.shieldNote}>
          <span style={styles.shieldDot} />
          AI Shield Active — Your content is reviewed before it's visible
        </div>
      </div>
    </div>
  );
}

function PasswordStrength({ strength }) {
  const colors = ['var(--danger)', 'var(--warning)', '#7ee787', 'var(--success)'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= strength ? colors[strength] : 'var(--border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: colors[strength], fontWeight: 600 }}>{labels[strength]}</div>
    </div>
  );
}

function getPasswordStrength(pw) {
  if (!pw || pw.length < 6) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return Math.min(3, score - 1 < 0 ? 0 : score - 1);
}

function Field({ id, label, type = 'text', value, onChange, placeholder, error, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id} style={{ color: error ? 'var(--danger)' : 'var(--text-secondary)' }}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: '11px 14px',
          background: 'var(--bg-elevated)',
          border: `1.5px solid ${error ? 'var(--danger)' : focused ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          color: 'var(--text)',
          fontSize: 14,
          transition: 'border-color 0.18s, box-shadow 0.18s',
          boxShadow: focused ? '0 0 0 3px var(--accent-glow)' : error ? '0 0 0 3px rgba(255,71,102,0.1)' : 'none',
          outline: 'none',
        }}
      />
      {children}
      {error && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 2 }}>⚠ {error}</div>}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
    position: 'relative', overflow: 'hidden',
  },
  orb1: {
    position: 'absolute', top: '-20%', right: '-10%',
    width: 500, height: 500,
    background: 'radial-gradient(circle, rgba(124,109,250,0.1), transparent 65%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute', bottom: '-15%', left: '-10%',
    width: 500, height: 500,
    background: 'radial-gradient(circle, rgba(16,217,160,0.07), transparent 65%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  container: {
    width: '100%', maxWidth: 480,
    position: 'relative', zIndex: 1,
    animation: 'fadeIn 0.4s cubic-bezier(0.4,0,0.2,1) both',
  },
  logoWrap: { textAlign: 'center', marginBottom: 30 },
  logoIcon: {
    fontSize: 44, marginBottom: 12, display: 'inline-block', lineHeight: 1,
    filter: 'drop-shadow(0 0 20px rgba(124,109,250,0.5))',
  },
  logoText: {
    fontSize: 30, fontWeight: 900, letterSpacing: '-1px',
    background: 'linear-gradient(135deg, #fff 40%, var(--accent-alt))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6,
  },
  logoTagline: {
    fontSize: 9, letterSpacing: '2px', color: 'var(--text-muted)',
    fontWeight: 600, fontFamily: 'var(--mono)',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '32px 28px',
    boxShadow: 'var(--shadow-lg)',
  },
  cardTitle: { fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 },
  cardSub: { fontSize: 12, color: 'var(--text-muted)' },
  submitBtn: {
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, var(--accent), var(--accent-alt))',
    color: '#fff', border: 'none', borderRadius: 'var(--radius)',
    fontWeight: 700, fontSize: 15, marginTop: 4,
    boxShadow: '0 4px 18px rgba(124,109,250,0.3)',
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
  termsText: {
    fontSize: 11, color: 'var(--text-muted)', textAlign: 'center',
    marginTop: 14, lineHeight: 1.7,
  },
  switchText: { textAlign: 'center', marginTop: 16, color: 'var(--text-muted)', fontSize: 14 },
  switchLink: { color: 'var(--accent)', fontWeight: 600 },
  shieldNote: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 20, fontSize: 11,
    color: 'var(--text-muted)', fontFamily: 'var(--mono)',
  },
  shieldDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: 'var(--success)',
    boxShadow: '0 0 8px var(--success)',
    animation: 'pulse 2s infinite', flexShrink: 0,
  },
};
