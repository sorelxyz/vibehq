import { useState, useEffect, useRef } from 'react';
import type { RalphStatus, Step } from '@vibehq/shared';

interface UseRalphLogsResult {
  logs: string;
  status: RalphStatus | null;
  steps: Step[];
  isConnected: boolean;
  error: string | null;
}

export function useRalphLogs(instanceId: string | null): UseRalphLogsResult {
  const [logs, setLogs] = useState('');
  const [status, setStatus] = useState<RalphStatus | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!instanceId) {
      setLogs('');
      setStatus(null);
      setSteps([]);
      setIsConnected(false);
      setError(null);
      return;
    }

    const connect = () => {
      // Connect to WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        // Subscribe to instance
        ws.send(JSON.stringify({ type: 'subscribe', instanceId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'log') {
            if (data.initial) {
              setLogs(data.data);
            } else {
              setLogs(prev => prev + data.data);
            }
          } else if (data.type === 'status') {
            setStatus(data.status);
          } else if (data.type === 'steps') {
            setSteps(data.steps);
          } else if (data.type === 'error') {
            setError(data.message);
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          setError('Connection lost. Please refresh the page.');
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection failed');
        setIsConnected(false);
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'unsubscribe' }));
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [instanceId]);

  return { logs, status, steps, isConnected, error };
}
