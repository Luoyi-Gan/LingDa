// 通用防抖 hook：把高频变化的值（如输入框）延迟 delay ms 输出
// 用法：
//   const q = useDebouncedValue(input, 300);
//   useEffect(() => { if (q) fetchSearch(q); }, [q]);
import { useEffect, useState } from 'react';

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default useDebouncedValue;
