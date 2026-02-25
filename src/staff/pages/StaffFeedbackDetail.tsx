import { useState } from "react";
import { Link, useParams } from "react-router";
import { motion } from "motion/react";
import { StaffLayout } from "../components/StaffLayout";
import { useStaffAuth } from "../context/StaffAuthContext";
import { ArrowLeft, Phone } from "lucide-react";

export default function StaffFeedbackDetail() {
  const { id } = useParams();
  const { hasPermission } = useStaffAuth();
  const [status, setStatus] = useState("open");
  const [notes, setNotes] = useState("");
  const [response, setResponse] = useState("");

  const handleSave = () => {
    alert("Изменения сохранены и ответ отправлен пользователю!");
  };

  return (
    <StaffLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          to="/staff/feedback"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          К списку обращений
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Обращение #{id}</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Ticket Info */}
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">Информация об обращении</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600 mb-1">Тема:</dt>
                <dd className="font-semibold">Вопрос по заказу</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1">Сообщение:</dt>
                <dd className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                  Не могу найти мой заказ #ORD-2024-001 в системе. Помогите, пожалуйста.
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1">Контакт:</dt>
                <dd className="font-semibold">
                  <a href="tel:+77001234567" className="text-blue-600 hover:underline flex items-center gap-1">
                    <Phone size={16} />
                    +77001234567
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1">Дата:</dt>
                <dd className="font-semibold">2024-02-23 10:30</dd>
              </div>
            </dl>
          </div>

          {/* Response Form */}
          {hasPermission("feedback.edit") && (
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-xl font-bold mb-4">Обработка</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Статус</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  >
                    <option value="open">Открыт</option>
                    <option value="in_progress">В работе</option>
                    <option value="resolved">Решен</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Внутренние заметки</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                    rows={3}
                    placeholder="Заметки для сотрудников..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Ответ пользователю</label>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                    rows={4}
                    placeholder="Текст ответа будет отправлен пользователю..."
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                >
                  Сохранить и отправить ответ
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </StaffLayout>
  );
}
