export type TabSnapshot = {
  text?: string;
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
};

export type CapturePayload = {
  tab: TabData;
  text?: string;
  screenshotBase64?: string;
  capturedAt: number;
};

export type TabEvent = {
  type: "created" | "updated" | "activated" | "removed";
  tab: TabData;
  timestamp: number;
};
