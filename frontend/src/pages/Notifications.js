import React from 'react';

/**
 * Notifications page — placeholder (real-time notification system
 * would require a dedicated backend endpoint + push model).
 * Shows a polished empty state with the SafeChat brand.
 */
export default function Notifications() {
    return (
        <div>
            {/* Header */}
            <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                position: 'sticky', top: 0,
                background: 'rgba(8,8,16,0.88)', backdropFilter: 'blur(16px)',
                zIndex: 10,
            }}>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Notifications</h1>
            </div>

            {/* Placeholder items — styled sample */}
            <div style={{ padding: '20px' }}>
                {/* AI Shield notification (pinned) */}
                <div style={{
                    display: 'flex', gap: 14, padding: '16px 18px', marginBottom: 8,
                    background: 'linear-gradient(135deg, rgba(16,217,160,0.07), rgba(124,109,250,0.05))',
                    border: '1px solid rgba(16,217,160,0.18)',
                    borderRadius: 'var(--radius-lg)',
                }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'rgba(16,217,160,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, flexShrink: 0,
                    }}>🛡️</div>
                    <div>
                        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, marginBottom: 3 }}>
                            AI Shield is protecting you
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.55 }}>
                            All content on SafeChat is screened through our 4-layer zero-tolerance moderation system before it ever reaches your feed.
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 6, fontFamily: 'var(--mono)' }}>
                            3 layers active · RoBERTa model loaded
                        </div>
                    </div>
                </div>

                {/* Empty state */}
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 52, marginBottom: 16 }}>🔔</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                        You're all caught up!
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto', lineHeight: 1.7 }}>
                        Notifications for likes, replies, and follows will appear here.
                    </div>
                </div>
            </div>
        </div>
    );
}
