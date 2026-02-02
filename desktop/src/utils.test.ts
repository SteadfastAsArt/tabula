/**
 * Tabula Desktop - Utils Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  escapeHtml,
  formatDuration,
  formatAge,
  sortTabs,
  groupTabsByDomain,
  groupTabsByCategory,
  getStats,
} from "./utils";
import type { TabRecord } from "./types";

describe("escapeHtml", () => {
  it("should escape angle brackets", () => {
    const result = escapeHtml("<script>alert()</script>");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
  });

  it("should escape ampersands", () => {
    expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
  });

  it("should handle empty strings", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("should preserve normal text", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });
});

describe("formatDuration", () => {
  it("should return 0s for zero", () => {
    expect(formatDuration(0)).toBe("0s");
  });

  it("should format seconds", () => {
    expect(formatDuration(1000)).toBe("1s");
    expect(formatDuration(30000)).toBe("30s");
  });

  it("should format minutes", () => {
    expect(formatDuration(60000)).toBe("1m");
    expect(formatDuration(120000)).toBe("2m");
  });

  it("should format hours with minutes", () => {
    expect(formatDuration(3600000)).toBe("1h 0m");
    expect(formatDuration(3660000)).toBe("1h 1m");
    expect(formatDuration(7200000)).toBe("2h 0m");
  });
});

describe("formatAge", () => {
  it("should return 'just now' for recent timestamps", () => {
    const now = Date.now();
    expect(formatAge(now - 1000)).toBe("just now");
    expect(formatAge(now - 30000)).toBe("just now");
  });

  it("should format minutes ago", () => {
    const now = Date.now();
    expect(formatAge(now - 60000)).toBe("1m ago");
    expect(formatAge(now - 300000)).toBe("5m ago");
  });

  it("should format hours", () => {
    const now = Date.now();
    expect(formatAge(now - 3600000)).toBe("< 1 day");
    expect(formatAge(now - 7200000)).toBe("< 1 day");
  });

  it("should format days", () => {
    const now = Date.now();
    expect(formatAge(now - 86400000)).toBe("1d ago");
    expect(formatAge(now - 172800000)).toBe("2d ago");
  });
});

describe("sortTabs", () => {
  const mockTabs: TabRecord[] = [
    {
      id: 1,
      url: "https://a.com",
      title: "Zebra",
      created_at: 1000,
      last_active_at: 3000,
      total_active_ms: 100,
      is_active: false,
    },
    {
      id: 2,
      url: "https://b.com",
      title: "Apple",
      created_at: 2000,
      last_active_at: 1000,
      total_active_ms: 300,
      is_active: false,
    },
    {
      id: 3,
      url: "https://c.com",
      title: "Mango",
      created_at: 3000,
      last_active_at: 2000,
      total_active_ms: 200,
      is_active: false,
    },
  ];

  it("should sort by title ascending", () => {
    const sorted = sortTabs(mockTabs, "title", "asc");
    expect(sorted[0].title).toBe("Apple");
    expect(sorted[1].title).toBe("Mango");
    expect(sorted[2].title).toBe("Zebra");
  });

  it("should sort by title descending", () => {
    const sorted = sortTabs(mockTabs, "title", "desc");
    expect(sorted[0].title).toBe("Zebra");
    expect(sorted[1].title).toBe("Mango");
    expect(sorted[2].title).toBe("Apple");
  });

  it("should sort by created_at ascending", () => {
    const sorted = sortTabs(mockTabs, "created", "asc");
    expect(sorted[0].id).toBe(1);
    expect(sorted[2].id).toBe(3);
  });

  it("should sort by last_active_at descending", () => {
    const sorted = sortTabs(mockTabs, "last_active", "desc");
    expect(sorted[0].id).toBe(1); // last_active_at: 3000
    expect(sorted[2].id).toBe(2); // last_active_at: 1000
  });

  it("should sort by active_time descending", () => {
    const sorted = sortTabs(mockTabs, "active_time", "desc");
    expect(sorted[0].total_active_ms).toBe(300);
    expect(sorted[2].total_active_ms).toBe(100);
  });
});

describe("groupTabsByDomain", () => {
  const mockTabs: TabRecord[] = [
    { id: 1, url: "https://github.com/a", title: "A", created_at: 0, total_active_ms: 0, is_active: false },
    { id: 2, url: "https://github.com/b", title: "B", created_at: 0, total_active_ms: 0, is_active: false },
    { id: 3, url: "https://google.com/c", title: "C", created_at: 0, total_active_ms: 0, is_active: false },
  ];

  it("should group tabs by domain", () => {
    const grouped = groupTabsByDomain(mockTabs);
    expect(grouped.get("github.com")?.length).toBe(2);
    expect(grouped.get("google.com")?.length).toBe(1);
  });

  it("should handle tabs without URL", () => {
    const tabs: TabRecord[] = [
      { id: 1, title: "No URL", created_at: 0, total_active_ms: 0, is_active: false },
    ];
    const grouped = groupTabsByDomain(tabs);
    expect(grouped.get("unknown")?.length).toBe(1);
  });
});

describe("groupTabsByCategory", () => {
  const mockTabs: TabRecord[] = [
    {
      id: 1,
      url: "https://a.com",
      title: "A",
      created_at: 0,
      total_active_ms: 0,
      is_active: false,
      suggestion: { decision: "keep", reason: "test", category: "work", scored_at: 0 },
    },
    {
      id: 2,
      url: "https://b.com",
      title: "B",
      created_at: 0,
      total_active_ms: 0,
      is_active: false,
      suggestion: { decision: "keep", reason: "test", category: "work", scored_at: 0 },
    },
    {
      id: 3,
      url: "https://c.com",
      title: "C",
      created_at: 0,
      total_active_ms: 0,
      is_active: false,
      suggestion: { decision: "close", reason: "test", category: "entertainment", scored_at: 0 },
    },
    {
      id: 4,
      url: "https://d.com",
      title: "D",
      created_at: 0,
      total_active_ms: 0,
      is_active: false,
      // No suggestion - should go to uncategorized
    },
  ];

  it("should group tabs by category", () => {
    const grouped = groupTabsByCategory(mockTabs);
    expect(grouped.get("work")?.length).toBe(2);
    expect(grouped.get("entertainment")?.length).toBe(1);
    expect(grouped.get("uncategorized")?.length).toBe(1);
  });
});

describe("getStats", () => {
  const mockTabs: TabRecord[] = [
    {
      id: 1,
      url: "https://a.com",
      title: "A",
      created_at: Date.now() - 3600000,
      total_active_ms: 60000,
      is_active: false,
      snapshot: { screenshot_path: "/path", captured_at: Date.now() },
      suggestion: { decision: "keep", reason: "test", scored_at: 0 },
    },
    {
      id: 2,
      url: "https://b.com",
      title: "B",
      created_at: Date.now() - 7200000,
      total_active_ms: 120000,
      is_active: false,
      suggestion: { decision: "close", reason: "test", scored_at: 0 },
    },
    {
      id: 3,
      url: "https://c.com",
      title: "C",
      created_at: Date.now() - 1800000,
      total_active_ms: 30000,
      is_active: false,
      closed_at: Date.now(), // This one is closed
    },
  ];

  it("should count only open tabs", () => {
    const stats = getStats(mockTabs);
    expect(stats.total).toBe(2); // Only open tabs (id: 1 and 2)
  });

  it("should count screenshots", () => {
    const stats = getStats(mockTabs);
    expect(stats.withScreenshots).toBe(1);
  });

  it("should count analyzed tabs", () => {
    const stats = getStats(mockTabs);
    expect(stats.analyzed).toBe(2);
    expect(stats.unanalyzed).toBe(0);
  });
});
