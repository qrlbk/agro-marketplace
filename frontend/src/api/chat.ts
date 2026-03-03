import { API, request, getErrorMessage } from "./core";
import type {
  ChatMessageIn,
  ChatMessageOut,
  ChatSessionItem,
  ChatSessionMessage,
  ChatStreamCallbacks,
  OpenAIHealth,
} from "./types";

export type {
  ChatHistoryItem,
  ChatMessageIn,
  ChatMessageOut,
  ChatSessionItem,
  ChatSessionMessage,
  ChatStreamCallbacks,
  OpenAIHealth,
} from "./types";

export function getOpenAIHealth(): Promise<OpenAIHealth> {
  return request<OpenAIHealth>("/health/openai");
}

export function sendChatMessage(body: ChatMessageIn, token?: string | null): Promise<ChatMessageOut> {
  return request<ChatMessageOut>("/chat/message", {
    method: "POST",
    body: JSON.stringify(body),
    ...(token ? { token } : {}),
  });
}

export function getChatSessions(token: string): Promise<ChatSessionItem[]> {
  return request<ChatSessionItem[]>("/chat/sessions", { token });
}

export function getChatSessionMessages(sessionId: number, token: string): Promise<ChatSessionMessage[]> {
  return request<ChatSessionMessage[]>(`/chat/sessions/${sessionId}/messages`, { token });
}

export function sendChatFeedback(
  messageId: string,
  isPositive: boolean,
  token?: string | null
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/chat/feedback", {
    method: "POST",
    body: JSON.stringify({ message_id: messageId, is_positive: isPositive }),
    ...(token ? { token } : {}),
  });
}

const CHAT_STREAM_TIMEOUT_MS = 60000;

export function sendChatMessageStream(
  body: ChatMessageIn,
  token: string | null | undefined,
  callbacks: ChatStreamCallbacks
): { abort: () => void } {
  const ac = new AbortController();
  const timeoutId = setTimeout(() => {
    ac.abort();
    callbacks.onError("Превышено время ожидания ответа. Попробуйте ещё раз.");
  }, CHAT_STREAM_TIMEOUT_MS);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  fetch(API + "/chat/message/stream", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: ac.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        callbacks.onError(getErrorMessage(err.detail ?? err));
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onDone(null, undefined);
        return;
      }
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const block of lines) {
            const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            try {
              const data = JSON.parse(dataLine.slice(6)) as {
                content?: string;
                done?: boolean;
                suggested_catalog_url?: string | null;
                suggested_follow_ups?: string[];
              };
              if (data.content != null) callbacks.onChunk(data.content);
              if (data.done) {
                callbacks.onDone(data.suggested_catalog_url ?? null, data.suggested_follow_ups);
                return;
              }
            } catch {
              /* skip malformed event */
            }
          }
        }
        callbacks.onDone(null, undefined);
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          callbacks.onError("Запрос отменён.");
        } else {
          callbacks.onError("Помощник временно недоступен. Попробуйте позже.");
        }
      }
    })
    .catch(() => {
      callbacks.onError("Не удалось подключиться к бэкенду. Запущен ли сервер (порт 8000)?");
    })
    .finally(() => {
      clearTimeout(timeoutId);
    });

  return {
    abort: () => {
      clearTimeout(timeoutId);
      ac.abort();
    },
  };
}
