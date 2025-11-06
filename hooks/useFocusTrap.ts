import { useEffect, useRef, RefObject } from 'react';

export const useFocusTrap = (ref: RefObject<HTMLElement>, isOpen: boolean): void => {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen && ref.current) {
      triggerRef.current = document.activeElement as HTMLElement;
      const focusableElements = ref.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select'
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Focus the first element when the modal opens
      setTimeout(() => firstElement.focus(), 100);

      const handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      };
      
      const modal = ref.current;
      modal.addEventListener('keydown', handleKeyDown);

      return () => {
        modal.removeEventListener('keydown', handleKeyDown);
        triggerRef.current?.focus();
      };
    } else if (triggerRef.current) {
        triggerRef.current.focus();
        triggerRef.current = null;
    }
  }, [isOpen, ref]);
};
