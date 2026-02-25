import { useState } from "react";
import { motion } from "motion/react";
import { StaffLayout } from "../components/StaffLayout";
import { useStaffAuth } from "../context/StaffAuthContext";
import { Check } from "lucide-react";

const mockVendors = [
  { id: "1", company: "FarmSupply Ltd", bin: "123456789012", phone: "+77008888888", contact: "Сергей Иванов", address: "г. Костанай, ул. Ленина 45" },
  { id: "2", company: "АгроХим ТОО", bin: "987654321098", phone: "+77007777777", contact: "Марина Смирнова", address: "г. Алматы, пр. Абая 150" },
];

export default function StaffVendors() {
  const [vendors, setVendors] = useState(mockVendors);
  const { hasPermission } = useStaffAuth();

  const handleApprove = (id: string) => {
    setVendors(vendors.filter((v) => v.id !== id));
    alert(`Поставщик одобрен!`);
  };

  return (
    <StaffLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Заявки поставщиков (ожидают одобрения)</h1>

        {vendors.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-md">
            <p className="text-gray-500 text-lg">Нет заявок на рассмотрении</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vendors.map((vendor, index) => (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-md"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{vendor.company}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-semibold">БИН:</span> {vendor.bin}</p>
                      <p><span className="font-semibold">Телефон:</span> {vendor.phone}</p>
                      <p><span className="font-semibold">Контактное лицо:</span> {vendor.contact}</p>
                      <p><span className="font-semibold">Адрес:</span> {vendor.address}</p>
                    </div>
                  </div>

                  {hasPermission("vendors.approve") && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleApprove(vendor.id)}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
                    >
                      <Check size={20} />
                      Одобрить
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </StaffLayout>
  );
}
