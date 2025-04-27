# 叮叮博客 - Cloudflare Pages动态博客系统

这是一个使用Cloudflare Pages、Functions和Workers KV构建的简单动态博客系统。这个系统展示了如何利用Cloudflare的无服务器平台构建完整的全栈应用。

## 特点

- 使用Cloudflare Pages托管静态内容
- 使用Cloudflare Functions (基于Workers)提供动态API
- 使用Cloudflare Workers KV存储博客文章和元数据
- 完全无服务器架构，无需管理服务器或数据库
- 全球CDN分发，快速加载

## 项目结构

```
/
├── functions/                # Cloudflare Functions目录
│   └── api/                  # API函数
│       ├── posts.js          # 获取文章列表
│       ├── post/             # 文章相关操作
│       │   └── [id].js       # 获取单篇文章
│       ├── posts/            # 文章数据
│       │   └── data.js       # 示例文章数据
│       └── admin/            # 管理功能
│           ├── post.js       # 创建/更新文章
│           └── delete/       # 删除文章
│               └── [id].js   # 删除指定ID的文章
├── public/                   # 静态文件目录
│   ├── index.html            # 博客首页
│   ├── post.html             # 文章页面
│   ├── admin.html            # 管理后台页面
│   └── favicon.svg           # 网站图标
└── README.md                 # 项目说明文档
```

## 功能介绍

### 前端功能

1. **博客首页**：展示所有文章的列表，包括标题、摘要和发布日期。
2. **文章详情页**：显示单篇文章的完整内容。
3. **管理后台**：提供创建、编辑和删除文章的界面。

### 后端功能

1. **文章API**：
   - `GET /api/posts`：获取所有文章的列表
   - `GET /api/post/{id}`：获取指定ID的文章详情
   - `POST /api/admin/post`：创建或更新文章
   - `DELETE /api/admin/delete/{id}`：删除指定ID的文章

2. **数据存储**：
   - 使用Workers KV存储文章数据
   - 示例数据作为备份，当KV不可用时使用

## 设置说明

### 1. 克隆并部署到Cloudflare Pages

1. 将本仓库克隆到你的GitHub账户
2. 登录到Cloudflare仪表板
3. 进入Workers & Pages
4. 选择"创建应用程序" > "Pages" > "连接到Git"
5. 选择你的仓库，并设置以下构建配置:
   - 构建命令: 留空（无需构建）
   - 输出目录: `public`
   - 根目录: `/`

### 2. 创建KV命名空间

1. 在Cloudflare仪表板中，进入"Workers & Pages"
2. 点击"KV"标签
3. 点击"创建命名空间"按钮
4. 创建一个名为`BLOG_POSTS`的命名空间

### 3. 绑定KV到Pages项目

1. 进入你的Pages项目
2. 点击"设置" > "Functions"
3. 在"KV命名空间绑定"部分，添加一个新绑定：
   - 变量名: `BLOG_POSTS`
   - KV命名空间: 选择你刚刚创建的`BLOG_POSTS`命名空间

### 4. 重新部署项目

1. 进入你的Pages项目
2. 点击"部署" > "重新部署"以应用新的KV绑定

### 5. 本地开发（可选）

如果你想在本地开发和测试这个项目，你需要安装Wrangler CLI：

```bash
npm install -g wrangler
```

然后，在项目根目录创建一个`wrangler.toml`文件：

```toml
name = "dingding-blog"
type = "javascript"

[site]
bucket = "./public"

[build]
command = ""
upload.format = "service-worker"

[env.dev.kv_namespaces]
BLOG_POSTS = { binding = "BLOG_POSTS", id = "your-kv-namespace-id" }
```

替换`your-kv-namespace-id`为你在Cloudflare仪表板中创建的KV命名空间ID。

然后运行以下命令启动本地开发服务器：

```bash
wrangler pages dev
```

## 使用说明

### 访问博客

- 博客主页: `https://your-project.pages.dev/`
- 文章页面: `https://your-project.pages.dev/post/{id}`

### 管理博客

- 管理后台: `https://your-project.pages.dev/admin.html`
- 在管理后台可以创建、编辑和删除文章

## 安全建议

在真实的生产环境中，应该为管理后台添加访问控制和身份验证。可以考虑使用：

1. Cloudflare Access控制后台访问
2. 添加自定义的身份验证系统
3. 为API端点添加CSRF防护和验证

## 扩展可能性

1. 添加分类和标签功能
2. 实现评论系统（可以使用Durable Objects）
3. 添加图片上传功能（使用Cloudflare R2存储）
4. 添加搜索功能
5. 添加用户系统（用户注册、登录等）

## 参考资源

- [Cloudflare Pages文档](https://developers.cloudflare.com/pages/)
- [Cloudflare Functions文档](https://developers.cloudflare.com/pages/functions/)
- [Cloudflare Workers KV文档](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Cloudflare R2文档](https://developers.cloudflare.com/r2/)
- [Cloudflare Durable Objects文档](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/) 