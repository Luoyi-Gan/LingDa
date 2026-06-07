// 好友申请处理面板 —— UI 重做：shadcn Dialog + Tailwind
import { useFriends } from '../context/FriendsContext';
import { Inbox, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';

export default function FriendRequestsModal({ onClose }) {
  const { incoming = [], audit } = useFriends() || {};

  const accept = (fid) => audit(fid, 'accept');
  const reject = (fid) => audit(fid, 'reject');

  return (
    <Dialog open onOpenChange={(o) => !o && onClose && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>好友申请</DialogTitle>
          <DialogDescription>
            {incoming.length > 0 ? `${incoming.length} 条待处理` : '暂无新申请'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-3 pb-4 max-h-[60vh] overflow-y-auto">
          {incoming.length === 0 && (
            <div className="rounded-bento border border-dashed border-border p-10 mx-2 flex flex-col items-center text-center">
              <Inbox className="h-9 w-9 text-muted-foreground/40 mb-3" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">暂无待处理申请</p>
            </div>
          )}
          <div className="space-y-1.5">
            {incoming.map((r) => (
              <div
                key={r.friend_id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback
                    style={{ background: r.avatar_color }}
                    className="text-white font-bold"
                  >
                    {r.avatar_text}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {r.username}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums truncate">
                    学号 {r.user_id}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="cta"
                  onClick={() => accept(r.friend_id)}
                  className="shrink-0"
                >
                  <Check className="h-3.5 w-3.5" />
                  同意
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => reject(r.friend_id)}
                  className="shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                  婉拒
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
