import { useState } from "react";
import { motion } from "motion/react";
import { ImprovedHeader } from "../components/ImprovedHeader";
import { AIAssistant } from "../components/AIAssistant";
import { MessageSquare, Send } from "lucide-react";

export default function Feedback() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [otherSubject, setOtherSubject] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    // Mock submission
    setTimeout(() => {
      setSubject("");
      setOtherSubject("");
      setMessage("");
      setPhone("");
      setIsSubmitted(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ImprovedHeader onAIAssistantOpen={() => setIsAIOpen(true)} cartItemsCount={3} />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <MessageSquare size={36} className="text-green-600" />
            Служба поддержки
          </h1>
          <p className="text-gray-600">
            Напишите нам, и мы ответим в ближайшее время
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-8 shadow-md"
        >
          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={40} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Спасибо за обращение!
              </h2>
              <p className="text-gray-600">
                Мы получили ваше сообщение и ответим в ближайшее время
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Тема обращения</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                >
                  <option value="">Выберите тему</option>
                  <option value="order">Вопрос по заказу</option>
                  <option value="product">Вопрос по товару</option>
                  <option value="delivery">Доставка</option>
                  <option value="payment">Оплата</option>
                  <option value="other">Другое</option>
                </select>
              </div>

              {subject === "other" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <label className="block text-sm font-semibold mb-2">
                    Укажите тему
                  </label>
                  <input
                    type="text"
                    value={otherSubject}
                    onChange={(e) => setOtherSubject(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                    placeholder="Введите тему..."
                    required
                  />
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">Сообщение</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  rows={6}
                  placeholder="Опишите вашу проблему или вопрос..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Контактный телефон
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  placeholder="+7 (___) ___-__-__"
                  required
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
              >
                <Send size={20} />
                Отправить
              </motion.button>
            </form>
          )}
        </motion.div>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
