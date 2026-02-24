import React, { createContext, useContext } from "react";

const NotificationsCountContext = createContext<(() => void) | null>(null);

export function NotificationsCountProvider({
  refresh,
  children,
}: {
  refresh: () => void;
  children: React.ReactNode;
}) {
  return (
    <NotificationsCountContext.Provider value={refresh}>
      {children}
    </NotificationsCountContext.Provider>
  );
}

export function useNotificationsCountRefresh() {
  return useContext(NotificationsCountContext);
}
