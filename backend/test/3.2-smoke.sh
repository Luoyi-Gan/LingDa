#!/usr/bin/env bash
# ============================================================
# Step 3.2 端到端冒烟测试
# 验证 /users/:userId/profile + /users/:userId/evaluations
# 前置:Step 3.1 已通,后端在跑
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

echo "==================================================="
echo "[1/4] 注册一个新账号用来测 profile (userId=$USER_ID)"
echo "==================================================="
REG=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\":\"$USER_ID\",
    \"username\":\"小柚_$TS\",
    \"realName\":\"李柚子\",
    \"password\":\"$PASSWORD\",
    \"phone\":\"$PHONE\",
    \"college\":\"新闻与传播学院\",
    \"major\":\"网络与新媒体\",
    \"gender\":\"女\"
  }")
echo "$REG" | pretty
TOKEN=$(echo "$REG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token','') if d.get('data') else '')" 2>/dev/null || echo "")
if [ -z "$TOKEN" ]; then
  echo "❌ 注册失败"
  exit 1
fi

echo
echo "==================================================="
echo "[2/4] GET /users/$USER_ID/profile (新账号,所有计数应为 0)"
echo "==================================================="
curl -s "$BASE/users/$USER_ID/profile" \
  -H "Authorization: Bearer $TOKEN" | pretty

echo
echo "==================================================="
echo "[3/4] GET /users/$USER_ID/evaluations?page=1&pageSize=10"
echo "==================================================="
curl -s "$BASE/users/$USER_ID/evaluations?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" | pretty

echo
echo "==================================================="
echo "[4/4] 不存在的 userId 应返回 20001 NOT_FOUND"
echo "==================================================="
curl -s "$BASE/users/__nope__/profile" \
  -H "Authorization: Bearer $TOKEN" | pretty

echo
echo "==================================================="
echo "✅ 4 个用例已跑完。预期:"
echo "   [2/4] postCount=0, matchedUserCount=0, rating.total=0, 所有 achievements got=false"
echo "   [3/4] list=[], total=0"
echo "   [4/4] code=20001 用户不存在"
echo "==================================================="
