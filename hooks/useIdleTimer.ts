import { useEffect, useRef } from 'react';

const useIdleTimer = (onIdle: () => void, timeout: number) => {
  const timeoutId = useRef<number | null>(null);

  const resetTimer = () => {
    if (timeoutId.current) {
      window.clearTimeout(timeoutId.current);
    }
    timeoutId.current = window.setTimeout(onIdle, timeout);
  };

  useEffect(() => {
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    
    const eventListener = () => resetTimer();

    events.forEach(event => window.addEventListener(event, eventListener, { passive: true }));
    resetTimer(); // Start the timer on mount

    return () => {
      if (timeoutId.current) {
        window.clearTimeout(timeoutId.current);
      }
      events.forEach(event => window.removeEventListener(event, eventListener));
    };
  }, [onIdle, timeout]);
};

export default useIdleTimer;
