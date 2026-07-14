// Web 路由适配层：保留原页面调用习惯，统一映射到 react-router。
import { useNavigate } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

// '/pages/hall/hall?roomId=1' -> '/hall?roomId=1'
export function toWebPath(wxUrl) {
  if (!wxUrl) return '/';
  if (wxUrl.startsWith('http')) return wxUrl;
  const [path, query] = wxUrl.split('?');
  const segs = path.split('/').filter(Boolean); // ['pages','hall','hall']
  let name;
  if (segs[0] === 'pages' && segs.length >= 2) name = segs[1];
  else name = segs[segs.length - 1] || '';
  return '/' + name + (query ? '?' + query : '');
}

export function useWxNav() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      navigateTo: ({ url }) => navigate(toWebPath(url)),
      redirectTo: ({ url }) => navigate(toWebPath(url), { replace: true }),
      switchTab: ({ url }) => navigate(toWebPath(url)),
      reLaunch: ({ url }) => navigate(toWebPath(url), { replace: true }),
      navigateBack: ({ delta = 1 } = {}) => navigate(-delta),
    }),
    [navigate],
  );
}

// query 参数解析
export function useQueryOptions() {
  const search =
    typeof window !== 'undefined' ? window.location.search : '';
  return useMemo(() => {
    const sp = new URLSearchParams(search);
    const o = {};
    for (const [k, v] of sp.entries()) o[k] = v;
    return o;
  }, [search]);
}
