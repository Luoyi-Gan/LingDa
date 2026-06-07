// 文字头像：对应小程序里到处用的 .avatar（颜色由名字决定）
import { makeAvatar } from '../lib/avatar';

export default function Avatar({ name, size = 80, fontSize, className = '', style }) {
  const { text, color } = makeAvatar(name || '');
  return (
    <span
      className={`avatar ${className}`}
      style={{
        width: `calc(var(--rpx) * ${size})`,
        height: `calc(var(--rpx) * ${size})`,
        background: color,
        fontSize: `calc(var(--rpx) * ${fontSize || Math.round(size * 0.42)})`,
        ...style,
      }}
    >
      {text}
    </span>
  );
}
