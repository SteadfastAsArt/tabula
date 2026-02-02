/**
 * Tabula Desktop - Main App Component
 */

import React, { useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import * as api from "./api";
import { useAppState } from "./hooks/useAppState";
import { Sidebar } from "./components/react/Sidebar";
import { TabsView } from "./views/react/TabsView";
import { StatsView } from "./views/react/StatsView";
import { HistoryView } from "./views/react/HistoryView";
import { ReportView } from "./views/react/ReportView";
import { SettingsView } from "./views/react/SettingsView";
import { OnboardingModal } from "./components/react/OnboardingModal";
import { StatusMessage } from "./components/react/StatusMessage";
import { ReminderNotification } from "./components/react/ReminderNotification";

export function App(): React.ReactElement {
  const [state, actions] = useAppState();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tabs, closedTabs, settings, report, recentlyClosed] = await Promise.all([
          api.getTabs(),
          api.getClosedTabs(),
          api.getSettings(),
          api.getReport(),
          api.getRecentlyClosedTabs(50),
        ]);
        actions.setTabs(tabs);
        actions.setClosedTabs(closedTabs);
        actions.setSettings(settings);
        actions.setReport(report);
        actions.setRecentlyClosedTabs(recentlyClosed);
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    };

    // Load theme
    const savedTheme = localStorage.getItem("tabula-theme") as "dark" | "light" | null;
    const theme = savedTheme || "dark";
    actions.setTheme(theme);

    // Check onboarding
    const onboardingComplete = localStorage.getItem("tabula-onboarding-completed") === "true";
    actions.setShowOnboarding(!onboardingComplete);

    loadData();
  }, [actions]);

  // Listen for Tauri events
  useEffect(() => {
    const unlistenTab = listen("tab-captured", async () => {
      const [tabs, recentlyClosed] = await Promise.all([
        api.getTabs(),
        api.getRecentlyClosedTabs(50),
      ]);
      actions.setTabs(tabs);
      actions.setRecentlyClosedTabs(recentlyClosed);
    });

    const unlistenEvent = listen("tab-event", async () => {
      const [tabs, recentlyClosed] = await Promise.all([
        api.getTabs(),
        api.getRecentlyClosedTabs(50),
      ]);
      actions.setTabs(tabs);
      actions.setRecentlyClosedTabs(recentlyClosed);
    });

    return () => {
      unlistenTab.then((fn) => fn());
      unlistenEvent.then((fn) => fn());
    };
  }, [actions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (state.currentView !== "tabs") return;

      // Ctrl/Cmd + A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        const openTabs = state.tabs.filter((t) => !t.closed_at);
        actions.selectAllTabs(openTabs.map((t) => t.id));
        return;
      }

      // Escape: Cancel selection
      if (e.key === "Escape" && state.selectionMode) {
        e.preventDefault();
        actions.deselectAllTabs();
        return;
      }

      // Delete/Backspace: Close selected
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        state.selectionMode &&
        state.selectedTabs.size > 0
      ) {
        e.preventDefault();
        const selectedIds = actions.getSelectedTabIds();
        if (confirm(`Close ${selectedIds.length} selected tab${selectedIds.length > 1 ? "s" : ""}?`)) {
          try {
            const count = await api.closeTabsBatch(selectedIds);
            actions.deselectAllTabs();
            const [tabs, recentlyClosed] = await Promise.all([
              api.getTabs(),
              api.getRecentlyClosedTabs(50),
            ]);
            actions.setTabs(tabs);
            actions.setRecentlyClosedTabs(recentlyClosed);
            actions.showStatus(`Closed ${count} tabs`);
          } catch (err) {
            actions.showStatus(`Error: ${err}`, true);
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state.currentView, state.tabs, state.selectionMode, state.selectedTabs, actions]);

  const handleViewChange = useCallback(
    (view: typeof state.currentView) => {
      actions.setCurrentView(view);
      actions.resetPage();
    },
    [actions]
  );

  const loadTabs = useCallback(async () => {
    const tabs = await api.getTabs();
    actions.setTabs(tabs);
  }, [actions]);

  const loadRecentlyClosedTabs = useCallback(async () => {
    const recentlyClosed = await api.getRecentlyClosedTabs(50);
    actions.setRecentlyClosedTabs(recentlyClosed);
  }, [actions]);

  const renderContent = () => {
    switch (state.currentView) {
      case "tabs":
        return (
          <TabsView
            state={state}
            actions={actions}
            loadTabs={loadTabs}
            loadRecentlyClosedTabs={loadRecentlyClosedTabs}
          />
        );
      case "stats":
        return <StatsView tabs={state.tabs} />;
      case "history":
        return (
          <HistoryView
            closedTabs={state.closedTabs}
            loadClosedTabs={async () => {
              const closedTabs = await api.getClosedTabs();
              actions.setClosedTabs(closedTabs);
            }}
            showStatus={actions.showStatus}
          />
        );
      case "report":
        return (
          <ReportView
            report={state.report}
            onGenerateReport={async () => {
              const report = await api.generateReport();
              actions.setReport(report);
            }}
            showStatus={actions.showStatus}
          />
        );
      case "settings":
        return (
          <SettingsView
            settings={state.settings}
            theme={state.theme}
            onSaveSettings={async (settings) => {
              await api.saveSettings(settings);
              actions.setSettings(settings);
            }}
            onThemeChange={actions.setTheme}
            showStatus={actions.showStatus}
          />
        );
    }
  };

  return (
    <div className="layout">
      <Sidebar
        currentView={state.currentView}
        tabs={state.tabs}
        onViewChange={handleViewChange}
      />
      <main className="content">
        {renderContent()}
        <StatusMessage
          message={state.statusMessage?.text}
          isError={state.statusMessage?.isError}
        />
      </main>
      {state.showOnboarding && (
        <OnboardingModal
          currentStep={state.onboardingStep}
          onNext={() => actions.setOnboardingStep(state.onboardingStep + 1)}
          onPrev={() => actions.setOnboardingStep(state.onboardingStep - 1)}
          onSkip={() => {
            actions.setShowOnboarding(false);
            localStorage.setItem("tabula-onboarding-completed", "true");
          }}
          onFinish={() => {
            actions.setShowOnboarding(false);
            localStorage.setItem("tabula-onboarding-completed", "true");
          }}
        />
      )}
      <ReminderNotification />
    </div>
  );
}
