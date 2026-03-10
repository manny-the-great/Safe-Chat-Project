/**
 * useSocket — native WebSocket hook for Django Channels
 *
 * Django Channels uses raw WebSocket (ws://), NOT socket.io.
 * We connect to /ws/feed/ and handle JSON messages from the server.
 */
import { useEffect, useRef, useCallback } from 'react';

const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

export const useSocket = (onNewPost, onNewComment, onPostLiked) => {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const token = localStorage.getItem('safechat_token');
    const url = `${WS_BASE}/ws/feed/${token ? `?token=${token}` : ''}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[SafeChat WS] Connected to feed');
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'new_post'  && onNewPost)   onNewPost(msg.post);
          if (msg.type === 'new_comment' && onNewComment) onNewComment(msg.comment);
          if (msg.type === 'post_liked'  && onPostLiked)  onPostLiked(msg);
        } catch (err) {
          console.warn('[SafeChat WS] Bad message:', e.data);
        }
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        if (!mountedRef.current) return;
        console.log('[SafeChat WS] Disconnected — reconnecting in 3s');
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    } catch (err) {
      console.warn('[SafeChat WS] Connection failed:', err);
    }
  }, [onNewPost, onNewComment, onPostLiked]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect loop
        wsRef.current.close();
      }
    };
  }, [connect]);

  const emit = useCallback((event, data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: event, ...data }));
    }
  }, []);

  return { emit };
};
