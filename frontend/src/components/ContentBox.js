import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const AVATAR_COLORS = ['#7c6dfa', '#ff6b9d', '#10d9a0', '#ffad00', '#38bdf8', '#f472b6'];
const getColor = (str = '') => AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const LAYER_LABELS = {
  LAYER_1_PROFANITY: '⚡ Profanity Filter',
  LAYER_2_THREAT: '🔫 Threat Detection',
  LAYER_3_ML_MODEL: '🧠 ML Model (RoBERTa)',
  LAYER_4_SENTIMENT: '💭 Sentiment Guard',
  USER_BANNED: '🔨 Account Suspended',
  // legacy key support
  LAYER_2_ML_MODEL: '🧠 ML Model (RoBERTa)',
  LAYER_3_SENTIMENT: '💭 Sentiment Guard',
};

export default function ContentBox({
  placeholder = "What's happening?",
  onSubmit,
  maxLength = 280,
  compact = false,
}) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [state, setState] = useState('idle'); // idle | checking | rejected | success
  const [errorInfo, setErrorInfo] = useState(null);
  const [charWarn, setCharWarn] = useState(false);

  const charLeft = maxLength - text.length;
  const avatarBg = `linear-gradient(135deg, ${getColor(user?.username)}, #a78bfa)`;

  const handleChange = (e) => {
    const val = e.target.value.slice(0, maxLength);
    setText(val);
    setState('idle');
    setErrorInfo(null);
    setCharWarn(val.length > maxLength * 0.85);
  };

  const handleSubmit = async () => {
    if (!text.trim() || state === 'checking') return;
    setState('checking');
    setErrorInfo(null);
    try {
      const result = await onSubmit(text.trim());
      if (result?.status === 'rejected') {
        setState('rejected');
        setErrorInfo(result);
      } else {
        setState('idle');
        setText('');
        setCharWarn(false);
        if (!compact) toast.success('Posted! ✨');
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.status === 'rejected') {
        setState('rejected');
        setErrorInfo(data);
      } else {
        setState('idle');
        toast.error('Something went wrong. Try again.');
      }
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
  };

  return (
    <div style={{
      background: compact ? 'transparent' : 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: compact ? '10px 16px' : '18px 20px',
    }}>
      <div style={{ display: 'flex', gap: 12 }}>

        {/* Avatar */}
        <div style={{
          width: compact ? 36 : 46, height: compact ? 36 : 46,
          borderRadius: '50%', background: avatarBg, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: compact ? 12 : 15, color: '#fff',
        }}>
          {(user?.display_name || user?.username || '?').slice(0, 2).toUpperCase()}
        </div>

        <div style={{ flex: 1 }}>
          {/* Textarea */}
          <textarea
            value={text}
            onChange={handleChange}
            onKeyDown={handleKey}
            placeholder={placeholder}
            disabled={state === 'checking'}
            style={{
              width: '100%',
              resize: 'none',
              fontSize: compact ? 14 : 16,
              lineHeight: 1.65,
              minHeight: compact ? 48 : 80,
              color: 'var(--text)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font)',
              paddingTop: 4,
              opacity: state === 'checking' ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          />

          {/* Checking loader */}
          {state === 'checking' && (
            <div className="slide-down" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px',
              background: 'var(--accent-glow)',
              border: '1px solid rgba(124,109,250,0.25)',
              borderRadius: 'var(--radius)',
              marginBottom: 10,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                border: '2px solid var(--accent-glow2)',
                borderTopColor: 'var(--accent)',
                animation: 'spin 0.7s linear infinite', flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 1 }}>
                  Checking for inappropriate content…
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                  4-layer AI moderation · usually &lt;1s
                </div>
              </div>
            </div>
          )}

          {/* Rejection error */}
          {state === 'rejected' && errorInfo && (
            <div className="slide-down" style={{
              padding: '14px 16px',
              background: 'rgba(255,71,102,0.07)',
              border: '1px solid rgba(255,71,102,0.28)',
              borderRadius: 'var(--radius)',
              marginBottom: 10,
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>🚫</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 14, marginBottom: 5 }}>
                    Content Blocked by AI Shield
                  </div>
                  <div style={{ color: '#ff8a9e', fontSize: 13, lineHeight: 1.55, marginBottom: 8 }}>
                    {errorInfo.message || 'Your content violates SafeChat community standards. Please use respectful language.'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {errorInfo.rejection_layer && (
                      <span className="badge badge-danger">
                        {LAYER_LABELS[errorInfo.rejection_layer] || errorInfo.rejection_layer}
                      </span>
                    )}
                    {errorInfo.toxicity_score !== undefined && (
                      <span className="badge badge-warn" style={{ fontFamily: 'var(--mono)' }}>
                        {(errorInfo.toxicity_score * 100).toFixed(0)}% toxic
                      </span>
                    )}
                    {errorInfo.violations >= 3 && (
                      <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>
                        ⚠️ {errorInfo.violations} violations on record
                      </span>
                    )}
                    {errorInfo.auto_banned && (
                      <span className="badge badge-danger">🔨 Auto-suspended</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 10,
            borderTop: `1px solid var(--border)`,
          }}>
            {/* Media buttons */}
            <div style={{ display: 'flex', gap: 2 }}>
              {['🖼️', '😊', '📎'].map((icon) => (
                <button
                  key={icon}
                  style={{
                    background: 'none', border: 'none',
                    fontSize: 18, color: 'var(--accent)',
                    padding: '5px 7px', borderRadius: 8,
                    opacity: 0.7,
                    transition: 'opacity 0.15s, transform 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* Right side: char count + submit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {text.length > 0 && (
                <>
                  {/* Circular progress */}
                  <div style={{ position: 'relative', width: 28, height: 28 }}>
                    <svg width="28" height="28" viewBox="0 0 28 28">
                      <circle cx="14" cy="14" r="11" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                      <circle
                        cx="14" cy="14" r="11"
                        fill="none"
                        stroke={charLeft < 20 ? 'var(--danger)' : charLeft < 60 ? 'var(--warning)' : 'var(--accent)'}
                        strokeWidth="2.5"
                        strokeDasharray={`${69.1}`}
                        strokeDashoffset={`${69.1 * (1 - text.length / maxLength)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 14 14)"
                        style={{ transition: 'stroke-dashoffset 0.2s, stroke 0.2s' }}
                      />
                    </svg>
                    {charLeft < 30 && (
                      <span style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontFamily: 'var(--mono)',
                        color: charLeft < 10 ? 'var(--danger)' : 'var(--text-muted)',
                        fontWeight: 700,
                      }}>{charLeft}</span>
                    )}
                  </div>
                </>
              )}
              <button
                id="content-submit-btn"
                onClick={handleSubmit}
                disabled={!text.trim() || state === 'checking'}
                style={{
                  background: text.trim() && state !== 'checking'
                    ? 'linear-gradient(135deg, var(--accent), var(--accent-alt))'
                    : 'var(--border)',
                  color: '#fff', border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: compact ? '7px 20px' : '9px 26px',
                  fontWeight: 700, fontSize: compact ? 13 : 14,
                  boxShadow: text.trim() && state !== 'checking'
                    ? '0 2px 12px rgba(124,109,250,0.3)'
                    : 'none',
                  transition: 'var(--transition)',
                }}
              >
                {state === 'checking' ? 'Analyzing…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
