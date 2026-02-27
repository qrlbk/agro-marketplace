import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Beaker,
  Bot,
  Sprout,
  Shield,
  Tractor,
  TrendingUp,
  Zap,
  Award,
  Package,
  Bell,
  Wrench,
} from "lucide-react";
import { CategoryCard } from "../components/CategoryCard";
import { getCategoryTree, getRecommendations, request } from "../api/client";
import type { CategoryTree, GarageItem, Order } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useChatControl } from "../contexts/ChatControlContext";
import { useUnreadNotificationsCount } from "../hooks/useUnreadNotificationsCount";

import imgSeeds from "./img.png";
import imgFertilizers from "./img_3.png";
import imgEquipment from "./img_2.png";
import imgChemicals from "./img_1.png";
import imgHero from "./img_4.png";

const CATEGORY_STYLE: Record<
  string,
  { gradient: string; icon: typeof Beaker; description: string; image: string }
> = {
  fertilizers: {
    gradient: "from-lime-500 to-emerald-600",
    icon: Beaker,
    description: "Минеральные и органические удобрения",
    image: imgFertilizers,
  },
  chemicals: {
    gradient: "from-sky-500 to-emerald-500",
    icon: Shield,
    description: "Средства защиты растений",
    image: imgChemicals,
  },
  seeds: {
    gradient: "from-amber-400 to-orange-500",
    icon: Sprout,
    description: "Элитные семена высокого качества",
    image: imgSeeds,
  },
  equipment: {
    gradient: "from-slate-600 to-slate-900",
    icon: Tractor,
    description: "Сельхозтехника и оборудование",
    image: imgEquipment,
  },
};

const DEFAULT_CATEGORY = {
  gradient: "from-green-500 to-emerald-500",
  icon: Sprout,
  description: "Товары для сельского хозяйства",
  image:
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
};

