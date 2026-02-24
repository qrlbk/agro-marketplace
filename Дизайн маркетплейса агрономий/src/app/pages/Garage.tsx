import { useState } from "react";
import { motion } from "motion/react";
import { ImprovedHeader } from "../components/ImprovedHeader";
import { AIAssistant } from "../components/AIAssistant";
import { Tractor, Plus, Trash2, Wrench } from "lucide-react";

interface Machine {
  id: string;
  brand: string;
  model: string;
  year: number;
  serialNumber: string;
  motoHours: number;
}

export default function Garage() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([
    {
      id: "1",
      brand: "John Deere",
      model: "8370R",
      year: 2020,
      serialNumber: "JD8370R2020001",
      motoHours: 1250,
    },
  ]);
  const [newMachine, setNewMachine] = useState({
    brand: "",
    model: "",
    year: 2024,
    serialNumber: "",
    motoHours: 0,
  });

  const handleAddMachine = (e: React.FormEvent) => {
    e.preventDefault();
    const machine: Machine = {
      id: Date.now().toString(),
      ...newMachine,
    };
    setMachines([...machines, machine]);
    setNewMachine({
      brand: "",
      model: "",
      year: 2024,
      serialNumber: "",
      motoHours: 0,
    });
  };

  const handleDeleteMachine = (id: string) => {
    setMachines(machines.filter((m) => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ImprovedHeader onAIAssistantOpen={() => setIsAIOpen(true)} cartItemsCount={3} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Tractor size={32} className="text-green-600" />
            <h1 className="text-4xl font-bold text-gray-900">Мой гараж</h1>
          </div>
          <p className="text-gray-600">Управление вашей сельхозтехникой</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Add Machine Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-6 shadow-md h-fit"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Plus size={24} className="text-green-600" />
              Добавить технику
            </h2>

            <form onSubmit={handleAddMachine} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Бренд</label>
                <input
                  type="text"
                  value={newMachine.brand}
                  onChange={(e) =>
                    setNewMachine({ ...newMachine, brand: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Модель</label>
                <input
                  type="text"
                  value={newMachine.model}
                  onChange={(e) =>
                    setNewMachine({ ...newMachine, model: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Год</label>
                <input
                  type="number"
                  value={newMachine.year}
                  onChange={(e) =>
                    setNewMachine({ ...newMachine, year: parseInt(e.target.value) })
                  }
                  min="1990"
                  max="2025"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Серийный номер
                </label>
                <input
                  type="text"
                  value={newMachine.serialNumber}
                  onChange={(e) =>
                    setNewMachine({ ...newMachine, serialNumber: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Моточасы</label>
                <input
                  type="number"
                  value={newMachine.motoHours}
                  onChange={(e) =>
                    setNewMachine({
                      ...newMachine,
                      motoHours: parseInt(e.target.value) || 0,
                    })
                  }
                  min="0"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
              >
                Добавить
              </motion.button>
            </form>
          </motion.div>

          {/* Machines List & Recommendations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Machines */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Ваша техника</h2>
              {machines.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-md">
                  <Tractor size={64} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Техника не добавлена</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {machines.map((machine, index) => (
                    <motion.div
                      key={machine.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-2xl p-6 shadow-md flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                          <Tractor size={32} className="text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">
                            {machine.brand} {machine.model}
                          </h3>
                          <p className="text-sm text-gray-600">Год: {machine.year}</p>
                          <p className="text-sm text-gray-600">
                            S/N: {machine.serialNumber}
                          </p>
                          <p className="text-sm text-gray-600">
                            Моточасы: {machine.motoHours.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteMachine(machine.id)}
                        className="p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                      >
                        <Trash2 size={20} />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Maintenance Recommendations */}
            {machines.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-md"
              >
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Wrench size={24} className="text-purple-600" />
                  Рекомендации по ТО
                </h2>
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-4">
                    <h3 className="font-semibold mb-2">
                      {machines[0].brand} {machines[0].model}
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600">•</span>
                        <span>
                          Рекомендуется замена масла при {machines[0].motoHours + 250}{" "}
                          моточасах
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600">•</span>
                        <span>Проверка гидравлической системы каждые 100 часов</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600">•</span>
                        <span>Техосмотр тормозной системы перед сезоном</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
