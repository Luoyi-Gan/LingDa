#!/usr/bin/env bash
# ============================================================
# Step 3.8 端到端冒烟测试 —— Chat REST
# 链路:
#   1) 注册 房主 O + 用户 A + 用户 B
#   2) O 发拼车房间(direct),A 申请 → approved
#   3) (群聊)A 在房里发消息 → O 拉历史能见
#   4) (私聊)O 给 A 私聊 → A 拉历史能见
#   5) GET /chat/conversations 应同时见到 1 个群 + 1 个私
#   6) A 标记群聊已读 → unread 回 0
#   7) POST /chat/messages without roomId/targetUserId → 校验失败
# ============================================================
set -e

BASE="http://localhost:3000/api/v1"
if ! curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 "$BASE/health" | grep -qE '^(200|401)$'; then
  echo "❌ 后端没起。npm run start:dev"; exit 1
fi

TS=$(date +%s)
pretty() { python3 -m json.tool 2>/dev/null || cat; }
get_jq() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)" 2>/dev/null || echo ""; }
MEET_AT=$(python3 -c "from datetime import datetime, timedelta, timezone; print((datetime.now(timezone.utc)+timedelta(days=2,hours=4)).isoformat())")

register() {
  curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
    \"userId\":\"$1\",\"username\":\"$3\",\"realName\":\"$3\",
    \"password\":\"abcd1234\",\"phone\":\"$2\",\"college\":\"测试学院\"
  }"
}

echo "==================================================="
echo "[1/8] 注册 O + A + B"
echo "==================================================="
O_ID="20${TS: -8}"
A_ID="21${TS: -8}"
B_ID="22${TS: -8}"
O_REG=$(register "$O_ID" "139${TS: -8}" "O_$TS")
A_REG=$(register "$A_ID" "138${TS: -8}" "A_$TS")
B_REG=$(register "$B_ID" "137${TS: -8}" "B_$TS")
O_TOKEN=$(echo "$O_REG" | get_jq "d['data']['token']")
A_TOKEN=$(echo "$A_REG" | get_jq "d['data']['token']")
B_TOKEN=$(echo "$B_REG" | get_jq "d['data']['token']")
[ -z "$O_TOKEN$A_TOKEN$B_TOKEN" ] && { echo "$O_REG"; exit 1; }
H_O="Authorization: Bearer $O_TOKEN"
H_A="Authorization: Bearer $A_TOKEN"
H_B="Authorization: Bearer $B_TOKEN"
CT="Content-Type: application/json"
echo "O=$O_ID  A=$A_ID  B=$B_ID"

echo
echo "==================================================="
echo "[2/8] O 发 direct 拼车,A 申请 → approved"
echo "==================================================="
ROOM=$(curl -s -X POST "$BASE/rooms/carpool" -H "$H_O" -H "$CT" -d "{
  \"title\":\"chat_room_$TS\",\"totalNum\":4,\"meetTime\":\"$MEET_AT\",
  \"meetLocation\":\"南门\",
  \"startLocation\":\"南门\",\"endLocation\":\"虹桥\"
}")
RID=$(echo "$ROOM" | get_jq "d['data']['roomId']")
echo "roomId=$RID"
curl -s -X POST "$BASE/rooms/$RID/members" -H "$H_A" -H "$CT" -d '{}' | python3 -c "import sys,json; print('member status=',json.load(sys.stdin)['data']['status'])"

echo
echo "==================================================="
echo "[3/8] 群聊:A 在 room=$RID 发 2 条,O 拉历史"
echo "==================================================="
curl -s -X POST "$BASE/chat/messages" -H "$H_A" -H "$CT" -d "{\"roomId\":$RID,\"content\":\"我已在校门口\"}" | pretty
curl -s -X POST "$BASE/chat/messages" -H "$H_A" -H "$CT" -d "{\"roomId\":$RID,\"content\":\"等你 5 分钟\"}" | pretty
echo "--- O 拉历史 (convId=group_$RID) ---"
curl -s "$BASE/chat/conversations/group_$RID/messages" -H "$H_O" | pretty

echo
echo "==================================================="
echo "[4/8] 私聊:O 给 A 发 2 条,A 拉历史"
echo "==================================================="
curl -s -X POST "$BASE/chat/messages" -H "$H_O" -H "$CT" -d "{\"targetUserId\":\"$A_ID\",\"content\":\"路上注意安全\"}" | pretty
curl -s -X POST "$BASE/chat/messages" -H "$H_O" -H "$CT" -d "{\"targetUserId\":\"$A_ID\",\"content\":\"明天还拼车吗\"}" | pretty
echo "--- A 拉历史 (convId=private_$O_ID) ---"
curl -s "$BASE/chat/conversations/private_$O_ID/messages" -H "$H_A" | pretty

echo
echo "==================================================="
echo "[5/8] A 的 conversations 列表 应有 群 + 私 各 1"
echo "==================================================="
curl -s "$BASE/chat/conversations" -H "$H_A" | pretty

echo
echo "==================================================="
echo "[6/8] A 标记群聊已读 → 再拉 conversations 群 unread=0"
echo "==================================================="
curl -s -X POST "$BASE/chat/conversations/group_$RID/read" -H "$H_A" | pretty
curl -s "$BASE/chat/conversations" -H "$H_A" | python3 -c "
import sys,json
for c in json.load(sys.stdin)['data']['list']:
  print(c['convId'], 'unread=', c['unread'])
"

echo
echo "==================================================="
echo "[7/8] 失败用例:既不带 roomId 也不带 targetUserId"
echo "==================================================="
curl -s -X POST "$BASE/chat/messages" -H "$H_A" -H "$CT" -d "{\"content\":\"漂浮消息\"}" | pretty

echo
echo "==================================================="
echo "[8/8] 失败用例:非成员的 B 在群聊里发消息 → 应 10002"
echo "==================================================="
curl -s -X POST "$BASE/chat/messages" -H "$H_B" -H "$CT" -d "{\"roomId\":$RID,\"content\":\"乱入\"}" | pretty

echo
echo "==================================================="
echo "✅ 8 个用例已跑完。检查项:"
echo "  · [3] O 看到 2 条群聊消息 isMe=false"
echo "  · [4] A 看到 2 条私聊消息 isMe=false"
echo "  · [5] A 的 list 含 group_$RID + private_$O_ID 各 1"
echo "  · [6] markRead 后 unread=0"
echo "  · [7] code=10003 校验失败"
echo "  · [8] code=10002 不是成员"
echo "==================================================="
