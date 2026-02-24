import { Link, useParams } from "react-router";
import { motion } from "motion/react";
import { AdminLayout } from "../../components/AdminLayout";
import { ArrowLeft } from "lucide-react";

export default function AdminOrderDetail() {
  const { orderId } = useParams();

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/admin/orders" className="inline-flex items-center gap-2 text-gray-600 hover:text-green-600 mb-6">
          <ArrowLeft size={20} />
          К списку заказов
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Заказ #{orderId}</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">Информация о заказе</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-gray-600">Покупатель:</dt>
                <dd className="font-semibold">
                  <a href="tel:+77001234567" className="text-green-600 hover:underline">+77001234567</a>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Поставщик:</dt>
                <dd className="font-semibold">
                  <a href="tel:+77009999999" className="text-green-600 hover:underline">+77009999999</a> (AgroTech KZ)
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Дата:</dt>
                <dd className="font-semibold">2024-02-23</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Статус:</dt>
                <dd>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">New</span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">Состав заказа</h2>
            <div className="space-y-3">
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-sm">Азотное удобрение NPK × 2</span>
                <span className="font-semibold">5,000 ₸</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-sm">Семена пшеницы × 1</span>
                <span className="font-semibold">45,000 ₸</span>
              </div>
              <div className="flex justify-between pt-2 text-xl font-bold">
                <span>Итого:</span>
                <span className="text-green-600">50,000 ₸</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
