/**
 * Tab Cleanser Desktop - Utility Functions
 */

import type { TabRecord, SortField, SortOrder } from "./types";

export function formatDuration(ms: number): string {
  if (ms < 1000) return "0s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `${hours}h ${rem}m`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAge(createdAt: number): string {
  const ms = Date.now() - createdAt;
  if (ms < 60000) return "just now";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return "< 1 day";
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function getScreenshotUrl(
  screenshotPath: string,
  capturedAt?: number
): string {
  const filename = screenshotPath.split("/").pop() || "";
  const cacheBuster = capturedAt || Date.now();
  return `http://localhost:21890/screenshot/${encodeURIComponent(filename)}?t=${cacheBuster}`;
}

export function getScreenshotFreshness(capturedAt: number): {
  label: string;
  isStale: boolean;
} {
  const ageMs = Date.now() - capturedAt;
  const ageMinutes = Math.floor(ageMs / 60000);

  if (ageMinutes < 5) return { label: "just now", isStale: false };
  if (ageMinutes < 60) return { label: `${ageMinutes}m ago`, isStale: false };

  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24)
    return { label: `${ageHours}h ago`, isStale: ageHours > 2 };

  const ageDays = Math.floor(ageHours / 24);
  return { label: `${ageDays}d ago`, isStale: true };
}

export function getCategoryLabel(category?: string): string {
  const labels: Record<string, string> = {
    work: "💼 Work",
    research: "📚 Research",
    communication: "💬 Communication",
    entertainment: "🎮 Entertainment",
    shopping: "🛒 Shopping",
    reference: "📌 Reference",
    utility: "⚙️ Utility",
  };
  return category ? labels[category] || category : "";
}

export function getCategoryClass(category?: string): string {
  return category ? `category-${category}` : "";
}

export function sortTabs(
  tabList: TabRecord[],
  sortField: SortField,
  sortOrder: SortOrder
): TabRecord[] {
  const sorted = [...tabList];
  const multiplier = sortOrder === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "last_active":
        cmp = (a.last_active_at || 0) - (b.last_active_at || 0);
        break;
      case "created":
        cmp = a.created_at - b.created_at;
        break;
      case "title":
        cmp = (a.title || "").localeCompare(b.title || "");
        break;
      case "active_time":
        cmp = a.total_active_ms - b.total_active_ms;
        break;
      case "has_screenshot":
        cmp =
          (a.snapshot?.screenshot_path ? 1 : 0) -
          (b.snapshot?.screenshot_path ? 1 : 0);
        break;
      case "has_analysis":
        cmp = (a.suggestion ? 1 : 0) - (b.suggestion ? 1 : 0);
        break;
    }
    return cmp * multiplier;
  });

  return sorted;
}

export function getStats(tabs: TabRecord[]) {
  const openTabs = tabs.filter((t) => !t.closed_at);
  const withScreenshots = openTabs.filter(
    (t) => t.snapshot?.screenshot_path
  ).length;
  const analyzed = openTabs.filter((t) => t.suggestion).length;
  const unanalyzed = openTabs.length - analyzed;
  return { total: openTabs.length, withScreenshots, analyzed, unanalyzed };
}

export function formatReportContent(content: string): string {
  return content
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith("<")) return match;
      return `<p>${match}</p>`;
    });
}
