#!/usr/bin/env bash
# ============================================================
# Step 3.4 端到端冒烟测试 —— /hall/dashboard
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

# 后天 16:00
MEET_AT=$(python3 -c "from datetime import datetime, timedelta, timezone; print((datetime.now(timezone.utc)+timedelta(days=2,hours=4)).isoformat())")

echo "==================================================="
echo "[1/4] 注册账号 + 登录"
echo "==================================================="
REG=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
  \"userId\":\"$USER_ID\",\"username\":\"大厅_$TS\",\"realName\":\"测试_$TS\",
  \"password\":\"$PASSWORD\",\"phone\":\"$PHONE\",\"college\":\"测试学院\"
}")
TOKEN=$(echo "$REG" | get_jq "d['data']['token']")
if [ -z "$TOKEN" ]; then echo "$REG" | pretty; exit 1; fi
H="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"
echo "TOKEN=${TOKEN:0:30}..."

echo
echo "==================================================="
echo "[2/4] 发一个 carpool(让 upcoming 有数据)"
echo "==================================================="
CP=$(curl -s -X POST "$BASE/rooms/carpool" -H "$H" -H "$CT" -d "{
  \"title\":\"大厅冒烟拼车_$TS\",\"totalNum\":4,\"meetTime\":\"$MEET_AT\",
  \"meetLocation\":\"学校南门\",
  \"startLocation\":\"学校南门\",\"endLocation\":\"虹桥火车站\"
}")
echo "$CP" | pretty

echo
echo "==================================================="
echo "[3/4] GET /hall/dashboard"
echo "==================================================="
curl -s "$BASE/hall/dashboard" -H "$H" | pretty

echo
echo "==================================================="
echo "[4/4] 无 token 应 10001"
echo "==================================================="
curl -s "$BASE/hall/dashboard" | pretty

echo
echo "==================================================="
echo "✅ 检查项:"
echo "  · [3] user.avatarText/Color 有值"
echo "  · [3] upcoming 不为 null,countdown 含'还有 N 天/小时'"
echo "  · [3] counts.carpool ≥ 1"
echo "  · [3] hot 是数组(可能为空,也可能含刚发的)"
echo "  · [3] onlineCount / matchToday 是数字"
echo "==================================================="
