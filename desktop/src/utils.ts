/**
 * Tabula Desktop - Utility Functions
 */

import type { TabRecord, SortField, SortOrder, TabStats, TabCategory, CategoryInfo } from "./types";

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

export const CATEGORIES: CategoryInfo[] = [
  { id: "work", label: "Work", icon: "💼", color: "#6366f1" },
  { id: "research", label: "Research", icon: "📚", color: "#22c55e" },
  { id: "communication", label: "Communication", icon: "💬", color: "#3b82f6" },
  { id: "entertainment", label: "Entertainment", icon: "🎮", color: "#ec4899" },
  { id: "shopping", label: "Shopping", icon: "🛒", color: "#f59e0b" },
  { id: "reference", label: "Reference", icon: "📌", color: "#a855f7" },
  { id: "utility", label: "Utility", icon: "⚙️", color: "#6b7280" },
  { id: "uncategorized", label: "Uncategorized", icon: "📋", color: "#71717a" },
];

export function getCategoryInfo(category?: string): CategoryInfo {
  return CATEGORIES.find((c) => c.id === category) || CATEGORIES[CATEGORIES.length - 1];
}

export function getDetailedStats(tabs: TabRecord[]): TabStats {
  const openTabs = tabs.filter((t) => !t.closed_at);
  const now = Date.now();

  // Basic counts
  const totalTabs = openTabs.length;
  const withScreenshots = openTabs.filter((t) => t.snapshot?.screenshot_path).length;
  const analyzed = openTabs.filter((t) => t.suggestion).length;

  // Time calculations
  const totalActiveTime = openTabs.reduce((sum, t) => sum + t.total_active_ms, 0);
  const avgActiveTime = totalTabs > 0 ? totalActiveTime / totalTabs : 0;

  const ages = openTabs.map((t) => now - t.created_at);
  const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
  const oldestTab = ages.length > 0 ? Math.max(...ages) : 0;
  const newestTab = ages.length > 0 ? Math.min(...ages) : 0;

  // Category counts
  const categoryCounts: Record<TabCategory, number> = {
    work: 0,
    research: 0,
    communication: 0,
    entertainment: 0,
    shopping: 0,
    reference: 0,
    utility: 0,
    uncategorized: 0,
  };

  openTabs.forEach((t) => {
    const cat = (t.suggestion?.category as TabCategory) || "uncategorized";
    categoryCounts[cat]++;
  });

  // Suggestion counts
  const suggestionCounts = { keep: 0, close: 0, unsure: 0 };
  openTabs.forEach((t) => {
    if (t.suggestion?.decision === "keep") suggestionCounts.keep++;
    else if (t.suggestion?.decision === "close") suggestionCounts.close++;
    else if (t.suggestion?.decision === "unsure") suggestionCounts.unsure++;
  });

  // Active time distribution
  const activeTimeDistribution = { under1m: 0, under5m: 0, under30m: 0, over30m: 0 };
  openTabs.forEach((t) => {
    const ms = t.total_active_ms;
    if (ms < 60000) activeTimeDistribution.under1m++;
    else if (ms < 300000) activeTimeDistribution.under5m++;
    else if (ms < 1800000) activeTimeDistribution.under30m++;
    else activeTimeDistribution.over30m++;
  });

  // Age distribution
  const ageDistribution = { under1h: 0, under1d: 0, under7d: 0, over7d: 0 };
  ages.forEach((age) => {
    if (age < 3600000) ageDistribution.under1h++;
    else if (age < 86400000) ageDistribution.under1d++;
    else if (age < 604800000) ageDistribution.under7d++;
    else ageDistribution.over7d++;
  });

  return {
    totalTabs,
    totalActiveTime,
    avgActiveTime,
    avgAge,
    oldestTab,
    newestTab,
    withScreenshots,
    analyzed,
    categoryCounts,
    suggestionCounts,
    activeTimeDistribution,
    ageDistribution,
  };
}

export function groupTabsByCategory(tabs: TabRecord[]): Map<TabCategory, TabRecord[]> {
  const grouped = new Map<TabCategory, TabRecord[]>();

  // Initialize all categories
  CATEGORIES.forEach((cat) => grouped.set(cat.id, []));

  // Group tabs
  tabs.forEach((tab) => {
    const category = (tab.suggestion?.category as TabCategory) || "uncategorized";
    const list = grouped.get(category) || [];
    list.push(tab);
    grouped.set(category, list);
  });

  return grouped;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url?: string): string {
  if (!url) return "unknown";
  try {
    const urlObj = new URL(url);
    // Remove 'www.' prefix for cleaner grouping
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/**
 * Group tabs by domain
 */
export function groupTabsByDomain(tabs: TabRecord[]): Map<string, TabRecord[]> {
  const grouped = new Map<string, TabRecord[]>();

  tabs.forEach((tab) => {
    const domain = extractDomain(tab.url);
    const list = grouped.get(domain) || [];
    list.push(tab);
    grouped.set(domain, list);
  });

  // Sort domains by tab count (descending)
  const sorted = new Map(
    [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)
  );

  return sorted;
}
