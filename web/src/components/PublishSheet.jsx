// UI 重做 Phase 7：PublishSheet —— 发起组队的 3 选项浮层
// 用 shadcn Dialog（自带 sheet 风格 + 动画），3 选项配三主色 tint + lucide 图标
import { useNavigate } from 'react-router-dom';
import { Car, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { cn } from '../lib/cn';

const OPTIONS = [
  {
    key: 'carpool',
    icon: Car,
    name: '拼车',
    desc: '同路同行 · 分摊车费',
    tint: 't-sky',
    path: '/form-carpool',
  },
  {
    key: 'entertainment',
    icon: Sparkles,
    name: '娱乐',
    desc: '演唱会 / 剧本杀 / KTV',
    tint: 't-violet',
    path: '/form-entertainment',
  },
  {
    key: 'study',
    icon: BookOpen,
    name: '学习',
    desc: '自习 / 课题 / 英语角',
    tint: 't-teal',
    path: '/form-study',
  },
];

export default function PublishSheet({ open, onClose }) {
  const navigate = useNavigate();

  const pick = (path) => {
    onClose && onClose();
    setTimeout(() => navigate(path), 60);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-5 pb-2">
          <DialogTitle>发起组队</DialogTitle>
          <DialogDescription>挑一类，开始你的搭子之旅</DialogDescription>
        </DialogHeader>
        <div className="p-3 space-y-2">
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.key}
                onClick={() => pick(o.path)}
                className={cn(
                  'group w-full flex items-center gap-4 p-4 rounded-bento border-transparent transition-all relative overflow-hidden text-left',
                  'hover:-translate-y-0.5 hover:shadow-bento',
                  o.tint,
                )}
              >
                <Icon
                  aria-hidden
                  className="absolute -right-3 -bottom-3 h-20 w-20 opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all"
                  strokeWidth={1.25}
                />
                <div className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/55 dark:bg-white/10 shrink-0">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="relative flex-1 min-w-0">
                  <div className="font-heading text-base font-bold">{o.name}</div>
                  <div className="text-xs opacity-75 mt-0.5 truncate">{o.desc}</div>
                </div>
                <ArrowRight className="relative h-4 w-4 opacity-50 group-hover:opacity-90 group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
