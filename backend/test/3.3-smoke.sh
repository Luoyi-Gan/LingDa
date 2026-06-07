#!/usr/bin/env bash
# ============================================================
# Step 3.3 端到端冒烟测试
# 覆盖:发布 3 类房间 → 列表见到 → 详情 → cancel/finish
# ============================================================
set -e

BASE="http://localhost:3000/api/v1"

if ! curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 "$BASE/health" | grep -qE '^(200|401)$'; then
  echo "❌ 后端没起。先在另一终端 npm run start:dev"
  exit 1
fi

TS=$(date +%s)
USER_ID="20${TS: -8}"
PHONE="139${TS: -8}"
PASSWORD="abcd1234"

pretty() { python3 -m json.tool 2>/dev/null || cat; }
get_jq() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)" 2>/dev/null || echo ""; }

# 后天 16:00 (远未来,确保不触发 meetTime 过期)
MEET_AT=$(python3 -c "from datetime import datetime, timedelta, timezone; print((datetime.now(timezone.utc)+timedelta(days=2,hours=4)).isoformat())")

echo "==================================================="
echo "[1/9] 注册账号 + 登录拿 token (userId=$USER_ID)"
echo "==================================================="
REG=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
  \"userId\":\"$USER_ID\",\"username\":\"房主_$TS\",\"realName\":\"测试_$TS\",
  \"password\":\"$PASSWORD\",\"phone\":\"$PHONE\",\"college\":\"测试学院\"
}")
TOKEN=$(echo "$REG" | get_jq "d['data']['token']")
if [ -z "$TOKEN" ]; then echo "$REG" | pretty; exit 1; fi
echo "TOKEN=${TOKEN:0:30}..."

H="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

echo
echo "==================================================="
echo "[2/9] POST /rooms/carpool"
echo "==================================================="
CP=$(curl -s -X POST "$BASE/rooms/carpool" -H "$H" -H "$CT" -d "{
  \"title\":\"南门 → 虹桥火车站_$TS\",\"totalNum\":4,\"meetTime\":\"$MEET_AT\",
  \"meetLocation\":\"学校南门\",\"joinRule\":\"direct\",\"tags\":[\"不抽烟\",\"准时\"],
  \"startLocation\":\"学校南门\",\"endLocation\":\"虹桥火车站\",\"carType\":\"7座SUV\",\"costSplit\":50
}")
echo "$CP" | pretty
CP_ID=$(echo "$CP" | get_jq "d['data']['roomId']")

echo
echo "==================================================="
echo "[3/9] POST /rooms/entertainment"
echo "==================================================="
ENT=$(curl -s -X POST "$BASE/rooms/entertainment" -H "$H" -H "$CT" -d "{
  \"title\":\"五月天演唱会_$TS\",\"totalNum\":2,\"meetTime\":\"$MEET_AT\",
  \"meetLocation\":\"梅赛德斯文化中心\",\"entType\":\"演唱会\",\"cost\":380,\"equipment\":\"票已订\"
}")
echo "$ENT" | pretty
ENT_ID=$(echo "$ENT" | get_jq "d['data']['roomId']")

echo
echo "==================================================="
echo "[4/9] POST /rooms/group"
echo "==================================================="
GRP=$(curl -s -X POST "$BASE/rooms/group" -H "$H" -H "$CT" -d "{
  \"title\":\"高数突击_$TS\",\"totalNum\":6,\"meetTime\":\"$MEET_AT\",
  \"meetLocation\":\"中心图书馆\",\"courseName\":\"高等数学 B\",
  \"groupTarget\":\"互相抽查公式\",\"requireSkill\":\"看完前 3 章\"
}")
echo "$GRP" | pretty
GRP_ID=$(echo "$GRP" | get_jq "d['data']['roomId']")

echo
echo "==================================================="
echo "[5/9] GET /rooms/carpool 应能在列表里找到 roomId=$CP_ID"
echo "==================================================="
curl -s "$BASE/rooms/carpool" -H "$H" | pretty | head -40

echo
echo "==================================================="
echo "[6/9] GET /rooms/entertainment?cat=演唱会 应只见演唱会"
echo "==================================================="
curl -s "$BASE/rooms/entertainment?cat=演唱会" -H "$H" | pretty | head -40

echo
echo "==================================================="
echo "[7/9] GET /rooms/group 学习列表"
echo "==================================================="
curl -s "$BASE/rooms/group" -H "$H" | pretty | head -40

echo
echo "==================================================="
echo "[8/9] GET /rooms/$CP_ID 详情(我是房主 + approved)"
echo "==================================================="
curl -s "$BASE/rooms/$CP_ID" -H "$H" | pretty

echo
echo "==================================================="
echo "[9/9] PATCH /rooms/$CP_ID/cancel 应改为 cancelled"
echo "==================================================="
curl -s -X PATCH "$BASE/rooms/$CP_ID/cancel" -H "$H" | pretty

echo
echo "==================================================="
echo "✅ 9 个用例已跑完。检查项:"
echo "  · [2-4] 每条返回 roomId, currentNum=1, status='open'"
echo "  · [5]   list 里应能看到 [2] 那条 carpool"
echo "  · [6]   只见 entType='演唱会' 的"
echo "  · [8]   members[0].isOwner=true,canEvaluate=false"
echo "  · [9]   status='cancelled'"
echo "==================================================="
