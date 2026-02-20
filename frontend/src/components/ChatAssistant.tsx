import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { sendChatMessage } from "../api/client";
import { Button, Input } from "./ui";

const DISCLAIMER_SEEN_KEY = "agro-chat-disclaimer-seen";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasCheckedDisclaimer = useRef(false);

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

  const handleCloseModal = () => {
    try {
      localStorage.setItem(DISCLAIMER_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setShowDisclaimerModal(false);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || loading) return;
    setInputValue("");
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    try {
      const res = await sendChatMessage({ message: text, history });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Помощник временно недоступен. Попробуйте позже." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-800 text-white shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        aria-label={open ? "Закрыть помощника" : "Открыть помощника по каталогу"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-40 flex w-full max-w-[380px] flex-col rounded-xl border border-gray-200 bg-white shadow-xl"
          style={{ maxHeight: "70vh" }}
          role="dialog"
          aria-labelledby="chat-title"
        >
          <div className="border-b border-gray-200 p-4">
            <h2 id="chat-title" className="text-lg font-bold text-slate-900">
              Помощник по каталогу
            </h2>
            <p className="mt-1 text-sm italic text-slate-600">
              Подсказки по запчастям и каталогу. Может ошибаться — решения принимаете вы.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">
                Напишите вопрос по каталогу, запчастям или совместимости. Я подскажу, как искать и на что обратить внимание.
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
                      : "bg-gray-100 text-slate-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-slate-500">
                  …
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Ваш вопрос..."
                className="min-h-10 flex-1"
                disabled={loading}
              />
              <Button
                onClick={handleSend}
                loading={loading}
                disabled={loading || !inputValue.trim()}
                aria-label="Отправить"
                className="min-h-10 px-3"
              >
                <Send className="h-5 w-5" aria-hidden />
              </Button>
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
