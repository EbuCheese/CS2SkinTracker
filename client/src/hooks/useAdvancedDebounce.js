import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Advanced debounced callback with immediate execution option
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @param {Object} options - Configuration options
 * @param {boolean} options.leading - Execute on the leading edge (default: false)
 * @param {boolean} options.trailing - Execute on the trailing edge (default: true)
 * @param {boolean} options.maxWait - Maximum time to wait before executing (prevents infinite delays)
 * @param {Array} deps - Dependencies array
 * @returns {Object} - Object with debounced function, cancel, and flush methods
 */
export const useAdvancedDebounce = (
  callback,
  delay = 300,
  options = {},
  deps = []
) => {
  const { leading = false, trailing = true, maxWait } = options;
  const timeoutRef = useRef(null);
  const maxTimeoutRef = useRef(null);
  const lastCallTimeRef = useRef(0);
  const lastArgsRef = useRef(null);
  const lastInvokeTimeRef = useRef(0);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    lastArgsRef.current = null;
  }, []);

  const invokeFunction = useCallback((...args) => {
    lastInvokeTimeRef.current = Date.now();
    return callback(...args);
  }, [callback]);

  const flush = useCallback(() => {
    if (lastArgsRef.current) {
      const args = lastArgsRef.current;
      cancel();
      return invokeFunction(...args);
    }
  }, [invokeFunction, cancel]);

  const debouncedFunction = useCallback(
    (...args) => {
      const callTime = Date.now();
      const timeSinceLastInvoke = callTime - lastInvokeTimeRef.current;
      const timeSinceLastCall = callTime - lastCallTimeRef.current;
      
      lastArgsRef.current = args;
      lastCallTimeRef.current = callTime;

      const shouldCallLeading = leading && timeSinceLastInvoke >= delay;
      
      // Clear existing timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (shouldCallLeading) {
        return invokeFunction(...args);
      }

      // Set up maxWait timeout if specified
      if (maxWait && !maxTimeoutRef.current && timeSinceLastInvoke < maxWait) {
        maxTimeoutRef.current = setTimeout(() => {
          const currentArgs = lastArgsRef.current;
          cancel();
          if (currentArgs) {
            invokeFunction(...currentArgs);
          }
        }, maxWait - timeSinceLastInvoke);
      }

      if (trailing) {
        timeoutRef.current = setTimeout(() => {
          const currentArgs = lastArgsRef.current;
          cancel();
          if (currentArgs) {
            invokeFunction(...currentArgs);
          }
        }, delay);
      }
    },
    [callback, delay, leading, trailing, maxWait, invokeFunction, cancel, ...deps]
  );

  // Cleanup on unmount
  useEffect(() => {
    return cancel;
  }, [cancel]);

  return {
    debouncedFunction,
    cancel,
    flush
  };
};