import { useState } from "react";
import { motion } from "motion/react";
import { useParams, Link } from "react-router";
import { ImprovedHeader } from "../components/ImprovedHeader";
import { AIAssistant } from "../components/AIAssistant";
import {
  Star,
  ShoppingCart,
  Check,
  X as XIcon,
  ChevronRight,
  Tractor as TractorIcon,
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

const mockProduct = {
  id: "1",
  name: "Азотное удобрение NPK 20-10-10",
  sku: "NPK-20-10-10-50",
  price: 2500,
  inStock: true,
  quantity: 45,
  rating: 4.5,
  reviewsCount: 23,
  images: [
    "https://images.unsplash.com/photo-1696371269544-e2601fd835f5?w=800",
    "https://images.unsplash.com/photo-1696010619929-493071e82b0d?w=800",
  ],
  description:
    "Комплексное азотное удобрение NPK 20-10-10 предназначено для улучшения роста и развития сельскохозяйственных культур. Высокое содержание азота способствует интенсивному наращиванию зеленой массы.",
  specifications: {
    Вес: "50 кг",
    "Содержание азота": "20%",
    "Содержание фосфора": "10%",
    "Содержание калия": "10%",
    Производитель: "AgroTech KZ",
    "Срок годности": "3 года",
  },
  composition:
    "Аммиачная селитра, Суперфосфат, Хлористый калий, Микроэлементы",
};

const mockReviews = [
  {
    id: "1",
    author: "Иван П.",
    rating: 5,
    text: "Отличное удобрение! Использую уже второй сезон. Урожайность пшеницы выросла на 30%.",
    date: "2024-01-15",
  },
  {
    id: "2",
    author: "Алия К.",
    rating: 4,
    text: "Хорошее качество, быстро растворяется. Цена немного высоковата.",
    date: "2024-01-10",
  },
  {
    id: "3",
    author: "Сергей М.",
    rating: 5,
    text: "Рекомендую! Эффект заметен уже через неделю после внесения.",
    date: "2024-01-05",
  },
];

export default function ProductDetail() {
  const { id } = useParams();
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [compatibilityCheck, setCompatibilityCheck] = useState<
    "idle" | "checking" | "compatible" | "incompatible"
  >("idle");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const handleCheckCompatibility = () => {
    setCompatibilityCheck("checking");
    setTimeout(() => {
      setCompatibilityCheck(Math.random() > 0.3 ? "compatible" : "incompatible");
    }, 1500);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock review submission
    alert(`Отзыв отправлен! Рейтинг: ${reviewRating}, Текст: ${reviewText}`);
    setReviewRating(0);
    setReviewText("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ImprovedHeader
        onAIAssistantOpen={() => setIsAIOpen(true)}
        cartItemsCount={3}
        notificationsCount={2}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link to="/catalog" className="hover:text-green-600">
            Каталог
          </Link>
          <ChevronRight size={16} />
          <span className="text-gray-900">{mockProduct.name}</span>
        </div>

        {/* Product Details */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Images */}
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl overflow-hidden shadow-md mb-4"
            >
              <ImageWithFallback
                src={mockProduct.images[selectedImage]}
                alt={mockProduct.name}
                className="w-full h-96 object-cover"
              />
            </motion.div>
            <div className="flex gap-2">
              {mockProduct.images.map((img, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 ${
                    selectedImage === idx
                      ? "border-green-500"
                      : "border-gray-200"
                  }`}
                >
                  <img
                    src={img}
                    alt={`${mockProduct.name} ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </motion.button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {mockProduct.name}
            </h1>
            <p className="text-gray-600 mb-4">Артикул: {mockProduct.sku}</p>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className={
                      i < Math.floor(mockProduct.rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {mockProduct.rating} ({mockProduct.reviewsCount} отзывов)
              </span>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 mb-6">
              {mockProduct.inStock ? (
                <>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    В наличии
                  </span>
                  <span className="text-sm text-gray-600">
                    {mockProduct.quantity} шт
                  </span>
                </>
              ) : (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                  Под заказ
                </span>
              )}
            </div>

            {/* Price */}
            <div className="mb-6">
              <p className="text-4xl font-bold text-green-600">
                {mockProduct.price.toLocaleString()} ₸
              </p>
            </div>

            {/* Compatibility Check */}
            <div className="mb-6 p-4 bg-purple-50 rounded-xl">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TractorIcon size={20} className="text-purple-600" />
                Проверка совместимости с техникой
              </h3>
              <div className="flex gap-2">
                <select className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500">
                  <option>Выберите технику из гаража</option>
                  <option>John Deere 8370R (2020)</option>
                  <option>МТЗ-82.1 (2019)</option>
                </select>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckCompatibility}
                  disabled={compatibilityCheck === "checking"}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  {compatibilityCheck === "checking" ? "Проверка..." : "Проверить"}
                </motion.button>
              </div>

              {compatibilityCheck === "compatible" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-2 text-green-600"
                >
                  <Check size={20} />
                  <span>Подходит к вашей технике</span>
                </motion.div>
              )}

              {compatibilityCheck === "incompatible" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-2 text-red-600"
                >
                  <XIcon size={20} />
                  <span>Не подходит к выбранной технике</span>
                </motion.div>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex gap-4 mb-6">
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-gray-50"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center border-x border-gray-200 focus:outline-none"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2 hover:bg-gray-50"
                >
                  +
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
              >
                <ShoppingCart size={20} />
                В корзину
              </motion.button>
            </div>
          </div>
        </div>

        {/* Description & Specs */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-2xl font-bold mb-4">Описание</h2>
            <p className="text-gray-700 leading-relaxed">{mockProduct.description}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-2xl font-bold mb-4">Характеристики</h2>
            <dl className="space-y-2">
              {Object.entries(mockProduct.specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-600">{key}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Composition */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-12">
          <h2 className="text-2xl font-bold mb-4">Состав</h2>
          <p className="text-gray-700">{mockProduct.composition}</p>
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Отзывы ({mockProduct.reviewsCount})</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={
                      i < Math.floor(mockProduct.rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
              <span className="font-bold">{mockProduct.rating}</span>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-4 mb-8">
            {mockReviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-4 border border-gray-100 rounded-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{review.author}</span>
                  <span className="text-sm text-gray-500">{review.date}</span>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }
                    />
                  ))}
                </div>
                <p className="text-gray-700">{review.text}</p>
              </motion.div>
            ))}
          </div>

          {/* Leave Review Form */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-xl font-bold mb-4">Оставить отзыв</h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Ваша оценка</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <motion.button
                      key={rating}
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setReviewRating(rating)}
                      className="p-1"
                    >
                      <Star
                        size={32}
                        className={
                          rating <= reviewRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }
                      />
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Ваш отзыв</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  rows={4}
                  placeholder="Поделитесь своим опытом использования..."
                  required
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={reviewRating === 0}
                className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отправить отзыв
              </motion.button>
            </form>
          </div>
        </div>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
