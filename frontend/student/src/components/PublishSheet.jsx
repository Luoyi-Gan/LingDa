// UI 重做 Phase 7：PublishSheet —— 发起组队的 3 选项浮层
// 用 shadcn Dialog（自带 sheet 风格 + 动画），3 选项配三主色 tint + lucide 图标
import { useNavigate } from 'react-router-dom';
import { Car, Film, BookOpen, ArrowRight } from 'lucide-react';
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
    tone: 'bg-blue-50 text-blue-700',
    path: '/form-carpool',
  },
  {
    key: 'entertainment',
    icon: Film,
    name: '娱乐',
    desc: '演唱会 / 剧本杀 / KTV',
    tone: 'bg-orange-50 text-orange-700',
    path: '/form-entertainment',
  },
  {
    key: 'study',
    icon: BookOpen,
    name: '课程组队',
    desc: '按课程编号找项目队友',
    tone: 'bg-emerald-50 text-emerald-700',
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
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-lg border-slate-200 bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 p-5 pb-4">
          <DialogTitle className="text-xl text-slate-950">发起组队</DialogTitle>
          <DialogDescription className="text-slate-500">
            选择一个场景，系统会帮你匹配合适的人。
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-slate-100">
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            return (
              <button
                type="button"
                key={o.key}
                onClick={() => pick(o.path)}
                className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
              >
                <div className={cn('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', o.tone)}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-base font-bold text-slate-950">{o.name}</div>
                  <div className="mt-0.5 truncate text-sm text-slate-500">{o.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
