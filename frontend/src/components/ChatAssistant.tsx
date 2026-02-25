import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, X, Send, RotateCw, MessageSquarePlus, ExternalLink, Square } from "lucide-react";
import { sendChatMessage, sendChatMessageStream, getOpenAIHealth } from "../api/client";
import { Button, Input } from "./ui";
import { useAuth } from "../hooks/useAuth";

const DISCLAIMER_SEEN_KEY = "agro-chat-disclaimer-seen";
const CHAT_MESSAGES_KEY = "agro-chat-messages";
const MAX_STORED_MESSAGES = 25;

/** Suggested prompts — hide after this many messages */
const QUICK_REPLIES_HIDE_AFTER = 2;
const QUICK_REPLIES: string[] = [
  "Какие семена есть?",
  "Как найти запчасти для моей техники?",
  "Покажи товары по удобрениям",
  "Как проверить совместимость?",
];

const BATCH_MS = 80;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  suggestedCatalogUrl?: string;
  streamTruncated?: boolean;
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1" aria-live="polite" aria-label="Помощник печатает">
      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

/** Strip markdown links [text](url) to just the link text so no raw URL is shown. */
function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
}

/** Turn assistant text into React nodes. Only relative /catalog and /products URLs become clickable; absolute URLs are shown as plain text so no raw link is visible. */
function renderAssistantContent(content: string): React.ReactNode {
  const cleaned = stripMarkdownLinks(content);
  const urlLike = /(\/(?:catalog|products)[^\s<>]*)/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(urlLike.source, "gi");
  while ((m = re.exec(cleaned)) !== null) {
    if (m.index > lastIndex) {
      parts.push(cleaned.slice(lastIndex, m.index));
    }
    const url = m[0];
    parts.push(
      <Link
        key={m.index}
        to={url}
        className="underline text-emerald-700 hover:text-emerald-800"
      >
        Открыть в каталоге
      </Link>
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < cleaned.length) parts.push(cleaned.slice(lastIndex));
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

export interface ChatAssistantProps {
  /** Controlled: when set, panel visibility is driven by parent; floating button hidden */
  isOpen?: boolean;
  onClose?: () => void;
}

function loadStoredMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(CHAT_MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const list = parsed.slice(-MAX_STORED_MESSAGES) as ChatMessage[];
    return list.filter(
      (m) => m && typeof m.role === "string" && typeof m.content === "string"
    );
  } catch {
    return [];
  }
}

export function ChatAssistant({ isOpen, onClose }: ChatAssistantProps = {}) {
  const { token } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = isOpen !== undefined && typeof onClose === "function";
  const open = isControlled ? isOpen : internalOpen;
  const [messages, setMessages] = useState<ChatMessage[]>(loadStoredMessages);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasCheckedDisclaimer = useRef(false);
  const streamAbortRef = useRef<{ abort: () => void } | null>(null);
  const streamBufferRef = useRef("");
  const streamBatchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open && !hasCheckedDisclaimer.current) {
      hasCheckedDisclaimer.current = true;
      try {
        if (!localStorage.getItem(DISCLAIMER_SEEN_KEY)) {
          setShowDisclaimerModal(true);
        }
      } catch {
        /* ignore */
      }
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      const toStore = messages.slice(-MAX_STORED_MESSAGES);
      sessionStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(toStore));
    } catch {
      /* ignore */
    }
  }, [messages]);

  const handleCloseModal = () => {
    try {
      localStorage.setItem(DISCLAIMER_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setShowDisclaimerModal(false);
  };

  const handleNewDialog = () => {
    setMessages([]);
    try {
      sessionStorage.removeItem(CHAT_MESSAGES_KEY);
    } catch {
      /* ignore */
    }
  };

  const flushStreamBuffer = () => {
    streamBatchRef.current = null;
    const add = streamBufferRef.current;
    if (!add) return;
    streamBufferRef.current = "";
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant" && !last.isError) {
        next[next.length - 1] = { ...last, content: last.content + add };
        return next;
      }
      return prev;
    });
  };

  const sendWithText = (text: string) => {
    if (!text.trim() || loading) return;
    const trimmed = text.trim();
    setInputValue("");
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    streamBufferRef.current = "";
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const placeholder: ChatMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, placeholder]);

    const { abort } = sendChatMessageStream(
      { message: trimmed, history },
      token ?? undefined,
      {
        onChunk(chunk) {
          streamBufferRef.current += chunk;
          if (streamBatchRef.current === null) {
            streamBatchRef.current = setTimeout(flushStreamBuffer, BATCH_MS);
          }
        },
        onDone(suggestedCatalogUrl) {
          if (streamBatchRef.current) clearTimeout(streamBatchRef.current);
          flushStreamBuffer();
          streamAbortRef.current = null;
          setLoading(false);
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                content: last.content || "—",
                suggestedCatalogUrl: suggestedCatalogUrl ?? undefined,
              };
            }
            return next;
          });
        },
        onError(hint) {
          if (streamBatchRef.current) clearTimeout(streamBatchRef.current);
          const pending = streamBufferRef.current;
          streamBufferRef.current = "";
          flushStreamBuffer();
          streamAbortRef.current = null;
          setLoading(false);
          setMessages((prev) => {
            const next = prev.slice(0, -1);
            const partial = prev[prev.length - 1];
            const contentSoFar = (partial?.role === "assistant" ? partial.content : "") + pending;
            const hadContent = contentSoFar.length > 0;
            next.push({
              role: "assistant",
              content: hadContent ? `${contentSoFar}\n\n[Ответ обрезан.] ${hint}` : hint,
              isError: true,
              streamTruncated: hadContent,
            });
            return next;
          });
        },
      }
    );
    streamAbortRef.current = { abort };
  };

  const handleStopStream = () => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
    }
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    sendWithText(text);
  };

  const handleRetry = async (errorMessageIndex: number) => {
    const userIndex = errorMessageIndex - 1;
    if (userIndex < 0 || messages[userIndex]?.role !== "user") return;
    const userContent = messages[userIndex].content;
    const historyBeforeUser = messages
      .slice(0, userIndex)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => prev.filter((_, i) => i !== errorMessageIndex));
    setLoading(true);
    try {
      const res = await sendChatMessage(
        { message: userContent, history: historyBeforeUser },
        token ?? undefined
      );
      setMessages((prev) => [
        ...prev.slice(0, userIndex + 1),
        {
          role: "assistant",
          content: res.reply,
          suggestedCatalogUrl: res.suggested_catalog_url ?? undefined,
        },
      ]);
    } catch {
      let hint = "Помощник временно недоступен. Попробуйте позже.";
      try {
        const health = await getOpenAIHealth();
        if (!health.key_set) {
          hint =
            "OpenAI не настроен: добавьте OPENAI_API_KEY в backend/.env и перезапустите бэкенд.";
        } else if (health.error) {
          hint = `Ошибка OpenAI: ${health.error}`;
        }
      } catch {
        hint =
          "Не удалось подключиться к бэкенду. Запущен ли сервер (порт 8000)?";
      }
      setMessages((prev) => [
        ...prev.slice(0, userIndex + 1),
        { role: "assistant", content: hint, isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (isControlled) onClose?.();
    else setInternalOpen(false);
  };

  const showQuickReplies = messages.length <= QUICK_REPLIES_HIDE_AFTER;

  return (
    <>
      {/* Floating button — only when not controlled (no AI button in header) */}
      {!isControlled && (
        <button
          type="button"
          onClick={() => setInternalOpen((o) => !o)}
          className="fixed bottom-6 right-4 sm:right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-800 text-white shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          aria-label={open ? "Закрыть помощника" : "Открыть помощника по каталогу"}
        >
          {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      )}

      {/* Panel — when open; mobile: full width, larger height */}
      {open && (
        <div
          className="fixed bottom-20 sm:bottom-24 right-0 sm:right-6 z-40 flex w-full sm:max-w-[380px] flex-col rounded-t-xl sm:rounded-xl border border-gray-200 bg-white shadow-xl max-h-[85vh] sm:max-h-[70vh]"
          role="dialog"
          aria-labelledby="chat-title"
        >
          <div className="border-b border-gray-200 p-4 flex items-start justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <h2 id="chat-title" className="text-lg font-bold text-slate-900">
                Помощник по каталогу
              </h2>
              <p className="mt-1 text-sm italic text-slate-600">
                Подсказки по запчастям и каталогу. Может ошибаться — решения принимаете вы.
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleNewDialog}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                aria-label="Новый диалог"
                title="Новый диалог"
              >
                <MessageSquarePlus className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">
                Напишите вопрос по каталогу, запчастям или совместимости. Я подскажу, как искать и
                на что обратить внимание.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-emerald-800 text-white"
                      : m.isError
                        ? "bg-red-50 text-slate-800 border border-red-200"
                        : "bg-gray-100 text-slate-800"
                  }`}
                >
                  {m.role === "assistant" && !m.isError
                    ? renderAssistantContent(m.content)
                    : m.content}
                  {m.role === "assistant" && m.isError && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleRetry(i)}
                        className="gap-1 min-h-8 px-2 text-xs"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        Повторить
                      </Button>
                    </div>
                  )}
                  {m.role === "assistant" && m.suggestedCatalogUrl && (
                    <div className="mt-2">
                      <Link
                        to={m.suggestedCatalogUrl}
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Открыть в каталоге
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-slate-500 flex items-center gap-2 min-h-[2.5rem]"
                  aria-live="polite"
                >
                  <TypingDots />
                  <span className="sr-only">Помощник печатает…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-4 shrink-0">
            {showQuickReplies && (
              <div className="flex flex-wrap gap-2 mb-3">
                {QUICK_REPLIES.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendWithText(prompt)}
                    disabled={loading}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Ваш вопрос..."
                className="min-h-10 flex-1"
                disabled={loading}
              />
              {loading ? (
                <Button
                  type="button"
                  onClick={handleStopStream}
                  variant="secondary"
                  disabled={!loading}
                  aria-label="Остановить"
                  className="min-h-10 px-3"
                >
                  <Square className="h-5 w-5" aria-hidden />
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  loading={false}
                  disabled={!inputValue.trim()}
                  aria-label="Отправить"
                  className="min-h-10 px-3"
                >
                  <Send className="h-5 w-5" aria-hidden />
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Ответы носят справочный характер. Проверяйте информацию в карточках товаров.
            </p>
          </div>
        </div>
      )}

      {/* First-open disclaimer modal */}
      {showDisclaimerModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-labelledby="disclaimer-title"
        >
          <div className="max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 id="disclaimer-title" className="text-lg font-bold text-slate-900">
              Помощник по каталогу
            </h3>
            <p className="mt-3 text-slate-700">
              Это подсказки, а не официальная консультация. Проверяйте совместимость и характеристики у продавца или в карточке товара.
            </p>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleCloseModal}>Понятно</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
