// 示例博客文章数据
export const posts = [
  {
    id: "1",
    title: "Cloudflare Pages 入门指南",
    summary: "了解如何使用 Cloudflare Pages 快速构建和部署静态网站和全栈应用。",
    content: `
      <p>Cloudflare Pages 是一个JAMstack平台，让开发者可以轻松地协作构建、部署和托管网站。通过与GitHub和GitLab的无缝集成，Pages支持持续部署，每次推送到Git仓库时自动更新您的站点。</p>
      
      <h3>使用 Pages 的好处</h3>
      <ul>
        <li>全球分布式网络，确保您的网站无论在哪里都能快速加载</li>
        <li>自动构建和部署，简化工作流程</li>
        <li>无需配置即可获得免费SSL证书</li>
        <li>无限站点和带宽，免费计划足以满足大多数项目需求</li>
        <li>与Cloudflare其他产品集成，如Workers、KV等</li>
      </ul>

      <h3>开始使用</h3>
      <p>要开始使用Cloudflare Pages，您需要：</p>
      <ol>
        <li>创建一个Cloudflare帐户</li>
        <li>将您的GitHub或GitLab仓库连接到Pages</li>
        <li>配置构建设置</li>
        <li>部署您的第一个项目</li>
      </ol>

      <p>通过Pages Functions，您可以为静态网站添加动态功能，实现真正的全栈应用程序！</p>
    `,
    published_at: "2025-04-20T08:00:00Z"
  },
  {
    id: "2",
    title: "利用 Cloudflare Workers KV 存储数据",
    summary: "探索如何使用Cloudflare Workers KV作为全球分布式键值存储来增强您的应用。",
    content: `
      <p>Cloudflare Workers KV是一个全球分布式的键值数据存储，完美集成于Cloudflare Workers生态系统。它使开发者能够存储和访问数据，而无需管理数据库基础设施。</p>

      <h3>KV特性</h3>
      <ul>
        <li>全球分布式：数据存储在Cloudflare的全球网络上，确保低延迟访问</li>
        <li>简单的键值模型：易于使用和理解</li>
        <li>每个键最多可存储25MB的数据</li>
        <li>支持JSON和二进制数据</li>
        <li>与Workers和Pages完美集成</li>
      </ul>

      <h3>使用KV的最佳实践</h3>
      <p>虽然KV非常强大，但它有一些使用限制需要了解：</p>
      <ul>
        <li>KV是最终一致性的，这意味着写操作可能需要一些时间才能在全球范围内可见</li>
        <li>KV最适合读取频繁但写入不频繁的数据</li>
        <li>对于需要严格一致性的应用，考虑使用Durable Objects</li>
        <li>利用KV元数据功能为您的键添加额外信息</li>
      </ul>

      <p>通过正确使用KV，您可以构建高性能、全球可用的应用程序，而无需复杂的数据库设置！</p>
    `,
    published_at: "2025-04-22T10:30:00Z"
  },
  {
    id: "3",
    title: "构建无服务器API与Pages Functions",
    summary: "学习如何利用Cloudflare Pages Functions创建强大的后端API。",
    content: `
      <p>Cloudflare Pages Functions是Pages平台的一个强大扩展，允许开发者直接在他们的Pages项目中添加服务器端功能。这使得构建完整的全栈应用变得更加简单和直接。</p>

      <h3>Functions的工作原理</h3>
      <p>Pages Functions基于Cloudflare Workers构建，提供了一种简单的方式来添加动态功能：</p>
      <ul>
        <li>基于文件的路由：在<code>/functions</code>目录中创建文件，自动映射到相应的URL路径</li>
        <li>支持HTTP方法：通过导出<code>onRequest</code>或特定方法如<code>onRequestGet</code>来处理请求</li>
        <li>中间件支持：通过<code>_middleware.js</code>文件添加跨多个函数的逻辑</li>
        <li>绑定：可以访问KV、D1数据库和其他Cloudflare资源</li>
      </ul>

      <h3>构建API的步骤</h3>
      <ol>
        <li>在项目根目录创建<code>functions</code>文件夹</li>
        <li>添加API端点，例如<code>functions/api/posts.js</code></li>
        <li>使用环境变量和绑定连接到数据存储</li>
        <li>处理请求并返回JSON响应</li>
      </ol>

      <p>使用Pages Functions，您可以快速构建完整的API，无需管理服务器或担心扩展问题！</p>
    `,
    published_at: "2025-04-25T14:15:00Z"
  }
];

export default posts; 