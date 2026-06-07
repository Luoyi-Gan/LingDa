#!/usr/bin/env bash
# ============================================================
# Step 3.6 端到端冒烟测试 —— Evaluation 评价闭环
# 完整链路:
#   1) 房主 O + 申请人 A 注册
#   2) O 发 direct 房间
#   3) A 申请 → approved (direct 模式)
#   4) (失败用例) 房间未 finished,A 评 O → 30005
#   5) O 把房间标记 finished
#   6) A 评 O 5星 → 成功
#   7) (失败用例) A 重复评 O → 30006
#   8) (失败用例) A 评自己 → 10002
#   9) O 评 A 4星 → 成功
#  10) GET /rooms/:id/evaluations 应有 2 条
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
echo "[1/10] 注册 房主(O) + 申请人(A)"
echo "==================================================="
O_ID="20${TS: -8}"
A_ID="21${TS: -8}"
O_REG=$(register "$O_ID" "139${TS: -8}" "O_$TS")
A_REG=$(register "$A_ID" "138${TS: -8}" "A_$TS")
O_TOKEN=$(echo "$O_REG" | get_jq "d['data']['token']")
A_TOKEN=$(echo "$A_REG" | get_jq "d['data']['token']")
[ -z "$O_TOKEN" ] && { echo "$O_REG" | pretty; exit 1; }
[ -z "$A_TOKEN" ] && { echo "$A_REG" | pretty; exit 1; }
H_O="Authorization: Bearer $O_TOKEN"
H_A="Authorization: Bearer $A_TOKEN"
CT="Content-Type: application/json"
echo "O=$O_ID  A=$A_ID"

echo
echo "==================================================="
echo "[2/10] O 发 direct 房间"
echo "==================================================="
ROOM=$(curl -s -X POST "$BASE/rooms/group" -H "$H_O" -H "$CT" -d "{
  \"title\":\"评价测试_$TS\",\"totalNum\":3,\"meetTime\":\"$MEET_AT\",
  \"meetLocation\":\"图书馆\",\"courseName\":\"高数\",\"groupTarget\":\"刷题\"
}")
RID=$(echo "$ROOM" | get_jq "d['data']['roomId']")
echo "roomId=$RID"

echo
echo "==================================================="
echo "[3/10] A 申请加入(direct 直接 approved)"
echo "==================================================="
curl -s -X POST "$BASE/rooms/$RID/members" -H "$H_A" -H "$CT" -d '{}' | pretty

echo
echo "==================================================="
echo "[4/10] 失败用例:房间未 finished,A 评 O → 应 30005"
echo "==================================================="
curl -s -X POST "$BASE/rooms/$RID/evaluations" -H "$H_A" -H "$CT" -d "{
  \"targetUserId\":\"$O_ID\",\"score\":5,\"content\":\"too early\"
}" | pretty

echo
echo "==================================================="
echo "[5/10] O 标记房间 finished"
echo "==================================================="
curl -s -X PATCH "$BASE/rooms/$RID/finish" -H "$H_O" | pretty

echo
echo "==================================================="
echo "[6/10] A 评 O 5星 → 成功"
echo "==================================================="
curl -s -X POST "$BASE/rooms/$RID/evaluations" -H "$H_A" -H "$CT" -d "{
  \"targetUserId\":\"$O_ID\",\"score\":5,\"content\":\"超准时!\"
}" | pretty

echo
echo "==================================================="
echo "[7/10] 失败用例:A 重复评 O → 应 30006"
echo "==================================================="
curl -s -X POST "$BASE/rooms/$RID/evaluations" -H "$H_A" -H "$CT" -d "{
  \"targetUserId\":\"$O_ID\",\"score\":4,\"content\":\"dup\"
}" | pretty

echo
echo "==================================================="
echo "[8/10] 失败用例:A 评自己 → 应 10002"
echo "==================================================="
curl -s -X POST "$BASE/rooms/$RID/evaluations" -H "$H_A" -H "$CT" -d "{
  \"targetUserId\":\"$A_ID\",\"score\":5,\"content\":\"self\"
}" | pretty

echo
echo "==================================================="
echo "[9/10] O 评 A 4星 → 成功"
echo "==================================================="
curl -s -X POST "$BASE/rooms/$RID/evaluations" -H "$H_O" -H "$CT" -d "{
  \"targetUserId\":\"$A_ID\",\"score\":4,\"content\":\"会来事\"
}" | pretty

echo
echo "==================================================="
echo "[10/10] GET /rooms/$RID/evaluations 应有 2 条"
echo "==================================================="
curl -s "$BASE/rooms/$RID/evaluations" -H "$H_O" | pretty
echo "--- 顺便看一下 O 的 profile 评分应是 5.0,分布 5星=1 ---"
curl -s "$BASE/users/$O_ID/profile" -H "$H_O" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d['data']['rating']; print('average=',r['average'],'total=',r['total'],'5星=',r['distribution'][0]['count'])"

echo
echo "==================================================="
echo "✅ 10 个用例已跑完。检查项:"
echo "  · [4] code=30005 房间未完成"
echo "  · [6] 成功返回 evaluateId"
echo "  · [7] code=30006 重复评价"
echo "  · [8] code=10002 不能评价自己"
echo "  · [10] list 应有 2 条,O profile 评分=5.0"
echo "==================================================="
