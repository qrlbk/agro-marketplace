import { motion } from "motion/react";
import { ShoppingCart, Star, Sparkles } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface ProductCardProps {
  name: string;
  price: number;
  rating: number;
  image: string;
  discount?: number;
  isAIRecommended?: boolean;
  delay?: number;
}

export function ProductCard({
  name,
  price,
  rating,
  image,
  discount,
  isAIRecommended = false,
  delay = 0,
}: ProductCardProps) {
  const discountedPrice = discount ? price * (1 - discount / 100) : price;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -5 }}
      className="relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
    >
      {/* AI Recommendation Badge */}
      {isAIRecommended && (
        <motion.div
          initial={{ x: -100 }}
          animate={{ x: 0 }}
          className="absolute top-3 left-0 z-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-r-full flex items-center gap-1 shadow-lg"
        >
          <Sparkles size={14} />
          <span className="text-xs font-semibold">AI Рекомендует</span>
        </motion.div>
      )}

      {/* Discount Badge */}
      {discount && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="absolute top-3 right-3 z-10 bg-red-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        >
          <span className="text-xs font-bold">-{discount}%</span>
        </motion.div>
      )}

      {/* Image */}
      <div className="relative h-56 overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{name}</h3>
        
        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={14}
              className={i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
            />
          ))}
          <span className="text-xs text-gray-600 ml-1">({rating}.0)</span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div>
            {discount ? (
              <div>
                <span className="text-xs text-gray-400 line-through mr-2">
                  {price.toLocaleString()} ₽
                </span>
                <span className="text-lg font-bold text-green-600">
                  {discountedPrice.toLocaleString()} ₽
                </span>
              </div>
            ) : (
              <span className="text-lg font-bold text-green-600">
                {price.toLocaleString()} ₽
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            <ShoppingCart size={20} />
          </motion.button>
        </div>
      </div>

      {/* Hover Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"
      />
    </motion.div>
  );
}
