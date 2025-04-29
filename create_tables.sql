-- 创建categories表
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- 创建posts表
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  content TEXT,
  published_at TIMESTAMP,
  author_id INTEGER,
  category_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 创建posts_categories关系表
CREATE TABLE IF NOT EXISTS posts_categories (
  post_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, category_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 创建posts_tags关系表
CREATE TABLE IF NOT EXISTS posts_tags (
  post_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 创建tags表
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#4299e1',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入分类数据
INSERT INTO categories (name, slug, description) VALUES 
('技术', 'tech', '技术相关文章'),
('生活', 'life', '生活随笔与感悟'),
('教程', 'tutorial', '各类实用教程'),
('前端', 'frontend', '前端开发技术'),
('后端', 'backend', '后端开发技术');

-- 插入标签数据
INSERT INTO tags (name, slug, color) VALUES 
('Web开发', 'web-dev', '#4299e1'),
('前端', 'frontend', '#48bb78'),
('随笔', 'notes', '#ed8936'),
('教程', 'tutorial', '#f56565'),
('旅行', 'travel', '#667eea'),
('心得', 'experience', '#9f7aea'),
('JavaScript', 'javascript', '#ecc94b'),
('CSS', 'css', '#38b2ac'),
('Python', 'python', '#9f7aea'),
('数据库', 'database', '#ed64a6');

-- 插入文章数据
INSERT INTO posts (title, slug, summary, content, published_at, category_id) VALUES
('Cloudflare Pages 入门指南', 'cloudflare-pages-guide', '了解如何使用 Cloudflare Pages 快速构建和部署静态网站和全栈应用。', '<p>Cloudflare Pages 是一个JAMstack平台，让开发者可以轻松地协作构建、部署和托管网站。通过与GitHub和GitLab的无缝集成，Pages支持持续部署，每次推送到Git仓库时自动更新您的站点。</p><h3>使用 Pages 的好处</h3><ul><li>全球分布式网络，确保您的网站无论在哪里都能快速加载</li><li>自动构建和部署，简化工作流程</li><li>无需配置即可获得免费SSL证书</li><li>无限站点和带宽，免费计划足以满足大多数项目需求</li><li>与Cloudflare其他产品集成，如Workers、KV等</li></ul>', '2023-04-20 08:00:00', 1),

('利用 Cloudflare Workers KV 存储数据', 'cloudflare-workers-kv', '探索如何使用Cloudflare Workers KV作为全球分布式键值存储来增强您的应用。', '<p>Cloudflare Workers KV是一个全球分布式的键值数据存储，完美集成于Cloudflare Workers生态系统。它使开发者能够存储和访问数据，而无需管理数据库基础设施。</p><h3>KV特性</h3><ul><li>全球分布式：数据存储在Cloudflare的全球网络上，确保低延迟访问</li><li>简单的键值模型：易于使用和理解</li><li>每个键最多可存储25MB的数据</li><li>支持JSON和二进制数据</li><li>与Workers和Pages完美集成</li></ul>', '2023-04-22 10:30:00', 5),

('构建无服务器API与Pages Functions', 'serverless-api-with-pages-functions', '学习如何利用Cloudflare Pages Functions创建强大的后端API。', '<p>Cloudflare Pages Functions是Pages平台的一个强大扩展，允许开发者直接在他们的Pages项目中添加服务器端功能。这使得构建完整的全栈应用变得更加简单和直接。</p><h3>Functions的工作原理</h3><p>Pages Functions基于Cloudflare Workers构建，提供了一种简单的方式来添加动态功能：</p><ul><li>基于文件的路由：在<code>/functions</code>目录中创建文件，自动映射到相应的URL路径</li><li>支持HTTP方法：通过导出<code>onRequest</code>或特定方法如<code>onRequestGet</code>来处理请求</li><li>中间件支持：通过<code>_middleware.js</code>文件添加跨多个函数的逻辑</li><li>绑定：可以访问KV、D1数据库和其他Cloudflare资源</li></ul>', '2023-04-25 14:15:00', 3),

('CSS Grid布局完全指南', 'css-grid-complete-guide', 'CSS Grid布局系统的全面介绍与实例讲解', '<p>CSS Grid是一个强大的二维布局系统，允许开发者创建复杂的网格布局，而无需依赖浮动或定位。本文将深入探讨CSS Grid的所有关键概念和用法。</p><h3>Grid的基本概念</h3><ul><li>网格容器和网格项</li><li>网格线和网格轨道</li><li>网格区域和网格单元</li></ul><h3>创建网格</h3><p>要创建一个基本的网格，首先需要将容器设置为<code>display: grid</code>:</p><pre><code>display: grid;\ngrid-template-columns: 1fr 1fr 1fr;\ngrid-template-rows: 100px auto;</code></pre>', '2023-05-10 09:45:00', 4),

('我的西藏旅行日记', 'tibet-travel-diary', '记录我在西藏高原的难忘旅程和心灵感悟', '<p>西藏，这片神秘而圣洁的土地，一直是我梦想前往的地方。今年夏天，我终于实现了这个梦想，踏上了通往"世界屋脊"的旅程。</p><h3>抵达拉萨</h3><p>刚到拉萨的第一天，高原反应让我感到有些不适。头痛、气短是最明显的症状，但当我第一次看到布达拉宫的壮丽景象时，所有的不适都被震撼所替代。</p><h3>纳木错的星空</h3><p>纳木错湖边的夜晚，是我见过最美的星空。远离城市光污染，银河清晰可见，仿佛触手可及。躺在湖边，听着湖水轻轻拍打岸边的声音，感受着宇宙的浩瀚，人生百态在此刻都显得如此渺小。</p>', '2023-06-15 16:20:00', 2),

('NoSQL数据库选择指南', 'nosql-database-selection-guide', '如何为你的项目选择最合适的NoSQL数据库', '<p>在当今大数据时代，NoSQL数据库已经成为许多现代应用程序架构的核心组件。但是面对众多的NoSQL数据库选项，如何选择最适合你项目需求的呢？</p><h3>NoSQL数据库类型</h3><ol><li>文档型数据库（如MongoDB）：适合存储半结构化数据</li><li>键值存储（如Redis）：适合缓存和简单数据结构</li><li>列式存储（如Cassandra）：适合大规模分析和时间序列数据</li><li>图形数据库（如Neo4j）：适合处理高度关联的数据</li></ol><h3>选择标准</h3><p>在选择数据库时，需要考虑以下因素：</p><ul><li>数据模型：你的数据是结构化、半结构化还是非结构化的？</li><li>查询需求：你需要进行哪种类型的查询？</li><li>一致性需求：你的应用需要强一致性还是最终一致性？</li><li>可扩展性：你预期的数据增长是怎样的？</li></ul>', '2023-07-05 11:30:00', 5);

-- 插入文章标签关联
INSERT INTO posts_tags (post_id, tag_id) VALUES
(1, 1), (1, 2), (1, 4), -- Cloudflare Pages入门指南的标签
(2, 1), (2, 7), (2, 10), -- Cloudflare Workers KV的标签
(3, 1), (3, 4), (3, 7), -- 构建无服务器API的标签
(4, 2), (4, 4), (4, 8), -- CSS Grid指南的标签
(5, 3), (5, 5), (5, 6), -- 西藏旅行日记的标签
(6, 4), (6, 10), (6, 9); -- NoSQL数据库指南的标签 