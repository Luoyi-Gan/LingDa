// Web 路由适配层：保留原页面调用习惯，统一映射到 react-router。
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { openRoomDetail, parseRoomDetailUrl } from './roomDetail';

/**
 * '/pages/hall/hall?roomId=1' -> '/hall?roomId=1'
 * 已是 Web 路径（如 /partners/explore）则原样保留。
 */
export function toWebPath(wxUrl) {
  if (!wxUrl) return '/';
  if (wxUrl.startsWith('http')) return wxUrl;
  const [path, query] = wxUrl.split('?');
  const q = query ? `?${query}` : '';

  // 非小程序 pages/ 风格的绝对路径，直接放行（含嵌套路由）
  if (path.startsWith('/') && !path.startsWith('/pages/')) {
    return path + q;
  }

  const segs = path.split('/').filter(Boolean);
  let name;
  if (segs[0] === 'pages' && segs.length >= 2) name = segs[1];
  else name = segs[segs.length - 1] || '';
  return `/${name}${q}`;
}

function parseDetail(url) {
  return parseRoomDetailUrl(url) || parseRoomDetailUrl(toWebPath(url));
}

/** 回搭子首页再开抽屉，避免「表单页 + 详情抽屉」叠层 */
function openDetailAndLeave(navigate, parsed, { replace = false } = {}) {
  navigate('/partners', { replace });
  window.setTimeout(() => openRoomDetail(parsed), 0);
}

export function useWxNav() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      navigateTo: ({ url }) => {
        const parsed = parseDetail(url);
        if (parsed) {
          openRoomDetail(parsed);
          return;
        }
        navigate(toWebPath(url));
      },
      /** 发布成功等：离开当前页并打开详情抽屉 */
      redirectTo: ({ url }) => {
        const parsed = parseDetail(url);
        if (parsed) {
          openDetailAndLeave(navigate, parsed, { replace: true });
          return;
        }
        navigate(toWebPath(url), { replace: true });
      },
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
