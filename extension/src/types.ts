export type TabSnapshot = {
  screenshotPath?: string;
  capturedAt: number;
};

export type TabData = {
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
  /** Rich description extracted from page meta/content (max 500 chars) */
  description?: string;
};

export type CapturePayload = {
  tab: TabData;
  screenshotBase64?: string;
  capturedAt: number;
};

export type TabEvent = {
  type: "created" | "updated" | "activated" | "removed";
  tab: TabData;
  timestamp: number;
};
