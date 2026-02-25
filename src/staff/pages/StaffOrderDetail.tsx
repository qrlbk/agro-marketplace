import { Link, useParams } from "react-router";
import { motion } from "motion/react";
import { StaffLayout } from "../components/StaffLayout";
import { useStaffAuth } from "../context/StaffAuthContext";
import { ArrowLeft, Phone } from "lucide-react";

export default function StaffOrderDetail() {
  const { id } = useParams();
  const { hasPermission } = useStaffAuth();

  return (
    <StaffLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          to="/staff/orders"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          К списку заказов
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Заказ #{id}</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Order Info */}
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">Информация о заказе</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600 mb-1">Покупатель:</dt>
                <dd className="font-semibold flex items-center gap-2">
                  <a href="tel:+77001234567" className="text-blue-600 hover:underline flex items-center gap-1">
                    <Phone size={16} />
                    +77001234567
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1">Поставщик:</dt>
                <dd className="font-semibold flex items-center gap-2">
                  <a href="tel:+77009999999" className="text-blue-600 hover:underline flex items-center gap-1">
                    <Phone size={16} />
                    +77009999999
                  </a>
                  <span className="text-gray-600">(AgroTech KZ)</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1">Дата создания:</dt>
                <dd className="font-semibold">2024-02-23 14:30</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1">Статус:</dt>
                <dd>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                    New
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1">Адрес доставки:</dt>
                <dd className="text-gray-700">г. Алматы, ул. Абая 123, кв. 45</dd>
              </div>
            </dl>

            {hasPermission("orders.edit") && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="block text-sm font-semibold mb-2">Изменить статус</label>
                <div className="flex gap-2">
                  <select className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500">
                    <option>New</option>
                    <option>Paid</option>
                    <option>Shipped</option>
                    <option>Delivered</option>
                  </select>
                  <button className="px-6 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors">
                    Сохранить
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">Состав заказа</h2>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-700">Азотное удобрение NPK × 2</span>
                <span className="font-semibold">5,000 ₸</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-700">Семена пшеницы 'Московская 39' × 1</span>
                <span className="font-semibold">45,000 ₸</span>
              </div>
            </div>
            <div className="flex justify-between pt-4 border-t-2 border-gray-200">
              <span className="text-xl font-bold">Итого:</span>
              <span className="text-2xl font-bold text-green-600">50,000 ₸</span>
            </div>
          </div>
        </div>
      </motion.div>
    </StaffLayout>
  );
}
