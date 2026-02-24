import { useState } from "react";
import { motion } from "motion/react";
import { Search, ShoppingCart, User, Bot } from "lucide-react";
import { Link } from "react-router";

interface HeaderProps {
  onAIAssistantOpen: () => void;
  cartItemsCount?: number;
}

export function Header({ onAIAssistantOpen, cartItemsCount = 0 }: HeaderProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-green-100"
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🌾</span>
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-900">AgroMarket</h1>
                <p className="text-xs text-green-600">AI-Powered Platform</p>
              </div>
            </motion.div>
          </Link>

          {/* Search Bar */}
          <motion.div
            animate={{
              width: isSearchFocused ? "600px" : "500px",
            }}
            className="relative hidden md:flex"
          >
            <input
              type="text"
              placeholder="Поиск семян, удобрений, техники..."
              className="w-full px-4 py-3 pl-12 pr-4 rounded-2xl border-2 border-green-200 focus:border-green-500 focus:outline-none transition-colors"
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600" size={20} />
          </motion.div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* AI Assistant Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAIAssistantOpen}
              className="relative px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
            >
              <Bot size={20} />
              <span className="hidden lg:inline">AI Помощник</span>
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.5, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
              />
            </motion.button>

            {/* Cart */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
            >
              <ShoppingCart size={24} className="text-green-700" />
              {cartItemsCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                >
                  {cartItemsCount}
                </motion.span>
              )}
            </motion.button>

            {/* User */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <User size={24} className="text-gray-700" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
