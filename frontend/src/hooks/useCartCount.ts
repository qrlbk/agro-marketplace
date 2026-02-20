import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { useCartContext } from "../contexts/CartContext";
import { request, type CartItem } from "../api/client";

export function useCartCount(): number {
  const { token } = useAuth();
  const { cartVersion } = useCartContext();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setCount(0);
      return;
    }
    request<CartItem[]>("/cart", { token })
      .then((items) => setCount(items.reduce((sum, i) => sum + i.quantity, 0)))
      .catch(() => {
        setCount(0);
        if (import.meta.env.DEV) console.warn("useCartCount: failed to fetch cart");
      });
  }, [token, cartVersion]);

  return count;
}
