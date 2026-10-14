import { useEffect, useState } from "react";

/** localStorage 에 저장되는 state. 비공개 모드 등으로 막혀 있으면 메모리로만 동작 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota / private mode */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
