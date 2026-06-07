#!/usr/bin/env bash
# ============================================================
# Step 3.7 端到端冒烟测试 —— Social 好友/黑名单
# 3 个用户:A、B、C
#   1) 注册 A B C
#   2) A 加 B 好友 → pending
#   3) B incoming 列表应有 1 条
#   4) B accept → status=accepted
#   5) A 好友列表应有 B
#   6) A 加自己 → 应 10002
#   7) A 重复加 B → 应 40002
#   8) A 拉黑 C
#   9) C 加 A 好友 → 应 40001 (被对方拉黑)
#  10) A 解除拉黑 C → blocks 列表为空
#  11) A 删除 B 好友 → A friends 列表为空
# ============================================================
set -e

BASE="http://localhost:3000/api/v1"
if ! curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 "$BASE/health" | grep -qE '^(200|401)$'; then
  echo "❌ 后端没起。npm run start:dev"; exit 1
fi

TS=$(date +%s)
pretty() { python3 -m json.tool 2>/dev/null || cat; }
get_jq() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)" 2>/dev/null || echo ""; }

register() {
  curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
    \"userId\":\"$1\",\"username\":\"$3\",\"realName\":\"$3\",
    \"password\":\"abcd1234\",\"phone\":\"$2\",\"college\":\"测试学院\"
  }"
}

echo "==================================================="
echo "[1/11] 注册 A B C"
echo "==================================================="
A_ID="20${TS: -8}"
B_ID="21${TS: -8}"
C_ID="22${TS: -8}"
A_REG=$(register "$A_ID" "139${TS: -8}" "A_$TS")
B_REG=$(register "$B_ID" "138${TS: -8}" "B_$TS")
C_REG=$(register "$C_ID" "137${TS: -8}" "C_$TS")
A_TOKEN=$(echo "$A_REG" | get_jq "d['data']['token']")
B_TOKEN=$(echo "$B_REG" | get_jq "d['data']['token']")
C_TOKEN=$(echo "$C_REG" | get_jq "d['data']['token']")
[ -z "$A_TOKEN$B_TOKEN$C_TOKEN" ] && { echo "$A_REG"; exit 1; }
H_A="Authorization: Bearer $A_TOKEN"
H_B="Authorization: Bearer $B_TOKEN"
H_C="Authorization: Bearer $C_TOKEN"
CT="Content-Type: application/json"
echo "A=$A_ID  B=$B_ID  C=$C_ID"

echo
echo "==================================================="
echo "[2/11] A 加 B 好友 → pending"
echo "==================================================="
REQ=$(curl -s -X POST "$BASE/social/friend-requests" -H "$H_A" -H "$CT" -d "{\"targetUserId\":\"$B_ID\"}")
echo "$REQ" | pretty
FRIEND_ID=$(echo "$REQ" | get_jq "d['data']['friendId']")

echo
echo "==================================================="
echo "[3/11] B GET /social/friend-requests?direction=incoming"
echo "==================================================="
curl -s "$BASE/social/friend-requests?direction=incoming" -H "$H_B" | pretty

echo
echo "==================================================="
echo "[4/11] B accept → accepted"
echo "==================================================="
curl -s -X PATCH "$BASE/social/friend-requests/$FRIEND_ID" -H "$H_B" -H "$CT" -d '{"action":"accept"}' | pretty

echo
echo "==================================================="
echo "[5/11] A GET /social/friends (应有 B)"
echo "==================================================="
curl -s "$BASE/social/friends" -H "$H_A" | pretty

echo
echo "==================================================="
echo "[6/11] A 加自己 → 应 10002"
echo "==================================================="
curl -s -X POST "$BASE/social/friend-requests" -H "$H_A" -H "$CT" -d "{\"targetUserId\":\"$A_ID\"}" | pretty

echo
echo "==================================================="
echo "[7/11] A 再加 B → 应 40002(已是好友)"
echo "==================================================="
curl -s -X POST "$BASE/social/friend-requests" -H "$H_A" -H "$CT" -d "{\"targetUserId\":\"$B_ID\"}" | pretty

echo
echo "==================================================="
echo "[8/11] A 拉黑 C"
echo "==================================================="
curl -s -X POST "$BASE/social/blocks" -H "$H_A" -H "$CT" -d "{\"targetUserId\":\"$C_ID\"}" | pretty
echo "--- A 的 blocks 列表 ---"
curl -s "$BASE/social/blocks" -H "$H_A" | pretty

echo
echo "==================================================="
echo "[9/11] C 加 A 好友 → 应 40001(被 A 拉黑)"
echo "==================================================="
curl -s -X POST "$BASE/social/friend-requests" -H "$H_C" -H "$CT" -d "{\"targetUserId\":\"$A_ID\"}" | pretty

echo
echo "==================================================="
echo "[10/11] A 解除拉黑 C → blocks 列表为空"
echo "==================================================="
curl -s -X DELETE "$BASE/social/blocks/$C_ID" -H "$H_A" | pretty
curl -s "$BASE/social/blocks" -H "$H_A" | pretty

echo
echo "==================================================="
echo "[11/11] A 删除 B 好友 → A friends 列表为空"
echo "==================================================="
curl -s -X DELETE "$BASE/social/friends/$B_ID" -H "$H_A" | pretty
curl -s "$BASE/social/friends" -H "$H_A" | pretty

echo
echo "==================================================="
echo "✅ 11 个用例已跑完。检查项:"
echo "  · [2] friendId 有,status='pending'"
echo "  · [3] incoming 含 fromUser=A"
echo "  · [4] status='accepted'"
echo "  · [5] A friends 含 B"
echo "  · [6] code=10002"
echo "  · [7] code=40002"
echo "  · [9] code=40001"
echo "  · [10] 解除后 list 为空"
echo "  · [11] 删除后 list 为空"
echo "==================================================="
