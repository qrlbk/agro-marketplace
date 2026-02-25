import { useState } from "react";
import { motion } from "motion/react";
import { ImprovedHeader } from "../components/ImprovedHeader";
import { CategoryCard } from "../components/CategoryCard";
import { ProductCard } from "../components/ProductCard";
import { AIAssistant } from "../components/AIAssistant";
import {
  Beaker,
  Sprout,
  Wheat,
  Tractor,
  TrendingUp,
  Shield,
  Zap,
  Award,
} from "lucide-react";

const categories = [
  {
    title: "Удобрения",
    description: "Минеральные и органические удобрения",
    icon: Beaker,
    gradient: "from-blue-500 to-cyan-500",
    image: "https://images.unsplash.com/photo-1696371269544-e2601fd835f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZXJ0aWxpemVyJTIwYWdyaWN1bHR1cmV8ZW58MXx8fHwxNzcxNzkyMzQxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    category: "fertilizers",
  },
  {
    title: "Химия",
    description: "Средства защиты растений",
    icon: Shield,
    gradient: "from-purple-500 to-pink-500",
    image: "https://images.unsplash.com/photo-1696010619929-493071e82b0d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZ3JpY3VsdHVyYWwlMjBjaGVtaWNhbHN8ZW58MXx8fHwxNzcxODI2OTExfDA&ixlib=rb-4.1.0&q=80&w=1080",
    category: "chemicals",
  },
  {
    title: "Семена",
    description: "Элитные семена высокого качества",
    icon: Sprout,
    gradient: "from-green-500 to-emerald-500",
    image: "https://images.unsplash.com/photo-1594020665291-b4c98f4dced8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZWVkcyUyMGdyYWlufGVufDF8fHx8MTc3MTgyNjkxMHww&ixlib=rb-4.1.0&q=80&w=1080",
    category: "seeds",
  },
  {
    title: "Техника",
    description: "Сельхозтехника и оборудование",
    icon: Tractor,
    gradient: "from-orange-500 to-red-500",
    image: "https://images.unsplash.com/photo-1685474442734-bb453f03060d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFjdG9yJTIwZmFybWluZyUyMGVxdWlwbWVudHxlbnwxfHx8fDE3NzE4MjY5MTF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    category: "equipment",
  },
];

const featuredProducts = [
  {
    name: "Азотное удобрение NPK 20-10-10, 50кг",
    price: 2500,
    rating: 5,
    image: "https://images.unsplash.com/photo-1696371269544-e2601fd835f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZXJ0aWxpemVyJTIwYWdyaWN1bHR1cmV8ZW58MXx8fHwxNzcxNzkyMzQxfDA&ixlib=rb-4.1.0&q=80&w=400",
    isAIRecommended: true,
    discount: 15,
  },
  {
    name: "Семена пшеницы 'Московская 39', 1т",
    price: 45000,
    rating: 5,
    image: "https://images.unsplash.com/photo-1663025293688-322e16b6cb66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGVhdCUyMGdyYWluJTIwc2VlZHN8ZW58MXx8fHwxNzcxODI2OTExfDA&ixlib=rb-4.1.0&q=80&w=400",
    isAIRecommended: true,
  },
  {
    name: "Гербицид широкого спектра, 10л",
    price: 8900,
    rating: 4,
    image: "https://images.unsplash.com/photo-1696010619929-493071e82b0d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZ3JpY3VsdHVyYWwlMjBjaGVtaWNhbHN8ZW58MXx8fHwxNzcxODI2OTExfDA&ixlib=rb-4.1.0&q=80&w=400",
    discount: 20,
  },
  {
    name: "Трактор МТЗ-82.1, новый",
    price: 2850000,
    rating: 5,
    image: "https://images.unsplash.com/photo-1685474442734-bb453f03060d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFjdG9yJTIwZmFybWluZyUyMGVxdWlwbWVudHxlbnwxfHx8fDE3NzE4MjY5MTF8MA&ixlib=rb-4.1.0&q=80&w=400",
  },
];

const features = [
  {
    icon: Zap,
    title: "AI Анализ",
    description: "Умные рекомендации на основе вашего региона и потребностей",
  },
  {
    icon: TrendingUp,
    title: "Лучшие цены",
    description: "Прямые поставки от производителей без наценок",
  },
  {
    icon: Shield,
    title: "Гарантия качества",
    description: "Все товары сертифицированы и проверены",
  },
  {
    icon: Award,
    title: "Экспертная поддержка",
    description: "Консультации агрономов 24/7",
  },
];

export default function Home() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [cartCount, setCartCount] = useState(3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <ImprovedHeader onAIAssistantOpen={() => setIsAIOpen(true)} cartItemsCount={cartCount} />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-6"
              >
                🤖 AI-Powered Platform
              </motion.span>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                Будущее агрономии{" "}
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                  уже здесь
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8">
                Маркетплейс №1 для профессионалов сельского хозяйства.
                Умные рекомендации, лучшие цены, быстрая доставка.
              </p>

              <div className="flex flex-wrap gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
                >
                  Начать покупки
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAIOpen(true)}
                  className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-2xl font-semibold hover:border-purple-500 transition-colors"
                >
                  Спросить AI 🤖
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <motion.div
                animate={{
                  y: [0, -20, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1702373749921-3ed85367c2ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZ3JpY3VsdHVyZSUyMGZpZWxkJTIwZmFybXxlbnwxfHx8fDE3NzE4MjY5MDl8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Agriculture"
                  className="rounded-3xl shadow-2xl"
                />
              </motion.div>

              {/* Floating Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">+47%</p>
                    <p className="text-sm text-gray-600">Урожайность</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Animated Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full blur-3xl"
          />
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="text-center p-6 rounded-2xl hover:bg-gray-50 transition-colors"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
                >
                  <feature.icon size={32} className="text-white" />
                </motion.div>
                <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Категории товаров</h2>
            <p className="text-xl text-gray-600">Все необходимое для вашего хозяйства</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {categories.map((category, index) => (
              <CategoryCard
                key={index}
                {...category}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* AI Recommended Products */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full mb-6">
              <Zap size={20} />
              <span className="font-semibold">AI Рекомендации</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Специально для вас</h2>
            <p className="text-xl text-gray-600">
              Подобрано на основе анализа вашего региона и сезона
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {featuredProducts.map((product, index) => (
              <ProductCard
                key={index}
                {...product}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-6">
              Готовы улучшить свое хозяйство?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Присоединяйтесь к 10,000+ агрономов, которые уже используют нашу платформу
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAIOpen(true)}
              className="px-8 py-4 bg-white text-green-600 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-shadow"
            >
              Получить консультацию AI 🤖
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* AI Assistant */}
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}