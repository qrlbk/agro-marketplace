import { useState, useEffect, useCallback } from "react";
import { getUnreadNotificationsCount } from "../api/client";

export function useUnreadNotificationsCount(token: string | null) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!token) {
      setCount(0);
      return;
    }
    getUnreadNotificationsCount(token)
      .then((res) => setCount(res.count))
      .catch(() => setCount(0));
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { count, refresh };
}
