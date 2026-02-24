import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Beaker,
  Sprout,
  Shield,
  Tractor,
  TrendingUp,
  Zap,
  Award,
} from "lucide-react";
import { CategoryCard } from "../components/CategoryCard";
import { getCategoryTree, getRecommendations } from "../api/client";
import type { CategoryTree } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useChatControl } from "../contexts/ChatControlContext";

const CATEGORY_STYLE: Record<
  string,
  { gradient: string; icon: typeof Beaker; description: string; image: string }
> = {
  fertilizers: {
    gradient: "from-blue-500 to-cyan-500",
    icon: Beaker,
    description: "Минеральные и органические удобрения",
    image:
      "https://images.unsplash.com/photo-1696371269544-e2601fd835f5?w=800&q=80",
  },
  chemicals: {
    gradient: "from-purple-500 to-pink-500",
    icon: Shield,
    description: "Средства защиты растений",
    image:
      "https://images.unsplash.com/photo-1696010619929-493071e82b0d?w=800&q=80",
  },
  seeds: {
    gradient: "from-green-500 to-emerald-500",
    icon: Sprout,
    description: "Элитные семена высокого качества",
    image:
      "https://images.unsplash.com/photo-1594020665291-b4c98f4dced8?w=800&q=80",
  },
  equipment: {
    gradient: "from-orange-500 to-red-500",
    icon: Tractor,
    description: "Сельхозтехника и оборудование",
    image:
      "https://images.unsplash.com/photo-1685474442734-bb453f03060d?w=800&q=80",
  },
};

const DEFAULT_CATEGORY = {
  gradient: "from-green-500 to-emerald-500",
  icon: Sprout,
  description: "Товары для сельского хозяйства",
  image:
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
};

function getCategoryStyle(slug: string) {
  const key = Object.keys(CATEGORY_STYLE).find((k) =>
    slug.toLowerCase().includes(k)
  );
  return key ? CATEGORY_STYLE[key] : DEFAULT_CATEGORY;
}

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

export function Home() {
  const { openChat } = useChatControl() ?? {};
  const [categoryTree, setCategoryTree] = useState<CategoryTree[]>([]);
  const [recommendations, setRecommendations] = useState<
    Awaited<ReturnType<typeof getRecommendations>>
  >([]);
  const { token } = useAuth();

  useEffect(() => {
    getCategoryTree().then(setCategoryTree).catch(() => setCategoryTree([]));
  }, []);

  useEffect(() => {
    if (!token) {
      setRecommendations([]);
      return;
    }
    getRecommendations(token)
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, [token]);

  const rootCategories = categoryTree.slice(0, 4).map((root) => {
    const style = getCategoryStyle(root.slug);
    return {
      id: root.id,
      title: root.name,
      description: style.description,
      icon: style.icon,
      gradient: style.gradient,
      image: style.image,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-20">
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

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                Будущее агрономии{" "}
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                  уже здесь
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 mb-8">
                Маркетплейс №1 для профессионалов сельского хозяйства. Умные
                рекомендации, лучшие цены, быстрая доставка.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/catalog">
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
                  >
                    Начать покупки
                  </motion.span>
                </Link>
                {openChat && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={openChat}
                    className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-2xl font-semibold hover:border-purple-500 transition-colors"
                  >
                    Спросить AI 🤖
                  </motion.button>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1702373749921-3ed85367c2ad?w=1080&q=80"
                  alt=""
                  className="rounded-3xl shadow-2xl w-full object-cover"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-xl hidden sm:block"
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

        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
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
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Категории товаров
            </h2>
            <p className="text-xl text-gray-600">
              Всё необходимое для вашего хозяйства
            </p>
          </motion.div>

          {rootCategories.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-8">
              {rootCategories.map((cat, index) => (
                <CategoryCard
                  key={cat.id}
                  id={cat.id}
                  title={cat.title}
                  description={cat.description}
                  icon={cat.icon}
                  gradient={cat.gradient}
                  image={cat.image}
                  delay={index * 0.1}
                />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  id: 0,
                  title: "Каталог",
                  description: "Запчасти, техника, семена, удобрения, СЗР",
                  icon: Sprout,
                  gradient: "from-green-500 to-emerald-500",
                  image: DEFAULT_CATEGORY.image,
                },
              ].map((cat, index) => (
                <Link key={cat.id} to="/catalog">
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -10, scale: 1.02 }}
                    className="group relative overflow-hidden rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-64 flex items-center justify-center"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/80 to-emerald-600/80" />
                    <span className="relative text-2xl font-bold text-white">
                      Перейти в каталог →
                    </span>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AI Recommended */}
      {(recommendations.length > 0 || token) && (
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
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Специально для вас
              </h2>
              <p className="text-xl text-gray-600">
                Подобрано на основе анализа вашего региона и техники
              </p>
            </motion.div>

            {recommendations.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendations.slice(0, 8).map((rec, index) => (
                  <motion.div
                    key={rec.product_id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -5 }}
                  >
                    <Link
                      to={`/products/${rec.product_id}`}
                      className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden group"
                    >
                      <div className="p-4">
                        <div className="flex items-center gap-1 mb-2">
                          <span className="px-2 py-0.5 rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold">
                            AI
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                          {rec.name}
                        </h3>
                        <p className="text-sm text-gray-500 font-mono">
                          {rec.article_number}
                        </p>
                        <p className="mt-2 text-lg font-bold text-green-600">
                          {Number(rec.price).toLocaleString("ru-KZ")} ₸
                        </p>
                        {rec.message && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {rec.message}
                          </p>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : token ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Добавьте технику в Гараж — мы подберём персональные рекомендации.
                </p>
                <Link
                  to="/garage"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold hover:shadow-lg transition-shadow"
                >
                  В Гараж
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Войдите и добавьте технику в Гараж — мы подберём рекомендации.
                </p>
                <Link
                  to="/login"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold hover:shadow-lg transition-shadow"
                >
                  Войти
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Готовы улучшить своё хозяйство?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Присоединяйтесь к тысячам агрономов, которые уже используют нашу
              платформу
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/catalog"
                className="inline-block px-8 py-4 bg-white text-green-600 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-shadow"
              >
                В каталог
              </Link>
              {openChat && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={openChat}
                  className="px-8 py-4 bg-white/20 text-white rounded-2xl font-semibold border-2 border-white/50 hover:bg-white/30 transition-colors"
                >
                  Получить консультацию AI 🤖
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
