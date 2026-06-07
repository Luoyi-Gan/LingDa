// shadcn 标配 className 合并工具：clsx 处理条件，twMerge 解决 utility 冲突
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