function getCategoryStyle(slug: string, name?: string) {
  const text = `${slug} ${name ?? ""}`.toLowerCase();

  if (text.includes("семен")) {
    return CATEGORY_STYLE.seeds;
  }
  if (text.includes("хими") || text.includes("сзр")) {
    return CATEGORY_STYLE.chemicals;
  }
  if (text.includes("удобр")) {
    return CATEGORY_STYLE.fertilizers;
  }
  if (text.includes("запчаст") || text.includes("техник")) {
    return CATEGORY_STYLE.equipment;
  }

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
  const [garageCount, setGarageCount] = useState<number | null>(null);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const { token, user } = useAuth();

  const { count: unreadNotificationsCount } = useUnreadNotificationsCount(
    user && (user.role === "vendor" || user.role === "admin") ? token : null
  );

  const isLoggedIn = Boolean(token && user);
  const hasRecommendations = recommendations.length > 0;

  useEffect(() => {
    getCategoryTree().then(setCategoryTree).catch(() => setCategoryTree([]));
  }, []);

  useEffect(() => {
    if (!token) {
      setRecommendations([]);
      setGarageCount(null);
      setOrdersCount(null);
      return;
    }
    getRecommendations(token)
      .then(setRecommendations)
      .catch(() => setRecommendations([]));

    let cancelled = false;
    Promise.all([
      request<GarageItem[]>("/garage/machines", { token }).catch(() => null),
      request<Order[]>("/orders", { token }).catch(() => null),
    ]).then(([garage, orders]) => {
      if (cancelled) return;
      setGarageCount(garage ? garage.length : null);
      setOrdersCount(orders ? orders.length : null);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const rootCategories = categoryTree.slice(0, 4).map((root) => {
    const style = getCategoryStyle(root.slug, root.name);

    let badge: string | undefined;
    if (isLoggedIn) {
      if (root.slug.toLowerCase().includes("seeds")) {
        badge = "Часто покупают";
      } else if (root.slug.toLowerCase().includes("fertilizer")) {
        badge = "Для урожайности";
      } else if (root.slug.toLowerCase().includes("chem")) {
        badge = "Защита растений";
      }
    }

    return {
      id: root.id,
      title: root.name,
      description: style.description,
      icon: style.icon,
      gradient: style.gradient,
      image: style.image,
      badge,
    };
  });

  const nextActions: {
    title: string;
    description: string;
    to?: string;
    onClick?: () => void;
  }[] = [];

  if (!user) {
    nextActions.push(
      {
        title: "Войти в аккаунт",
        description: "Сохраняйте гараж, заказы и персональные рекомендации.",
        to: "/login",
      },
      {
        title: "Посмотреть каталог",
        description: "Запчасти, техника, семена, удобрения, СЗР.",
        to: "/catalog",
      }
    );
    if (openChat) {
      nextActions.push({
        title: "Задать вопрос AI",
        description: "Получите быстрый подбор товаров и консультацию 24/7.",
        onClick: openChat,
      });
    }
  } else {
    const garageIsEmpty = !garageCount || garageCount === 0;
    const hasOrders = (ordersCount ?? 0) > 0;

    nextActions.push(
      {
        title: garageIsEmpty ? "Заполнить гараж" : "Открыть гараж",
        description: garageIsEmpty
          ? "Добавьте технику, чтобы получать рекомендации под ваши машины."
          : "Управляйте техникой и следите за рекомендациями по ТО.",
        to: "/garage",
      },
      {
        title: hasOrders ? "Посмотреть последние заказы" : "Сделать первый заказ",
        description: hasOrders
          ? "Отслеживайте статусы заказов и историю покупок."
          : "Подберите первые товары для вашего хозяйства.",
        to: hasOrders ? "/orders" : "/catalog",
      },
      {
        title: "Связаться с поддержкой",
        description: "Решим вопросы по заказам, оплате и каталогу.",
        to: "/feedback",
      }
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero — как на макете: компактно, две кнопки, карточка +47% на картинке */}
      <section className="relative overflow-hidden">
        <div className="page-container py-6 sm:py-16">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-green-100 text-green-800 rounded-lg sm:rounded-full text-xs sm:text-sm font-semibold mb-4 sm:mb-6"
              >
                {isLoggedIn ? "Ваша панель агронома" : "Маркетплейс для агробизнеса"}
              </motion.span>

              {isLoggedIn ? (
                <>
                  <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
                    {user?.name ? `Здравствуйте, ${user.name}!` : "Добро пожаловать!"}
                  </h1>
                  <p className="text-sm sm:text-xl text-gray-600 mb-2">
                    Здесь собраны товары, рекомендации и сервисы под ваше хозяйство.
                  </p>
                  {user?.region && (
                    <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                      Регион: <span className="font-medium text-gray-700">{user.region}</span>
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-3 sm:mb-6 leading-tight">
                    Будущее агрономии{" "}
                    <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                      уже здесь
                    </span>
                  </h1>

                  <p className="text-sm sm:text-xl text-gray-600 mb-4 sm:mb-8">
                    Маркетплейс для агробизнеса: экономьте время и бюджет за счёт
                    прозрачных цен, проверенных поставщиков и умных рекомендаций.
                  </p>
                </>
              )}

              <div className="flex flex-wrap gap-2 sm:gap-4">
                <Link to={isLoggedIn ? "/catalog" : "/catalog"}>
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center px-5 py-2.5 sm:px-8 sm:py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-shadow"
                  >
                    {isLoggedIn ? "Перейти в каталог" : "Начать покупки"}
                  </motion.span>
                </Link>
                {isLoggedIn ? (
                  <>
                    <Link to="/orders">
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center px-4 py-2.5 sm:px-6 sm:py-3 bg-white text-gray-900 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base border border-gray-300 hover:border-green-500 transition-colors"
                      >
                        Мои заказы
                      </motion.span>
                    </Link>
                    {openChat && (
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={openChat}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 sm:px-6 sm:py-3 bg-white text-gray-900 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base border border-gray-300 hover:border-purple-500 transition-colors"
                      >
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" aria-hidden />
                        Спросить AI
                      </motion.button>
                    )}
                  </>
                ) : (
                  openChat && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={openChat}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 sm:px-6 sm:py-3 bg-white text-gray-900 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base border border-gray-300 hover:border-purple-500 transition-colors"
                    >
                      <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" aria-hidden />
                      Спросить AI
                    </motion.button>
                  )
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative mt-6 md:mt-0"
            >
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative"
              >
                <img
                  src={imgHero}
                  alt="Дрон обрабатывает сельхозполе"
                  loading="lazy"
                  className="rounded-2xl sm:rounded-3xl shadow-2xl w-full max-h-[220px] sm:max-h-none object-cover"
                />
                {/* Карточка +47% Урожайность — как на макете, видна и на мобильных */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute bottom-2 right-2 sm:-bottom-8 sm:-left-8 bg-white p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                      <TrendingUp className="text-green-600 w-4 h-4 sm:w-6 sm:h-6" aria-hidden />
                    </div>
                    <div>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">+47%</p>
                      <p className="text-xs sm:text-sm text-gray-600">Урожайность</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-10 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur-3xl"
          />
        </div>
      </section>

      {/* User status summary */}
      {isLoggedIn && (
        <section className="py-6 sm:py-8 bg-transparent">
          <div className="page-container">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                  Состояние вашего хозяйства
                </p>
                <p className="text-sm text-gray-600">
                  Краткий обзор гаража, заказов и уведомлений.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-start gap-3 rounded-xl bg-white/90 border border-gray-100 p-4">
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  <Wrench className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Гараж
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {garageCount != null ? garageCount : "—"}{" "}
                    <span className="text-sm font-medium text-gray-500">
                      единиц техники
                    </span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {garageCount && garageCount > 0
                      ? "Можно фильтровать запчасти под вашу технику."
                      : "Добавьте технику, чтобы получать точные рекомендации."}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-white/90 border border-gray-100 p-4">
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Заказы
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {ordersCount != null ? ordersCount : "—"}{" "}
                    <span className="text-sm font-medium text-gray-500">
                      всего
                    </span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {ordersCount && ordersCount > 0
                      ? "Отслеживайте статусы и историю покупок."
                      : "Сделайте первый заказ в каталоге."}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-white/90 border border-gray-100 p-4">
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Уведомления
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {unreadNotificationsCount}
                    <span className="text-sm font-medium text-gray-500">
                      {" "}
                      непрочитано
                    </span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Статусы заказов, акции и важные сообщения.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* Features — на мобильных те же 4 в ряд, но компактнее */}
      <section className="py-8 sm:py-16 bg-white">
        <div className="page-container">
          <div className="grid grid-cols-4 gap-2 sm:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="text-center p-2 sm:p-6 rounded-xl sm:rounded-2xl hover:bg-gray-50 transition-colors"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2 sm:mb-4"
                >
                  <feature.icon className="text-green-700 w-4 h-4 sm:w-7 sm:h-7" />
                </motion.div>
                <h3 className="font-bold text-gray-900 text-xs sm:text-base mb-1 sm:mb-2 leading-tight">{feature.title}</h3>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-snug line-clamp-2">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 sm:py-20">
        <div className="page-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Категории товаров
            </h2>
            <p className="text-base sm:text-xl text-gray-600">
              Всё необходимое для вашего хозяйства
            </p>
          </motion.div>

          {rootCategories.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8">
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
      {(hasRecommendations || token) && (
        <section className="py-12 sm:py-20 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="page-container">
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
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">
                Специально для вас
              </h2>
              <p className="text-base sm:text-xl text-gray-600">
                {garageCount && garageCount > 0
                  ? "Рекомендации под вашу технику из Гаража и регион."
                  : "Подобрано на основе вашего региона и популярных товаров."}
              </p>
            </motion.div>

            {hasRecommendations ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendations.slice(0, 4).map((rec, index) => (
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

            {hasRecommendations && openChat && (
              <div className="mt-10 text-center">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={openChat}
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-white text-purple-700 font-semibold shadow-md hover:shadow-lg transition-shadow border border-purple-100"
                >
                  Уточнить подбор в AI 🤖
                </motion.button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Next best actions (на мобильных скрываем для сокращения скролла) */}
      {nextActions.length > 0 && (
        <section className="hidden sm:block py-16 bg-white">
          <div className="page-container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                Что сделать дальше
              </h2>
              <p className="text-lg text-gray-600">
                2–3 шага, чтобы выжать максимум из маркетплейса.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {nextActions.map((action, index) => {
                const content = (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -2 }}
                    className="h-full rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 shadow-none hover:shadow-sm transition-all p-5 text-left"
                  >
                    <p className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-1">
                      Шаг {index + 1}
                    </p>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {action.description}
                    </p>
                    <span className="text-sm font-semibold text-green-700">
                      Перейти →
                    </span>
                  </motion.div>
                );

                if (action.to) {
                  return (
                    <Link key={action.title} to={action.to}>
                      {content}
                    </Link>
                  );
                }

                if (action.onClick) {
                  return (
                    <button
                      key={action.title}
                      type="button"
                      onClick={action.onClick}
                      className="text-left"
                    >
                      {content}
                    </button>
                  );
                }

                return content;
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-12 sm:py-20 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <div className="page-container max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6">
              Готовы улучшить своё хозяйство?
            </h2>
            <p className="text-base sm:text-xl mb-6 sm:mb-8 opacity-90">
              Снижайте риски закупок и экономьте бюджет с помощью прозрачного
              маркетплейса для агробизнеса.
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
