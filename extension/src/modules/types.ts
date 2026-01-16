/**
 * Tab Cleanser Extension - Type Definitions
 */

export interface TabData {
  id: number;
  windowId?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  createdAt: number;
  lastActiveAt?: number;
  totalActiveMs: number;
  isActive: boolean;
  closedAt?: number;
  discarded?: boolean;
  lastScreenshotAt?: number;
}

export interface StoredState {
  tabs: Record<string, TabData>;
  activeTabId: number | null;
  activeWindowId: number | null;
  activeSince: number | null;
}

export interface CapturePayload {
  tab: TabData;
  text?: string;
  screenshotBase64?: string;
  capturedAt: number;
}

export interface TabEvent {
  type: "created" | "updated" | "activated" | "removed";
  tab: TabData;
  timestamp: number;
}

export const DEFAULT_STATE: StoredState = {
  tabs: {},
  activeTabId: null,
  activeWindowId: null,
  activeSince: null,
};
