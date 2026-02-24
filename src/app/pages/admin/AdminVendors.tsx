import { motion } from "motion/react";
import { AdminLayout } from "../../components/AdminLayout";

const pendingVendors = [
  { id: "1", company: "FarmSupply Ltd", bin: "123456789012", phone: "+77008888888", user: "Сергей Иванов" },
  { id: "2", company: "АгроХим ТОО", bin: "987654321098", phone: "+77007777777", user: "Марина Смирнова" },
];

export default function AdminVendors() {
  const handleApprove = (id: string) => {
    alert(`Поставщик ${id} одобрен!`);
  };

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Заявки поставщиков (ожидают одобрения)</h1>

        {pendingVendors.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-md">
            <p className="text-gray-500">Нет заявок на рассмотрении</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingVendors.map((vendor) => (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-2">{vendor.company}</h3>
                    <p className="text-sm text-gray-600">БИН: {vendor.bin}</p>
                    <p className="text-sm text-gray-600">Телефон: {vendor.phone}</p>
                    <p className="text-sm text-gray-600">Пользователь: {vendor.user}</p>
                  </div>
                  <button
                    onClick={() => handleApprove(vendor.id)}
                    className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
                  >
                    Одобрить
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
}
