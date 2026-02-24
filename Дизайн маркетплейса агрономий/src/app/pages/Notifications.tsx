import { useState } from "react";
import { motion } from "motion/react";
import { ImprovedHeader } from "../components/ImprovedHeader";
import { AIAssistant } from "../components/AIAssistant";
import { Bell, Star, MessageSquare, Package, Check } from "lucide-react";

interface Notification {
  id: string;
  type: "review" | "support" | "order" | "system";
  title: string;
  message: string;
  date: string;
  isRead: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "review",
    title: "Новый отзыв на ваш товар",
    message: "Пользователь оставил 5-звездочный отзыв на 'Азотное удобрение NPK'",
    date: "2024-02-23",
    isRead: false,
  },
  {
    id: "2",
    type: "support",
    title: "Ответ службы поддержки",
    message: "Ваш запрос №1234 обработан. Посмотрите ответ специалиста.",
    date: "2024-02-22",
    isRead: false,
  },
  {
    id: "3",
    type: "order",
    title: "Заказ отправлен",
    message: "Ваш заказ #ORD-2024-002 отправлен и в пути",
    date: "2024-02-20",
    isRead: true,
  },
];

const iconMap = {
  review: Star,
  support: MessageSquare,
  order: Package,
  system: Bell,
};

export default function Notifications() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  const handleMarkAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <ImprovedHeader
        onAIAssistantOpen={() => setIsAIOpen(true)}
        cartItemsCount={3}
        notificationsCount={unreadCount}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Bell size={36} className="text-green-600" />
            Уведомления
          </h1>
          <p className="text-gray-600">
            {unreadCount > 0
              ? `У вас ${unreadCount} непрочитанных уведомлений`
              : "Все уведомления прочитаны"}
          </p>
        </motion.div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-md">
            <Bell size={64} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Нет уведомлений</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification, index) => {
              const Icon = iconMap[notification.type];
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white rounded-2xl p-6 shadow-md ${
                    !notification.isRead ? "border-2 border-green-200" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        notification.isRead ? "bg-gray-100" : "bg-green-100"
                      }`}
                    >
                      <Icon
                        size={24}
                        className={notification.isRead ? "text-gray-600" : "text-green-600"}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-lg">{notification.title}</h3>
                        <span className="text-xs text-gray-500">{notification.date}</span>
                      </div>
                      <p className="text-gray-700 mb-3">{notification.message}</p>

                      {!notification.isRead && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-semibold"
                        >
                          <Check size={16} />
                          Отметить как прочитанное
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
