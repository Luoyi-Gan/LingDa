// 全站好友状态：一次拉取 + 内存缓存，供 UserCard / 聊天列表 / 申请列表共用
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api } from '../lib/api';
import authLib from '../lib/auth';

const FriendsCtx = createContext(null);
export function useFriends() {
  return useContext(FriendsCtx);
}

export function FriendsProvider({ children }) {
  // status: 'friend' | 'outgoing' | 'incoming' | 'none'
  const [friends, setFriends] = useState([]); // [{user_id, username, avatar_text, avatar_color, since}]
  const [outgoing, setOutgoing] = useState([]); // 我发出去待审 [{friend_id, user_id, ...}]
  const [incoming, setIncoming] = useState([]); // 别人发我待审 [{friend_id, user_id, ...}]
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    if (!authLib.hasToken()) return;
    Promise.all([
      api.social.friends(),
      api.social.listRequests({ direction: 'outgoing' }),
      api.social.listRequests({ direction: 'incoming' }),
    ])
      .then(([fs, out, inc]) => {
        setFriends(fs.list || []);
        setOutgoing(out.list || []);
        setIncoming(inc.list || []);
        setLoaded(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getStatus = useCallback(
    (uid) => {
      if (!uid) return 'none';
      if (friends.some((f) => f.user_id === uid)) return 'friend';
      if (outgoing.some((f) => f.user_id === uid)) return 'outgoing';
      if (incoming.some((f) => f.user_id === uid)) return 'incoming';
      return 'none';
    },
    [friends, outgoing, incoming],
  );

  const findIncomingFriendId = useCallback(
    (uid) => incoming.find((f) => f.user_id === uid)?.friend_id,
    [incoming],
  );

  const sendRequest = useCallback(async (uid) => {
    const r = await api.social.sendRequest({ targetUserId: uid });
    refresh();
    return r;
  }, [refresh]);

  const removeFriend = useCallback(
    async (uid) => {
      await api.social.removeFriend(uid);
      refresh();
    },
    [refresh],
  );

  const audit = useCallback(
    async (friendId, action) => {
      await api.social.auditRequest(friendId, action);
      refresh();
    },
    [refresh],
  );

  return (
    <FriendsCtx.Provider
      value={{
        friends,
        outgoing,
        incoming,
        loaded,
        getStatus,
        findIncomingFriendId,
        sendRequest,
        removeFriend,
        audit,
        refresh,
      }}
    >
      {children}
    </FriendsCtx.Provider>
  );
}
