/**
 * Tabula Extension - Server Communication
 */

import { SERVER_URL } from "./config";

export async function sendToServer(
  endpoint: string,
  data: unknown
): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (e) {
    console.log(`[Tabula] Failed to send to ${endpoint}:`, e);
    return false;
  }
}

export async function checkServerConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_URL}/health`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}
