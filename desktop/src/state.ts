/**
 * Tabula Desktop - Application State
 */

import type {
  TabRecord,
  Settings,
  DailyReport,
  ViewType,
  SortField,
  SortOrder,
  GroupMode,
} from "./types";

// Pagination constants
export const TABS_PER_PAGE = 50;

// Application state
export let tabs: TabRecord[] = [];
export let closedTabs: TabRecord[] = [];
export let settings: Settings = {};
export let report: DailyReport | null = null;
export let currentView: ViewType = "tabs";
export let sortField: SortField = "last_active";
export let sortOrder: SortOrder = "desc";
export let currentPage: number = 0;
export let groupMode: GroupMode = "none";
export let collapsedGroups: Set<string> = new Set();
export let theme: "dark" | "light" = "dark";

// Selection state for batch operations
export let selectedTabs: Set<number> = new Set();
export let selectionMode: boolean = false;

// State setters
export function setTabs(newTabs: TabRecord[]): void {
  tabs = newTabs;
}

export function setClosedTabs(newClosedTabs: TabRecord[]): void {
  closedTabs = newClosedTabs;
}

export function setSettings(newSettings: Settings): void {
  settings = newSettings;
}

export function setReport(newReport: DailyReport | null): void {
  report = newReport;
}

export function setCurrentView(view: ViewType): void {
  currentView = view;
}

export function setSortField(field: SortField): void {
  sortField = field;
}

export function setSortOrder(order: SortOrder): void {
  sortOrder = order;
}

export function toggleSortOrder(): void {
  sortOrder = sortOrder === "asc" ? "desc" : "asc";
}

export function setCurrentPage(page: number): void {
  currentPage = page;
}

export function nextPage(totalItems: number): void {
  const maxPage = Math.floor(totalItems / TABS_PER_PAGE);
  if (currentPage < maxPage) {
    currentPage++;
  }
}

export function prevPage(): void {
  if (currentPage > 0) {
    currentPage--;
  }
}

export function resetPage(): void {
  currentPage = 0;
}

export function setGroupMode(mode: GroupMode): void {
  groupMode = mode;
  // Reset collapsed groups when changing mode
  collapsedGroups.clear();
}

export function toggleGroupCollapsed(groupId: string): void {
  if (collapsedGroups.has(groupId)) {
    collapsedGroups.delete(groupId);
  } else {
    collapsedGroups.add(groupId);
  }
}

export function isGroupCollapsed(groupId: string): boolean {
  return collapsedGroups.has(groupId);
}

export function setTheme(newTheme: "dark" | "light"): void {
  theme = newTheme;
}

export function toggleTheme(): void {
  theme = theme === "dark" ? "light" : "dark";
}

// Selection state setters
export function toggleTabSelection(tabId: number): void {
  if (selectedTabs.has(tabId)) {
    selectedTabs.delete(tabId);
  } else {
    selectedTabs.add(tabId);
  }
  // Auto-enable selection mode when first tab is selected
  selectionMode = selectedTabs.size > 0;
}

export function selectTab(tabId: number): void {
  selectedTabs.add(tabId);
  selectionMode = true;
}

export function deselectTab(tabId: number): void {
  selectedTabs.delete(tabId);
  selectionMode = selectedTabs.size > 0;
}

export function selectAllTabs(tabIds: number[]): void {
  tabIds.forEach((id) => selectedTabs.add(id));
  selectionMode = selectedTabs.size > 0;
}

export function deselectAllTabs(): void {
  selectedTabs.clear();
  selectionMode = false;
}

export function isTabSelected(tabId: number): boolean {
  return selectedTabs.has(tabId);
}

export function getSelectedTabIds(): number[] {
  return Array.from(selectedTabs);
}

export function setSelectionMode(mode: boolean): void {
  selectionMode = mode;
  if (!mode) {
    selectedTabs.clear();
  }
}
