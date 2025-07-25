// Custom hook for scroll locking
import { useEffect, useRef } from 'react';

export const useScrollLock = (isLocked) => {
  const scrollPosition = useRef(0);
  const originalStyles = useRef({});

  useEffect(() => {
    if (isLocked) {
      // Store original styles
      originalStyles.current = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width,
        left: document.body.style.left
      };

      // Capture current scroll position
      scrollPosition.current = window.scrollY;
      
      // Apply scroll lock
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPosition.current}px`;
      document.body.style.width = '100%';
      document.body.style.left = '0';
    } else {
      // Restore original styles
      Object.assign(document.body.style, originalStyles.current);
      
      // Restore scroll position
      window.scrollTo(0, scrollPosition.current);
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (isLocked) {
        Object.assign(document.body.style, originalStyles.current);
        window.scrollTo(0, scrollPosition.current);
      }
    };
  }, [isLocked]);
};