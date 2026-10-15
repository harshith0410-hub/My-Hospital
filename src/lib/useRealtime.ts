import { useEffect, useState, useRef } from 'react';

export interface RealtimeEvent {
  type: string;
  payload?: any;
  time?: string;
}

export function useRealtime(onEvent?: (event: RealtimeEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    function connect() {
      try {
        eventSource = new EventSource('/api/realtime/stream');

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const data: RealtimeEvent = JSON.parse(e.data);
            if (callbackRef.current) {
              callbackRef.current(data);
            }
          } catch (err) {
            // Ignore malformed ping comments
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Attempt reconnect after 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return { isConnected };
}
