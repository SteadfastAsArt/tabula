/**
 * Tabula Desktop - Status Message Component
 */

import React from "react";

interface StatusMessageProps {
  message?: string;
  isError?: boolean;
}

export function StatusMessage({ message, isError }: StatusMessageProps): React.ReactElement | null {
  if (!message) return null;

  return (
    <div className={`status-message ${isError ? "error" : "success"} visible`}>
      {message}
    </div>
  );
}
