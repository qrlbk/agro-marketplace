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
}: CategoryCardProps) {
  return (
    <Link to={`/catalog?category=${id}`}>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
        whileHover={{ y: -10, scale: 1.02 }}
        className="group relative overflow-hidden rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
      >
        <div className="h-64 overflow-hidden relative">
          <motion.img
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.3 }}
            src={image || DEFAULT_IMAGE}
            alt=""
            className="w-full h-full object-cover"
          />
          <div
            className={`absolute inset-0 bg-gradient-to-t ${gradient} opacity-60`}
          />
        </div>

        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-xl`}
          >
            <Icon size={28} className="text-white" />
          </motion.div>

          <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
          <p className="text-white/90 mb-4">{description}</p>

          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true }}
            transition={{ delay: delay + 0.3, duration: 0.5 }}
            className="h-1 bg-white/50 rounded-full"
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
            className="bg-white text-gray-900 px-6 py-3 rounded-full font-semibold"
          >
            Перейти →
          </motion.div>
        </motion.div>
      </motion.div>
    </Link>
  );
}
