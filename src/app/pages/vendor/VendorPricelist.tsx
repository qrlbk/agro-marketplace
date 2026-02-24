import { useState } from "react";
import { motion } from "motion/react";
import { ImprovedHeader } from "../../components/ImprovedHeader";
import { AIAssistant } from "../../components/AIAssistant";
import { FileText, Upload, Check } from "lucide-react";

export default function VendorPricelist() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    created: number;
    updated: number;
    processed: number;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    // Mock upload
    setTimeout(() => {
      setUploadResult({
        created: 15,
        updated: 8,
        processed: 23,
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ImprovedHeader onAIAssistantOpen={() => setIsAIOpen(true)} cartItemsCount={0} notificationsCount={2} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FileText size={36} className="text-green-600" />
            Загрузка прайс-листа
          </h1>
          <p className="text-gray-600">Загрузите Excel файл с вашими товарами</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-8 shadow-md"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3">Требования к файлу</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-900 mb-2">
                Excel файл должен содержать колонки:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>• Артикул</li>
                <li>• Название товара</li>
                <li>• Цена</li>
                <li>• Количество на складе</li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Выберите файл</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2">
                Выбран: {file.name}
              </p>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUpload}
            disabled={!file}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={20} />
            Загрузить прайс-лист
          </motion.button>

          {uploadResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <Check size={24} className="text-green-600" />
                <h3 className="font-bold text-green-900">Прайс-лист загружен успешно!</h3>
              </div>
              <div className="space-y-2 text-sm text-green-800">
                <p>Создано новых товаров: {uploadResult.created}</p>
                <p>Обновлено товаров: {uploadResult.updated}</p>
                <p>Всего обработано строк: {uploadResult.processed}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
