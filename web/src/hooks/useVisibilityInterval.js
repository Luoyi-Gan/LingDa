// 标签页可见时按 ms 周期执行 fn；隐藏（切走/最小化）时立即停掉，不再 setInterval。
// 之前 TabBar 自己手写了一份，这里抽成通用 hook，未来所有轮询统一过这里。
// 用法：useVisibilityInterval(refresh, 30_000);
import { useEffect, useRef } from 'react';

export function useVisibilityInterval(fn, ms) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let timer = null;
    const tick = () => fnRef.current && fnRef.current();
    const start = () => {
      if (timer) return;
      tick(); // 立即跑一次
      timer = setInterval(tick, ms);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVis = () =>
      document.visibilityState === 'visible' ? start() : stop();

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ms]);
}

export default useVisibilityInterval;
