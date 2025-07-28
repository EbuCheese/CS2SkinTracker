// Custom hook for scroll locking
import { useEffect, useRef } from 'react';

export const useScrollLock = (isLocked) => {
  // Store the scroll position before locking to restore it later
  const scrollPosition = useRef(0);
  // Store original body styles to restore them when unlocking
  const originalStyles = useRef({});

  useEffect(() => {
    if (isLocked) {
      // Capture and store the current body styles before modifying them
      // This ensures we can restore the exact original state
      originalStyles.current = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width,
        left: document.body.style.left
      };

      // Capture the current scroll position before locking
      scrollPosition.current = window.scrollY;
      
      // Apply scroll lock using position: fixed technique
      // This prevents the scroll jump issue common with overflow: hidden
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPosition.current}px`;
      document.body.style.width = '100%';
      document.body.style.left = '0';
    } else {
      // Restore all original body styles
      Object.assign(document.body.style, originalStyles.current);
      
      // Restore the scroll position that was captured before locking
      // This happens after styles are restored to ensure smooth transition
      window.scrollTo(0, scrollPosition.current);
    }

    // Cleanup function: ensure scroll is unlocked if component unmounts while locked
    // This prevents the page from staying locked if the component is unexpectedly unmounted
    return () => {
      if (isLocked) {
        Object.assign(document.body.style, originalStyles.current);
        window.scrollTo(0, scrollPosition.current);
      }
    };
  }, [isLocked]); // Only re-run when isLocked changes
};