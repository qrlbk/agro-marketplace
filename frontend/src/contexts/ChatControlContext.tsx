import { createContext, useContext, type ReactNode } from "react";

export interface ChatControlContextValue {
  openChat: () => void;
}

const ChatControlContext = createContext<ChatControlContextValue | null>(null);

export function ChatControlProvider({
  openChat,
  children,
}: {
  openChat: () => void;
  children: ReactNode;
}) {
  return (
    <ChatControlContext.Provider value={{ openChat }}>
      {children}
    </ChatControlContext.Provider>
  );
}

export function useChatControl(): ChatControlContextValue | null {
  return useContext(ChatControlContext);
}
