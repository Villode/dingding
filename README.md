# Cloudflare Drop

基于 Cloudflare Worker、D1Database 和 KV 实现的轻量级文件分享工具。

<img src="assets/IMG_5898.png" width="200">
<img src="assets/IMG_5899.png" width="200">
<img src="assets/IMG_5900.png" width="200">
<img src="assets/IMG_5901.png" width="200">

## 自动部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/oustn/cloudflare-drop)

1. 点击按钮，跳转到自动部署页面
2. 根据页面指引，关联 GitHub & Cloudflare，配置 Cloudflare Account ID & API Key
3. Fork 仓库
4. 开启 Action
5. 部署

> 创建 Cloudflare API Key 时，如果使用 worker 模板创建，请记得添加 D1 的编辑权限。

## 手动部署 (推荐)

如果自动部署出现问题，可以使用手动部署方式：

1. 克隆仓库到本地
   ```bash
   git clone https://github.com/oustn/cloudflare-drop.git
   cd cloudflare-drop
   ```

2. 在 Cloudflare Dashboard 中创建 [D1Database](https://developers.cloudflare.com/d1/get-started/#2-create-a-database) 和 [KV Namespace](https://developers.cloudflare.com/kv/get-started/#2-create-a-kv-namespace)，记下各自的 ID

3. 使用部署脚本进行部署

   **Linux/macOS 用户**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

   **Windows 用户**:
   ```bash
   # 使用 PowerShell 执行
   ./deploy.sh
   
   # 或者使用 Git Bash
   bash deploy.sh
   ```

4. 按照脚本提示输入 D1 数据库 ID、KV 命名空间 ID 和管理员令牌

部署脚本会自动配置 wrangler.toml 文件、构建前端、应用数据库迁移并部署应用。

## 手动配置方法

如果部署脚本无法运行，可以手动配置：

1. 编辑 `wrangler.toml` 文件，填入你的 D1 数据库 ID 和 KV 命名空间 ID
2. 安装依赖: `pnpm install`
3. 构建前端: `pnpm run build:web`
4. 生成数据库迁移: `pnpm run generate`
5. 应用数据库迁移: `wrangler d1 migrations apply airdrop --remote`
6. 部署应用: `wrangler deploy`

## 更新

同步 Fork 的仓库即可自动更新 & 构建。

<img src="assets/IMG_01.png" width="200">

## 配置 GitHub Action Secret

1. 在初次部署完成后，还需要创建 [D1Database](https://developers.cloudflare.com/d1/get-started/#2-create-a-database) & [KV](https://developers.cloudflare.com/kv/get-started/#2-create-a-kv-namespace)，参考对应文档。
2. 配置 Secret：在 forked 的仓库 -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**
3. 配置以下 Secret：
   - CUSTOM_DOMAIN （可选，域名，如 drop.example.cn）
   - D1_ID (D1Database ID)
   - D1_NAME (D1Database Name)
   - KV_ID (KV Namespace ID)
4. 重新运行 Github Actions

## 其他配置

### 文件大小限制

默认文件限制为 10M，可以通过添加 Action 变量来修改。

新增 `SHARE_MAX_SIZE_IN_MB` Action 变量，值为最大允许的 MB 数字，例如 20，配置路径：在 forked 的仓库 -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository variable**

### 分享过期时间配置

分享默认有效期是一个小时，可以通过添加 Action 变量来修改。

新增 `SHARE_DURATION` Action 变量，配置格式为 `数值+单位`，比如 (5minute)，支持的单位有 `minute`, `hour`, `day`, `week`, `month`, `year`

### 新增 IP 上传频率限制

默认无限制，可以通过添加 Action 变量来修改。

新增 `RATE_LIMIT` Action 变量，值为每 10s 可请求数，比如 10

## 过期清理

Worker 添加了一个 10 分钟的定时任务，自动清理过期的 KV 存储和 D1 中的记录。

## 后台管理

通过配置 ADMIN_TOKEN Secret，可以访问管理后台：`https://your.drop.com/admin/{ADMIN_TOKEN}`， 在管理后台可以删除分享。

<img src="assets/IMG_6000.png" width="400">

## 故障排除

如果部署过程中遇到问题，请检查以下几点：

1. 确保已正确创建 D1 数据库和 KV 命名空间
2. 确保 wrangler.toml 文件中的 database_id 和 kv id 已正确配置
3. 检查是否有权限部署 Workers 和应用数据库迁移
4. 如果使用自动部署，确保 GitHub Actions 的 Secret 已正确配置
