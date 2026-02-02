/**
 * Browser API Compatibility Layer
 *
 * Provides a unified API that works across Chrome and Firefox.
 * Firefox uses the promise-based `browser.*` namespace,
 * while Chrome uses callback-based `chrome.*` namespace.
 *
 * Modern Firefox also supports chrome.* with callbacks,
 * so this mostly ensures type safety and future compatibility.
 */

// Detect browser type
export const isFirefox = typeof navigator !== 'undefined' &&
  navigator.userAgent.toLowerCase().includes('firefox');

export const isChrome = typeof navigator !== 'undefined' &&
  navigator.userAgent.toLowerCase().includes('chrome') &&
  !navigator.userAgent.toLowerCase().includes('edg');

export const isEdge = typeof navigator !== 'undefined' &&
  navigator.userAgent.toLowerCase().includes('edg');

// Browser info for display
export function getBrowserInfo(): { name: string; version: string } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  if (isFirefox) {
    const match = ua.match(/Firefox\/(\d+)/);
    return { name: 'Firefox', version: match?.[1] || 'unknown' };
  }

  if (isEdge) {
    const match = ua.match(/Edg\/(\d+)/);
    return { name: 'Edge', version: match?.[1] || 'unknown' };
  }

  if (isChrome) {
    const match = ua.match(/Chrome\/(\d+)/);
    return { name: 'Chrome', version: match?.[1] || 'unknown' };
  }

  return { name: 'Unknown', version: 'unknown' };
}

// The chrome namespace is available in both Chrome and Firefox MV3
// Firefox also provides the promise-based browser.* namespace
// For compatibility, we'll use chrome.* which works in both

// Type helper for browser detection
declare global {
  interface Window {
    browser?: typeof chrome;
  }
}

// Use browser API if available (Firefox), fallback to chrome
// In MV3, both Firefox and Chrome support chrome.* APIs
export const browserAPI = typeof globalThis !== 'undefined' &&
  (globalThis as { browser?: typeof chrome }).browser || chrome;

// Utility to check if extension APIs are available
export function hasExtensionAPI(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime;
}

console.log(`[Tabula] Running on ${getBrowserInfo().name} v${getBrowserInfo().version}`);
