/**
 * Tab Cleanser Extension - State Management
 * 
 * Uses chrome.storage.local to persist data (MV3 service workers can die anytime)
 */

import { StoredState, DEFAULT_STATE } from "./types";

export async function getState(): Promise<StoredState> {
  const result = await chrome.storage.local.get("state");
  return result.state ?? { ...DEFAULT_STATE };
}

export async function setState(state: StoredState): Promise<void> {
  await chrome.storage.local.set({ state });
}

export async function updateState(
  updater: (state: StoredState) => StoredState
): Promise<StoredState> {
  const state = await getState();
  const newState = updater(state);
  await setState(newState);
  return newState;
}
