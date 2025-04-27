#!/bin/bash

# 部署辅助脚本
echo "===== Cloudflare Drop 部署脚本 ====="
echo "此脚本将帮助你配置和部署 Cloudflare Drop 应用"
echo ""

# 检查是否已安装必要的工具
if ! command -v wrangler &> /dev/null; then
    echo "错误: 请先安装 wrangler CLI"
    echo "安装命令: npm install -g wrangler"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "错误: 请先安装 pnpm"
    echo "安装命令: npm install -g pnpm"
    exit 1
fi

# 提示用户输入 D1 数据库 ID
echo "请输入你的 D1 数据库 ID (在 Cloudflare Dashboard 中创建):"
read d1_id
if [ -z "$d1_id" ]; then
  echo "错误: D1 数据库 ID 不能为空"
  exit 1
fi

# 提示用户输入 KV 命名空间 ID
echo "请输入你的 KV 命名空间 ID (在 Cloudflare Dashboard 中创建):"
read kv_id
if [ -z "$kv_id" ]; then
  echo "错误: KV 命名空间 ID 不能为空"
  exit 1
fi

# 提示用户设置管理员令牌
echo "请设置管理员后台访问令牌 (可选，用于访问 /admin/{token}):"
read admin_token

# 检测操作系统
OS="$(uname -s)"
echo "检测到操作系统: $OS"

# 更新 wrangler.toml 文件
echo "正在更新配置文件..."
if [[ "$OS" == "MINGW"* ]] || [[ "$OS" == "MSYS"* ]] || [[ "$OS" == "CYGWIN"* ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows 环境使用临时文件替换
    echo "Windows 环境下进行配置..."
    # 使用 Powershell 进行替换
    powershell -Command "(Get-Content wrangler.toml) -replace 'database_id = \"\"', 'database_id = \"$d1_id\"' | Set-Content wrangler.toml"
    powershell -Command "(Get-Content wrangler.toml) -replace 'id = \"\"', 'id = \"$kv_id\"' | Set-Content wrangler.toml"
    
    # 如果设置了管理员令牌，添加到环境变量
    if [ ! -z "$admin_token" ]; then
        if powershell -Command "Select-String -Path wrangler.toml -Pattern 'ADMIN_TOKEN'"; then
            powershell -Command "(Get-Content wrangler.toml) -replace 'ADMIN_TOKEN = \".*\"', 'ADMIN_TOKEN = \"$admin_token\"' | Set-Content wrangler.toml"
        else
            powershell -Command "(Get-Content wrangler.toml) -replace 'SHARE_DURATION = \"1hour\"', 'SHARE_DURATION = \"1hour\"\nADMIN_TOKEN = \"$admin_token\"' | Set-Content wrangler.toml"
        fi
    fi
else
    # Unix 环境使用 sed
    sed -i "s/database_id = \"\"/database_id = \"$d1_id\"/" wrangler.toml
    sed -i "s/id = \"\"/id = \"$kv_id\"/" wrangler.toml

    # 如果设置了管理员令牌，添加到环境变量
    if [ ! -z "$admin_token" ]; then
        # 检查是否已存在 ADMIN_TOKEN 变量
        if grep -q "ADMIN_TOKEN" wrangler.toml; then
            sed -i "s/ADMIN_TOKEN = \".*\"/ADMIN_TOKEN = \"$admin_token\"/" wrangler.toml
        else
            # 在 [vars] 部分添加 ADMIN_TOKEN
            sed -i "/SHARE_DURATION = \"1hour\"/a ADMIN_TOKEN = \"$admin_token\"" wrangler.toml
        fi
    fi
fi

# 安装依赖
echo "正在安装依赖..."
pnpm install

# 构建应用
echo "正在构建应用..."
pnpm run build:web

# 生成数据库迁移
echo "正在生成数据库迁移..."
pnpm run generate

# 执行数据库迁移
echo "正在应用数据库迁移..."
wrangler d1 migrations apply airdrop --remote

# 部署应用
echo "正在部署应用..."
wrangler deploy

echo ""
echo "===== 部署完成 ====="
echo "你的 Cloudflare Drop 应用已成功部署!"
echo "如果你设置了管理员令牌，可以通过 /admin/{token} 访问管理后台" 