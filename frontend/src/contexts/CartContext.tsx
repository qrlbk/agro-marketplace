import React, { createContext, useCallback, useContext, useState } from "react";

interface CartContextValue {
  cartVersion: number;
  invalidateCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartVersion, setCartVersion] = useState(0);
  const invalidateCart = useCallback(() => {
    setCartVersion((v) => v + 1);
  }, []);
  return (
    <CartContext.Provider value={{ cartVersion, invalidateCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return {
      cartVersion: 0,
      invalidateCart: () => {},
    };
  }
  return ctx;
}
