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
  
  // Ref to store the main debounce timeout
  const timeoutRef = useRef(null);
  // Ref to store the maxWait timeout (prevents infinite delays)
  const maxTimeoutRef = useRef(null);
  // Timestamp of the last function call attempt
  const lastCallTimeRef = useRef(0);
  // Store the most recent arguments passed to the debounced function
  const lastArgsRef = useRef(null);
  // Timestamp of the last actual function execution
  const lastInvokeTimeRef = useRef(0);

  // Cancels all pending timeouts and resets state
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    // Clear stored arguments to prevent flush from executing stale calls
    lastArgsRef.current = null;
  }, []);

  // Internal function wrapper that updates invoke time and calls the original callback
  const invokeFunction = useCallback((...args) => {
    lastInvokeTimeRef.current = Date.now();
    return callback(...args);
  }, [callback]);

  // Immediately executes the callback with the last stored arguments
  const flush = useCallback(() => {
    if (lastArgsRef.current) {
      const args = lastArgsRef.current;
      cancel();
      return invokeFunction(...args);
    }
  }, [invokeFunction, cancel]);

  // The main debounced function that handles all the timing logic
  const debouncedFunction = useCallback(
    (...args) => {
      const callTime = Date.now();
      const timeSinceLastInvoke = callTime - lastInvokeTimeRef.current;
      const timeSinceLastCall = callTime - lastCallTimeRef.current;
      
      // Store the current call's arguments and timestamp
      lastArgsRef.current = args;
      lastCallTimeRef.current = callTime;

      // Check if we should execute immediately (leading edge)
      const shouldCallLeading = leading && timeSinceLastInvoke >= delay;
      
      // Clear any existing timeout to reset the delay
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Execute immediately if leading edge is enabled and enough time has passed
      if (shouldCallLeading) {
        return invokeFunction(...args);
      }

      // Set up maxWait timeout to prevent infinite delays
      // Only create if maxWait is specified and we haven't already created one
      if (maxWait && !maxTimeoutRef.current && timeSinceLastInvoke < maxWait) {
        maxTimeoutRef.current = setTimeout(() => {
          const currentArgs = lastArgsRef.current;
          cancel(); // This will clear both timeouts and reset state
          if (currentArgs) {
            invokeFunction(...currentArgs);
          }
        }, maxWait - timeSinceLastInvoke);
      }

      // Set up trailing edge execution (the standard debounce behavior)
      if (trailing) {
        timeoutRef.current = setTimeout(() => {
          const currentArgs = lastArgsRef.current;
          cancel(); // Clear state after execution
          if (currentArgs) {
            invokeFunction(...currentArgs);
          }
        }, delay);
      }
    },
    [callback, delay, leading, trailing, maxWait, invokeFunction, cancel, ...deps]
  );

  // Cleanup timeouts when component unmounts to prevent memory leaks
  useEffect(() => {
    return cancel;
  }, [cancel]);

  return {
    debouncedFunction,
    cancel,
    flush
  };
};