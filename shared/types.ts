/**
 * Tabula - Shared Type Definitions
 *
 * These types are shared between the Chrome Extension and Desktop App
 * to ensure consistency in data structures across the system.
 */

/**
 * Core tab data structure
 * Represents a browser tab with tracking metadata
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
  /** Whether Chrome has discarded this tab to save memory */
  discarded?: boolean;
  /** Timestamp of last screenshot capture */
  lastScreenshotAt?: number;
  /** Rich description extracted from page meta/content (max 8000 words) */
  description?: string;
}

/**
 * Payload sent when capturing a tab with its content and screenshot
 */
export interface CapturePayload {
  tab: TabData;
  /** Base64-encoded JPEG screenshot */
  screenshotBase64?: string;
  capturedAt: number;
}

/**
 * Tab lifecycle events sent from extension to desktop
 */
export interface TabEvent {
  type: "created" | "updated" | "activated" | "removed";
  tab: TabData;
  timestamp: number;
}

/**
 * Tab categories for AI classification
 */
export type TabCategory =
  | "work"
  | "research"
  | "communication"
  | "entertainment"
  | "shopping"
  | "reference"
  | "utility";

/**
 * AI suggestion for a tab
 */
export interface TabSuggestion {
  decision: "keep" | "close" | "unsure";
  reason: string;
  category?: TabCategory;
  /** AI-generated brief summary of the tab content */
  digest?: string;
  scoredAt: number;
}

/**
 * Tab snapshot with captured screenshot
 */
export interface TabSnapshot {
  screenshotPath?: string;
  capturedAt: number;
}

/**
 * Complete tab record stored in desktop app
 */
export interface TabRecord {
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
  /** Rich description extracted from page meta/content (max 8000 words) */
  description?: string;
  snapshot?: TabSnapshot;
  suggestion?: TabSuggestion;
}

/**
 * User settings for AI configuration
 */
export interface Settings {
  openaiApiKey?: string;
  baseUrl?: string;
  model?: string;
  /** User's work context and preferences for AI */
  userContext?: string;
  /** Number of tabs to analyze at once (default: 30) */
  analyzeBatchSize?: number;
}

/**
 * Daily browsing activity report
 */
export interface DailyReport {
  date: string;
  content: string;
  generatedAt: number;
}

/**
 * Extension state persisted to chrome.storage
 */
export interface StoredState {
  tabs: Record<string, TabData>;
  activeTabId: number | null;
  activeWindowId: number | null;
  activeSince: number | null;
}

/**
 * Default state for extension initialization
 */
export const DEFAULT_STATE: StoredState = {
  tabs: {},
  activeTabId: null,
  activeWindowId: null,
  activeSince: null,
};
