// 评价队友面板 —— 3 个详情页共用（房间 finished 且我是 approved 成员时出现）
// UI 重做：Tailwind + amber 强调，挂在 t-amber 色块里
import { useState } from 'react';
import { Star } from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Card } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/cn';

export default function EvaluatePanel({ roomId, targets, onDone }) {
  const { showToast } = useUI();
  const [forms, setForms] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setScore = (uid, s) =>
    setForms((f) => ({ ...f, [uid]: { ...f[uid], score: s } }));
  const setContent = (uid, v) =>
    setForms((f) => ({ ...f, [uid]: { ...f[uid], content: v } }));

  const submit = async () => {
    const entries = targets
      .map((t) => [t.user_id, forms[t.user_id]])
      .filter(([, v]) => v && v.score);
    if (!entries.length) {
      showToast({ title: '请至少给一位队友打分', icon: 'none' });
      return;
    }
    setSubmitting(true);
    let ok = 0;
    for (const [uid, v] of entries) {
      try {
        await api.evaluations.submit(roomId, {
          targetUserId: uid,
          score: v.score,
          content: v.content || undefined,
        });
        ok += 1;
      } catch {
        // api.js 已 toast
      }
    }
    setSubmitting(false);
    if (ok > 0) {
      showToast({ title: '评价已提交', icon: 'success' });
      onDone && onDone();
    }
  };

  if (!targets || targets.length === 0) return null;

  return (
    <Card bento className="t-amber border-transparent p-5 md:p-6 mb-4 relative overflow-hidden">
      <Star
        aria-hidden
        className="absolute -right-8 -bottom-8 h-36 w-36 opacity-20"
        strokeWidth={1.25}
        fill="currentColor"
        fillOpacity={0.4}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-4 w-4" fill="currentColor" />
          <p className="font-heading text-base font-bold">评价队友</p>
          <span className="ml-auto text-xs opacity-75">
            活动已结束，给同行的伙伴打个分吧
          </span>
        </div>

        <div className="space-y-3">
          {targets.map((t) => {
            const cur = forms[t.user_id] || {};
            return (
              <div
                key={t.user_id}
                className="rounded-xl bg-white/55 dark:bg-white/10 backdrop-blur-sm p-3 md:p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback
                      style={{ background: t.avatar_color }}
                      className="text-white text-xs font-bold"
                    >
                      {t.avatar_text}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-sm truncate flex-1">
                    {t.username}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setScore(t.user_id, s)}
                        className={cn(
                          'p-0.5 transition-transform hover:scale-110',
                          (cur.score || 0) >= s
                            ? 'text-amber-500'
                            : 'text-foreground/20',
                        )}
                      >
                        <Star className="h-5 w-5" fill="currentColor" />
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  placeholder="一句话评价（选填）"
                  value={cur.content || ''}
                  maxLength={200}
                  onChange={(e) => setContent(t.user_id, e.target.value)}
                  className="bg-white/70 dark:bg-white/15 border-0"
                />
              </div>
            );
          })}
        </div>

        <Button
          variant="cta"
          disabled={submitting}
          onClick={submit}
          className="w-full mt-4"
        >
          {submitting ? '提交中…' : '提交评价'}
        </Button>
      </div>
    </Card>
  );
}
