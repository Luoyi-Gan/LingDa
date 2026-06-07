#!/usr/bin/env bash
# ============================================================
# Step 3.5 端到端冒烟测试 —— Member 状态机
# 流程:
#   1) 注册 房主 + 申请人
#   2) 房主发一个 audit 房间 (joinRule='audit')
#   3) 申请人申请 → 应得 pending
#   4) 房主看到 pending 申请
#   5) 房主 approve → 申请人 status=approved,room.currentNum +1
#   6) 申请人 leave → status=left,room.currentNum -1
#   7) 房主再发一个 direct 房间
#   8) 申请人申请 → 直接 approved
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
  local uid=$1 phone=$2 name=$3
  curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
    \"userId\":\"$uid\",\"username\":\"$name\",\"realName\":\"$name\",
    \"password\":\"abcd1234\",\"phone\":\"$phone\",\"college\":\"测试学院\"
  }"
}

echo "==================================================="
echo "[1/9] 注册 房主(O) 和 申请人(A)"
echo "==================================================="
OWNER_ID="20${TS: -8}"
OWNER_PHONE="139${TS: -8}"
APPLY_ID="21${TS: -8}"
APPLY_PHONE="138${TS: -8}"

O_REG=$(register "$OWNER_ID" "$OWNER_PHONE" "房主_$TS")
A_REG=$(register "$APPLY_ID" "$APPLY_PHONE" "申请人_$TS")
O_TOKEN=$(echo "$O_REG" | get_jq "d['data']['token']")
A_TOKEN=$(echo "$A_REG" | get_jq "d['data']['token']")
if [ -z "$O_TOKEN" ] || [ -z "$A_TOKEN" ]; then echo "$O_REG $A_REG" | pretty; exit 1; fi
echo "OWNER=$OWNER_ID  APPLY=$APPLY_ID"

H_O="Authorization: Bearer $O_TOKEN"
H_A="Authorization: Bearer $A_TOKEN"
CT="Content-Type: application/json"

echo
echo "==================================================="
echo "[2/9] 房主发一个 audit 模式的拼车"
echo "==================================================="
ROOM_AUDIT=$(curl -s -X POST "$BASE/rooms/carpool" -H "$H_O" -H "$CT" -d "{
  \"title\":\"audit_$TS\",\"totalNum\":4,\"meetTime\":\"$MEET_AT\",
  \"meetLocation\":\"南门\",\"joinRule\":\"audit\",
  \"startLocation\":\"南门\",\"endLocation\":\"虹桥\"
}")
echo "$ROOM_AUDIT" | pretty
RID_A=$(echo "$ROOM_AUDIT" | get_jq "d['data']['roomId']")

echo
echo "==================================================="
echo "[3/9] 申请人 POST /rooms/$RID_A/members → 应得 pending"
echo "==================================================="
APP=$(curl -s -X POST "$BASE/rooms/$RID_A/members" -H "$H_A" -H "$CT" -d '{}')
echo "$APP" | pretty
MEMBER_ID=$(echo "$APP" | get_jq "d['data']['memberId']")

echo
echo "==================================================="
echo "[4/9] 房主 GET /rooms/$RID_A/applications"
echo "==================================================="
curl -s "$BASE/rooms/$RID_A/applications" -H "$H_O" | pretty

echo
echo "==================================================="
echo "[5/9] 房主 approve → 应 approved,room.currentNum=2"
echo "==================================================="
curl -s -X PATCH "$BASE/rooms/$RID_A/applications/$MEMBER_ID" \
  -H "$H_O" -H "$CT" -d '{"action":"approve"}' | pretty
echo "--- 再看房间详情 ---"
curl -s "$BASE/rooms/$RID_A" -H "$H_O" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d['data']['room']; print('currentNum=',r['currentNum'],'status=',r['status'])"

echo
echo "==================================================="
echo "[6/9] 申请人 DELETE /rooms/$RID_A/members/me → currentNum=1"
echo "==================================================="
curl -s -X DELETE "$BASE/rooms/$RID_A/members/me" -H "$H_A" | pretty
curl -s "$BASE/rooms/$RID_A" -H "$H_O" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d['data']['room']; print('currentNum=',r['currentNum'],'status=',r['status'])"

echo
echo "==================================================="
echo "[7/9] 房主再发 direct 模式的房间"
echo "==================================================="
ROOM_DIRECT=$(curl -s -X POST "$BASE/rooms/group" -H "$H_O" -H "$CT" -d "{
  \"title\":\"direct_$TS\",\"totalNum\":3,\"meetTime\":\"$MEET_AT\",
  \"meetLocation\":\"图书馆\",
  \"courseName\":\"高数\",\"groupTarget\":\"刷题\"
}")
RID_D=$(echo "$ROOM_DIRECT" | get_jq "d['data']['roomId']")
echo "direct roomId=$RID_D"

echo
echo "==================================================="
echo "[8/9] 申请人申请 direct 房间 → 直接 approved"
echo "==================================================="
curl -s -X POST "$BASE/rooms/$RID_D/members" -H "$H_A" -H "$CT" -d '{}' | pretty

echo
echo "==================================================="
echo "[9/9] 申请人 GET /users/me/applications + GET /users/me/rooms"
echo "==================================================="
echo "--- applications ---"
curl -s "$BASE/users/me/applications" -H "$H_A" | pretty | head -40
echo "--- rooms ongoing ---"
curl -s "$BASE/users/me/rooms?phase=ongoing" -H "$H_A" | pretty | head -40

echo
echo "==================================================="
echo "✅ 9 个用例已跑完。检查项:"
echo "  · [3] status='pending'"
echo "  · [5] approve 后 currentNum=2"
echo "  · [6] leave 后 currentNum=1"
echo "  · [8] direct 房间一申请就 approved"
echo "  · [9] applications 有 left 和 approved 各一条"
echo "==================================================="
