import { useState } from "react";
import { motion } from "motion/react";
import { useParams } from "react-router";
import { ImprovedHeader } from "../components/ImprovedHeader";
import { ProductCard } from "../components/ProductCard";
import { AIAssistant } from "../components/AIAssistant";
import { Filter, SlidersHorizontal } from "lucide-react";

const productsByCategory: Record<string, any[]> = {
  fertilizers: [
    {
      name: "Азотное удобрение NPK 20-10-10, 50кг",
      price: 2500,
      rating: 5,
      image: "https://images.unsplash.com/photo-1696371269544-e2601fd835f5?w=400",
      isAIRecommended: true,
      discount: 15,
    },
    {
      name: "Комплексное удобрение 'Агрикола', 25кг",
      price: 1800,
      rating: 4,
      image: "https://images.unsplash.com/photo-1696371269544-e2601fd835f5?w=400",
    },
    {
      name: "Органическое удобрение 'Биогумус', 40л",
      price: 950,
      rating: 5,
      image: "https://images.unsplash.com/photo-1696371269544-e2601fd835f5?w=400",
      discount: 10,
    },
    {
      name: "Фосфорно-калийное удобрение, 50кг",
      price: 2200,
      rating: 4,
      image: "https://images.unsplash.com/photo-1696371269544-e2601fd835f5?w=400",
    },
  ],
  chemicals: [
    {
      name: "Гербицид широкого спектра, 10л",
      price: 8900,
      rating: 4,
      image: "https://images.unsplash.com/photo-1696010619929-493071e82b0d?w=400",
      discount: 20,
    },
    {
      name: "Инсектицид от колорадского жука, 5л",
      price: 4500,
      rating: 5,
      image: "https://images.unsplash.com/photo-1696010619929-493071e82b0d?w=400",
      isAIRecommended: true,
    },
    {
      name: "Фунгицид против грибковых заболеваний, 1л",
      price: 2300,
      rating: 4,
      image: "https://images.unsplash.com/photo-1696010619929-493071e82b0d?w=400",
    },
    {
      name: "Протравитель семян 'Премиум', 20л",
      price: 15600,
      rating: 5,
      image: "https://images.unsplash.com/photo-1696010619929-493071e82b0d?w=400",
    },
  ],
  seeds: [
    {
      name: "Семена пшеницы 'Московская 39', 1т",
      price: 45000,
      rating: 5,
      image: "https://images.unsplash.com/photo-1663025293688-322e16b6cb66?w=400",
      isAIRecommended: true,
    },
    {
      name: "Семена кукурузы 'Пионер', 60000 шт",
      price: 28000,
      rating: 5,
      image: "https://images.unsplash.com/photo-1594020665291-b4c98f4dced8?w=400",
      discount: 10,
    },
    {
      name: "Семена подсолнечника 'Лакомка', 150000 шт",
      price: 35000,
      rating: 4,
      image: "https://images.unsplash.com/photo-1594020665291-b4c98f4dced8?w=400",
    },
    {
      name: "Семена ячменя озимого, 1т",
      price: 38000,
      rating: 4,
      image: "https://images.unsplash.com/photo-1663025293688-322e16b6cb66?w=400",
    },
  ],
  equipment: [
    {
      name: "Трактор МТЗ-82.1, новый",
      price: 2850000,
      rating: 5,
      image: "https://images.unsplash.com/photo-1685474442734-bb453f03060d?w=400",
    },
    {
      name: "Культиватор навесной КПС-4, б/у",
      price: 185000,
      rating: 4,
      image: "https://images.unsplash.com/photo-1685474442734-bb453f03060d?w=400",
      discount: 25,
    },
    {
      name: "Сеялка зерновая СЗ-3.6, новая",
      price: 420000,
      rating: 5,
      image: "https://images.unsplash.com/photo-1685474442734-bb453f03060d?w=400",
      isAIRecommended: true,
    },
    {
      name: "Опрыскиватель прицепной ОП-2000",
      price: 650000,
      rating: 4,
      image: "https://images.unsplash.com/photo-1685474442734-bb453f03060d?w=400",
    },
  ],
};

const categoryTitles: Record<string, string> = {
  fertilizers: "Удобрения",
  chemicals: "Химия и защита растений",
  seeds: "Семена",
  equipment: "Сельхозтехника",
};

export default function Products() {
  const { category } = useParams();
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 3000000]);
  const [showFilters, setShowFilters] = useState(false);

  const products = productsByCategory[category || "fertilizers"] || [];
  const title = categoryTitles[category || "fertilizers"] || "Продукты";

  return (
    <div className="min-h-screen bg-gray-50">
      <ImprovedHeader onAIAssistantOpen={() => setIsAIOpen(true)} cartItemsCount={3} />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold mb-4">{title}</h1>
            <p className="text-xl opacity-90">
              Найдено {products.length} товаров
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className={`${
              showFilters ? "block" : "hidden"
            } lg:block w-full lg:w-64 bg-white rounded-2xl p-6 shadow-md h-fit sticky top-24`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">Фильтры</h3>
              <SlidersHorizontal size={20} className="text-gray-600" />
            </div>

            {/* Price Filter */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Цена</h4>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="От"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                  value={priceRange[0]}
                  onChange={(e) =>
                    setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])
                  }
                />
                <input
                  type="number"
                  placeholder="До"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                  value={priceRange[1]}
                  onChange={(e) =>
                    setPriceRange([priceRange[0], parseInt(e.target.value) || 3000000])
                  }
                />
              </div>
            </div>

            {/* Rating Filter */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Рейтинг</h4>
              <div className="space-y-2">
                {[5, 4, 3].map((rating) => (
                  <label key={rating} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded text-green-500" />
                    <span className="text-sm">От {rating} звезд</span>
                  </label>
                ))}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-purple-500" />
                <span className="text-sm font-semibold text-purple-600">
                  AI Рекомендации
                </span>
              </label>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
            >
              Применить
            </motion.button>
          </motion.aside>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md"
              >
                <Filter size={20} />
                <span>Фильтры</span>
              </motion.button>
            </div>

            {/* Sort */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                Показано {products.length} товаров
              </p>
              <select className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500">
                <option>По популярности</option>
                <option>Сначала дешевые</option>
                <option>Сначала дорогие</option>
                <option>По рейтингу</option>
              </select>
            </div>

            {/* Products */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product, index) => (
                <ProductCard
                  key={index}
                  {...product}
                  delay={index * 0.05}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}