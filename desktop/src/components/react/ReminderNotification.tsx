/**
 * Tabula Desktop - Reminder Notification Component
 */

import React, { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";

interface Notification {
  id: number;
  title: string;
  body: string;
}

export function ReminderNotification(): React.ReactElement {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unlisten = listen("reminder", (event) => {
      const data = event.payload as { title: string; body: string };
      const id = Date.now();
      setNotifications((prev) => [...prev, { id, ...data }]);

      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 10000);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <>
      {notifications.map((notification) => (
        <div key={notification.id} className="reminder-notification">
          <div className="reminder-content">
            <div className="reminder-title">{notification.title}</div>
            <div className="reminder-body">{notification.body}</div>
          </div>
          <button
            className="reminder-dismiss"
            onClick={() => dismiss(notification.id)}
          >
            &times;
          </button>
        </div>
      ))}
    </>
  );
}
