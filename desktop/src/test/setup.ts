/**
 * Vitest test setup
 */

import "@testing-library/dom";

// Mock Tauri API
const mockInvoke = vi.fn();
const mockListen = vi.fn(() => Promise.resolve(() => {}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: mockListen,
}));

// Export mocks for test access
export { mockInvoke, mockListen };
