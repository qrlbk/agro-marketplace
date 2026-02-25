import { useState } from "react";
import { Link, useParams } from "react-router";
import { motion } from "motion/react";
import { AdminLayout } from "../../components/AdminLayout";
import { ArrowLeft } from "lucide-react";

export default function AdminFeedbackDetail() {
  const { ticketId } = useParams();
  const [status, setStatus] = useState("open");
  const [notes, setNotes] = useState("");
  const [response, setResponse] = useState("");

  const handleSave = () => {
    alert(`Обращение ${ticketId} обновлено!`);
  };

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/admin/feedback" className="inline-flex items-center gap-2 text-gray-600 hover:text-green-600 mb-6">
          <ArrowLeft size={20} />
          К списку обращений
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Обращение #{ticketId}</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">Информация об обращении</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-gray-600">Тема:</dt>
                <dd className="font-semibold">Вопрос по заказу</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Сообщение:</dt>
                <dd className="text-gray-700">Не могу найти мой заказ #ORD-001 в системе. Помогите, пожалуйста.</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Контакт:</dt>
                <dd className="font-semibold">
                  <a href="tel:+77001234567" className="text-green-600 hover:underline">+77001234567</a>
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">Обработка</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Статус</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                >
                  <option value="open">Открыт</option>
                  <option value="in_progress">В работе</option>
                  <option value="resolved">Решен</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Заметки (внутренние)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  rows={3}
                  placeholder="Внутренние заметки..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Ответ пользователю</label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  rows={4}
                  placeholder="Текст ответа..."
                />
              </div>

              <button
                onClick={handleSave}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
