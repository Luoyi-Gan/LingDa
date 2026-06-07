// 匹配筛选弹窗（#4a）—— UI 重做：shadcn Dialog 重写
// 三种 type：carpool（出发/目的/时间）、entertainment（类型/地点/时间）、group（课程/地点）
import { useState } from 'react';
import PlaceAutocomplete from './PlaceAutocomplete';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/cn';

const ENT_TYPES = [
  '演唱会', '剧本杀', 'KTV', '密室', '观影', '展览', '游戏', '聚餐', '其他',
];

const TITLE = {
  carpool: '筛选拼车队伍',
  entertainment: '筛选娱乐队伍',
  group: '筛选学习队伍',
  study: '筛选学习队伍',
};

export default function MatchFilterModal({ open = true, type, initial, onSubmit, onClose, onShowAll }) {
  const [v, setV] = useState(() => ({
    startLocation: initial?.startLocation || '',
    endLocation: initial?.endLocation || '',
    meetLocation: initial?.meetLocation || '',
    courseName: initial?.courseName || '',
    entType: initial?.entType || '',
    date: initial?.date || '',
    time: initial?.time || '',
  }));

  const submit = () => {
    const meetTime = v.date && v.time
      ? new Date(`${v.date}T${v.time}:00`).toISOString()
      : undefined;
    const payload = {
      startLocation: v.startLocation || undefined,
      endLocation: v.endLocation || undefined,
      meetLocation: v.meetLocation || undefined,
      courseName: v.courseName || undefined,
      entType: v.entType || undefined,
      meetTime,
    };
    onSubmit && onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>{TITLE[type] || '筛选'}</DialogTitle>
          <DialogDescription>
            填写已知条件，留空视为不限，按相似度排前 5。
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-3 space-y-4 max-h-[60vh] overflow-y-auto">
          {type === 'carpool' && (
            <>
              <Field label="出发地">
                <PlaceAutocomplete
                  value={v.startLocation}
                  onChange={(x) => setV((s) => ({ ...s, startLocation: x }))}
                  placeholder="例如：学校南门"
                />
              </Field>
              <Field label="目的地">
                <PlaceAutocomplete
                  value={v.endLocation}
                  onChange={(x) => setV((s) => ({ ...s, endLocation: x }))}
                  placeholder="例如：虹桥火车站"
                />
              </Field>
            </>
          )}

          {type === 'entertainment' && (
            <>
              <Field label="类型">
                <div className="flex flex-wrap gap-2">
                  {ENT_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() =>
                        setV((s) => ({
                          ...s,
                          entType: s.entType === t ? '' : t,
                        }))
                      }
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                        v.entType === t
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="地点">
                <PlaceAutocomplete
                  value={v.meetLocation}
                  onChange={(x) => setV((s) => ({ ...s, meetLocation: x }))}
                  placeholder="例如：万达影城"
                />
              </Field>
            </>
          )}

          {(type === 'group' || type === 'study') && (
            <>
              <Field label="课程 / 科目">
                <Input
                  value={v.courseName}
                  onChange={(e) => setV((s) => ({ ...s, courseName: e.target.value }))}
                  placeholder="例如：高等数学"
                />
              </Field>
              <Field label="地点">
                <PlaceAutocomplete
                  value={v.meetLocation}
                  onChange={(x) => setV((s) => ({ ...s, meetLocation: x }))}
                  placeholder="例如：图书馆三楼"
                />
              </Field>
            </>
          )}

          {type !== 'group' && type !== 'study' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="日期">
                <Input
                  type="date"
                  value={v.date}
                  onChange={(e) => setV((s) => ({ ...s, date: e.target.value }))}
                />
              </Field>
              <Field label="时间">
                <Input
                  type="time"
                  value={v.time}
                  onChange={(e) => setV((s) => ({ ...s, time: e.target.value }))}
                />
              </Field>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row gap-2 p-5 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onShowAll} className="flex-1">
            看全部
          </Button>
          <Button variant="cta" onClick={submit} className="flex-[1.4]">
            匹配
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
