import { cn } from '../lib/cn';
import { inkOn } from '../lib/avatar';

/** 色块头像：按背景自动选深/浅字色，保证可读 */
export default function AvatarMark({
  color = '#2563EB',
  className,
  style,
  children,
  as: Comp = 'div',
  ...rest
}) {
  const bg = color || '#2563EB';
  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center overflow-hidden font-bold',
        className,
      )}
      style={{ background: bg, color: inkOn(bg), ...style }}
      {...rest}
    >
      {children}
    </Comp>
  );
}
