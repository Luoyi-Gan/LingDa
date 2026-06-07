#!/usr/bin/env bash
# ============================================================
# Step 3.1 端到端冒烟测试
# 前置:MySQL 已起,DBA 的 schema.sql 已执行,backend 已 npm run start:dev
# 用法:
#   chmod +x test/3.1-smoke.sh && ./test/3.1-smoke.sh
# ============================================================
set -e

BASE="http://localhost:3000/api/v1"

# ----- 预检:服务是否在 3000 端口 -----
if ! curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 "$BASE/health" | grep -qE '^(200|401)$'; then
  echo "❌ 后端没起。先在另一个终端跑:"
  echo "   cd $(pwd) && npm run start:dev"
  echo "   等看到 '🚀 dazi-backend ready...' 再回来跑本脚本。"
  exit 1
fi

# 用时间戳保证学号 / 手机号每次跑都唯一(避免 11001 冲突)
TS=$(date +%s)
USER_ID="20${TS: -8}"
PHONE="139${TS: -8}"
PASSWORD="abcd1234"

pretty() { python3 -m json.tool 2>/dev/null || cat; }

echo "==================================================="
echo "[1/6] 健康检查"
echo "==================================================="
curl -s "$BASE/health" | pretty
echo

echo "==================================================="
echo "[2/6] 注册新账号 (userId=$USER_ID phone=$PHONE)"
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
  echo
  echo "❌ 注册失败,没拿到 token。看终端 1 的服务端日志查具体堆栈。"
  exit 1
fi
echo "TOKEN=${TOKEN:0:30}..."

echo
echo "==================================================="
echo "[3/6] 同一学号重复注册(应 11001)"
echo "==================================================="
curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\":\"$USER_ID\",
    \"username\":\"dup\",
    \"realName\":\"dup\",
    \"password\":\"$PASSWORD\",
    \"phone\":\"138$TS\",
    \"college\":\"X\"
  }" | pretty

echo
echo "==================================================="
echo "[4/6] 登录(应返回 token)"
echo "==================================================="
curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"password\":\"$PASSWORD\"}" | pretty

echo
echo "==================================================="
echo "[5/6] 没带 token 访问 /users/me(应 10001)"
echo "==================================================="
curl -s "$BASE/users/me" | pretty

echo
echo "==================================================="
echo "[6/6] 带 token 访问 /users/me + PATCH 更新 tags"
echo "==================================================="
curl -s "$BASE/users/me" -H "Authorization: Bearer $TOKEN" | pretty

echo "--- PATCH ---"
curl -s -X PATCH "$BASE/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tags":["i人","爱看演唱会","喜欢自习"],"msgPermission":"friends"}' | pretty

echo
echo "==================================================="
echo "✅ 所有 6 个用例已跑完"
echo "==================================================="
