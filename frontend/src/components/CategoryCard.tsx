import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

export interface CategoryCardProps {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  image: string;
  delay?: number;
  badge?: string;
}

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80";

export function CategoryCard({
  id,
  title,
  description,
  icon: Icon,
  gradient,
  image,
  delay = 0,
  badge,
}: CategoryCardProps) {
  return (
    <Link to={`/catalog?category=${id}`}>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
        whileHover={{ y: -10, scale: 1.02 }}
        className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
      >
        <div className="h-40 sm:h-64 overflow-hidden relative">
          <motion.img
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.3 }}
            src={image || DEFAULT_IMAGE}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
        </div>

        <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-6">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
            className={`w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-2 sm:mb-4 shadow-xl`}
          >
            <Icon className="text-white w-4 h-4 sm:w-7 sm:h-7" />
          </motion.div>

          {badge && (
            <span className="inline-flex items-center self-start px-2 py-0.5 sm:px-3 sm:py-1 mb-1 sm:mb-2 text-[10px] sm:text-xs font-semibold rounded-full bg-black/20 text-white backdrop-blur-sm">
              {badge}
            </span>
          )}

          <h3 className="text-xs sm:text-2xl font-bold text-white mb-0.5 sm:mb-2 line-clamp-2 leading-tight">{title}</h3>
          <p className="text-white/90 text-[11px] sm:text-base mb-2 sm:mb-4 line-clamp-2 sm:line-clamp-none leading-snug">{description}</p>

          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true }}
            transition={{ delay: delay + 0.3, duration: 0.5 }}
            className="h-0.5 sm:h-1 bg-white/50 rounded-full"
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 bg-black/20 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            whileHover={{ scale: 1, rotate: 0 }}
            className="bg-white text-gray-900 px-3 py-1.5 sm:px-6 sm:py-3 rounded-full text-xs sm:text-base font-semibold"
          >
            Перейти →
          </motion.div>
        </motion.div>
      </motion.div>
    </Link>
  );
}
