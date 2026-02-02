/**
 * Tabula Desktop - Application State Hook
 */

import { useState, useCallback, useMemo } from "react";
import type {
  TabRecord,
  Settings,
  DailyReport,
  ViewType,
  SortField,
  SortOrder,
  GroupMode,
} from "../types";

export const TABS_PER_PAGE = 50;

export interface AppState {
  tabs: TabRecord[];
  closedTabs: TabRecord[];
  recentlyClosedTabs: TabRecord[];
  settings: Settings;
  report: DailyReport | null;
  currentView: ViewType;
  sortField: SortField;
  sortOrder: SortOrder;
  currentPage: number;
  groupMode: GroupMode;
  collapsedGroups: Set<string>;
  theme: "dark" | "light";
  selectedTabs: Set<number>;
  selectionMode: boolean;
  showOnboarding: boolean;
  onboardingStep: number;
  statusMessage: { text: string; isError: boolean } | null;
}

export interface AppActions {
  setTabs: (tabs: TabRecord[]) => void;
  setClosedTabs: (tabs: TabRecord[]) => void;
  setRecentlyClosedTabs: (tabs: TabRecord[]) => void;
  setSettings: (settings: Settings) => void;
  setReport: (report: DailyReport | null) => void;
  setCurrentView: (view: ViewType) => void;
  setSortField: (field: SortField) => void;
  toggleSortOrder: () => void;
  nextPage: (totalItems: number) => void;
  prevPage: () => void;
  resetPage: () => void;
  setGroupMode: (mode: GroupMode) => void;
  toggleGroupCollapsed: (groupId: string) => void;
  isGroupCollapsed: (groupId: string) => boolean;
  setTheme: (theme: "dark" | "light") => void;
  toggleTabSelection: (tabId: number) => void;
  selectAllTabs: (tabIds: number[]) => void;
  deselectAllTabs: () => void;
  setSelectionMode: (mode: boolean) => void;
  isTabSelected: (tabId: number) => boolean;
  getSelectedTabIds: () => number[];
  setShowOnboarding: (show: boolean) => void;
  setOnboardingStep: (step: number) => void;
  showStatus: (message: string, isError?: boolean) => void;
  clearStatus: () => void;
}

export function useAppState(): [AppState, AppActions] {
  const [tabs, setTabs] = useState<TabRecord[]>([]);
  const [closedTabs, setClosedTabs] = useState<TabRecord[]>([]);
  const [recentlyClosedTabs, setRecentlyClosedTabs] = useState<TabRecord[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [report, setReport] = useState<DailyReport | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("tabs");
  const [sortField, setSortField] = useState<SortField>("last_active");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(0);
  const [groupMode, setGroupModeState] = useState<GroupMode>("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionModeState] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const nextPage = useCallback((totalItems: number) => {
    const maxPage = Math.floor(totalItems / TABS_PER_PAGE);
    setCurrentPage((prev) => (prev < maxPage ? prev + 1 : prev));
  }, []);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  const resetPage = useCallback(() => {
    setCurrentPage(0);
  }, []);

  const setGroupMode = useCallback((mode: GroupMode) => {
    setGroupModeState(mode);
    setCollapsedGroups(new Set());
  }, []);

  const toggleGroupCollapsed = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const isGroupCollapsed = useCallback(
    (groupId: string) => collapsedGroups.has(groupId),
    [collapsedGroups]
  );

  const setTheme = useCallback((newTheme: "dark" | "light") => {
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("tabula-theme", newTheme);
  }, []);

  const toggleTabSelection = useCallback((tabId: number) => {
    setSelectedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) {
        next.delete(tabId);
      } else {
        next.add(tabId);
      }
      setSelectionModeState(next.size > 0);
      return next;
    });
  }, []);

  const selectAllTabs = useCallback((tabIds: number[]) => {
    setSelectedTabs((prev) => {
      const next = new Set(prev);
      tabIds.forEach((id) => next.add(id));
      setSelectionModeState(next.size > 0);
      return next;
    });
  }, []);

  const deselectAllTabs = useCallback(() => {
    setSelectedTabs(new Set());
    setSelectionModeState(false);
  }, []);

  const setSelectionMode = useCallback((mode: boolean) => {
    setSelectionModeState(mode);
    if (!mode) {
      setSelectedTabs(new Set());
    }
  }, []);

  const isTabSelected = useCallback(
    (tabId: number) => selectedTabs.has(tabId),
    [selectedTabs]
  );

  const getSelectedTabIds = useCallback(
    () => Array.from(selectedTabs),
    [selectedTabs]
  );

  const showStatus = useCallback((message: string, isError = false) => {
    setStatusMessage({ text: message, isError });
    setTimeout(() => setStatusMessage(null), 4000);
  }, []);

  const clearStatus = useCallback(() => {
    setStatusMessage(null);
  }, []);

  const state: AppState = useMemo(
    () => ({
      tabs,
      closedTabs,
      recentlyClosedTabs,
      settings,
      report,
      currentView,
      sortField,
      sortOrder,
      currentPage,
      groupMode,
      collapsedGroups,
      theme,
      selectedTabs,
      selectionMode,
      showOnboarding,
      onboardingStep,
      statusMessage,
    }),
    [
      tabs,
      closedTabs,
      recentlyClosedTabs,
      settings,
      report,
      currentView,
      sortField,
      sortOrder,
      currentPage,
      groupMode,
      collapsedGroups,
      theme,
      selectedTabs,
      selectionMode,
      showOnboarding,
      onboardingStep,
      statusMessage,
    ]
  );

  const actions: AppActions = useMemo(
    () => ({
      setTabs,
      setClosedTabs,
      setRecentlyClosedTabs,
      setSettings,
      setReport,
      setCurrentView,
      setSortField,
      toggleSortOrder,
      nextPage,
      prevPage,
      resetPage,
      setGroupMode,
      toggleGroupCollapsed,
      isGroupCollapsed,
      setTheme,
      toggleTabSelection,
      selectAllTabs,
      deselectAllTabs,
      setSelectionMode,
      isTabSelected,
      getSelectedTabIds,
      setShowOnboarding,
      setOnboardingStep,
      showStatus,
      clearStatus,
    }),
    [
      toggleSortOrder,
      nextPage,
      prevPage,
      resetPage,
      setGroupMode,
      toggleGroupCollapsed,
      isGroupCollapsed,
      setTheme,
      toggleTabSelection,
      selectAllTabs,
      deselectAllTabs,
      setSelectionMode,
      isTabSelected,
      getSelectedTabIds,
      showStatus,
      clearStatus,
    ]
  );

  return [state, actions];
}
