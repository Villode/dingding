/**
 * 处理所有函数请求的主入口文件
 * 根据请求路径分发到相应的处理函数
 */

export async function onRequest(context) {
  try {
    // 解构上下文对象
    const { request, env, params } = context;
    
    // 获取请求方法
    const method = request.method;
    
    // 获取请求路径
    const url = new URL(request.url);
    
    // 获取并确保路径参数是字符串
    let path = '';
    if (params && params.path !== undefined) {
      path = String(params.path);
    }

    console.log(`处理请求: ${method} ${url.pathname} (path 参数: ${path})`);

    // 处理根路径请求
    if (url.pathname === '/' || path === '') {
      console.log('处理根路径请求，返回index.html');
      return context.next();
    }
    
    // 处理管理后台页面路由
    if (path === 'admin' && method === 'GET') {
      console.log('处理管理后台路由，交给静态文件处理器');
      return context.next();
    }
    
    // 处理登录页面路由
    if (path === 'login' && method === 'GET') {
      console.log('处理登录页面路由，交给静态文件处理器');
      return context.next();
    }
    
    // 处理文章详情页面路由
    if (path.startsWith('post/') && method === 'GET') {
      console.log('处理文章详情页面路由:', path);
      try {
        // 直接返回文章详情页模板
          return new Response(
            `<!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>文章详情 - 叮叮博客</title>
                <link rel="icon" href="/favicon.svg" type="image/svg+xml">
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
              <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
              <style>
                  .article-content img {
                      max-width: 60%;
                      height: auto;
                      margin: 1rem auto;
                      display: block;
                      border-radius: 8px;
                      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                      cursor: zoom-in;
                      transition: transform 0.2s ease;
                  }

                  .article-content img:hover {
                      transform: scale(1.02);
                  }

                  /* 图片预览模态框样式优化 */
                  .image-preview-modal {
                      display: none;
                      position: fixed;
                      top: 0;
                      left: 0;
                      width: 100%;
                      height: 100%;
                      background-color: rgba(0, 0, 0, 0.9);
                      z-index: 1000;
                      cursor: zoom-out;
                  }
                  
                  .image-preview-modal img {
                      max-width: 90%;
                      max-height: 90vh;
                      margin: auto;
                      position: absolute;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%);
                      border-radius: 4px;
                      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                  }
                  
                  .image-preview-modal .close-button {
                      position: absolute;
                      top: 20px;
                      right: 20px;
                      color: white;
                      font-size: 24px;
                      cursor: pointer;
                      background: rgba(0, 0, 0, 0.5);
                      width: 40px;
                      height: 40px;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      transition: background-color 0.2s ease;
                  }
                  
                  .image-preview-modal .close-button:hover {
                      background: rgba(0, 0, 0, 0.8);
                  }
                  
                  .image-preview-modal .image-caption {
                      position: absolute;
                      bottom: 20px;
                      left: 50%;
                      transform: translateX(-50%);
                      color: white;
                      background: rgba(0, 0, 0, 0.7);
                      padding: 8px 16px;
                      border-radius: 4px;
                      font-size: 14px;
                      max-width: 80%;
                      text-align: center;
                  }
                  
                  .article-content {
                      color: #333333;
                      line-height: 1.8;
                  }
                  
                  .article-content h1,
                  .article-content h2,
                  .article-content h3,
                  .article-content h4,
                  .article-content h5,
                  .article-content h6 {
                      color: #222222;
                      margin-top: 1.5em;
                      margin-bottom: 0.8em;
                      font-weight: 600;
                  }
                  
                  .article-content p {
                      margin-bottom: 1em;
                  }
                  
                  .article-content a {
                      color: #FA541C;
                      text-decoration: none;
                      border-bottom: 1px solid rgba(250, 84, 28, 0.2);
                  }
                  
                  .article-content a:hover {
                      border-bottom-color: #FA541C;
                  }
                  
                  .article-content blockquote {
                      border-left: 4px solid #FA541C;
                      padding-left: 1rem;
                      margin-left: 0;
                      color: #555555;
                      font-style: italic;
                      margin: 1.5em 0;
                  }
                  
                  .article-content code {
                      background: #f5f5f5;
                      padding: 0.2em 0.4em;
                      border-radius: 3px;
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 0.9em;
                      color: #333;
                  }
                  
                  .article-content pre {
                      background: #f5f5f5;
                      padding: 1em;
                      border-radius: 5px;
                      overflow-x: auto;
                      margin: 1.5em 0;
                  }
                  
                  .article-content pre code {
                      background: none;
                      padding: 0;
                  }
                  
                  .article-content ul, 
                  .article-content ol {
                      margin-bottom: 1em;
                      padding-left: 1.5em;
                  }
                  
                  .article-content li {
                      margin-bottom: 0.5em;
                  }
                  
                  .image-load-error {
                      position: relative;
                      min-height: 200px;
                      min-width: 300px;
                      background-color: #f3f4f6;
                      border: 1px dashed #d1d5db;
                      cursor: pointer;
                      transition: all 0.3s ease;
                  }
                  
                  .image-load-error::before {
                      content: "图片加载失败 (点击重试)";
                      position: absolute;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%);
                      color: #666;
                      font-size: 0.9em;
                      white-space: nowrap;
                  }
                  
                  .image-load-error:hover {
                      background-color: #e5e7eb;
                      border-color: #FA541C;
                  }
                  
                  .image-load-error:hover::before {
                      color: #FA541C;
                  }

                  .image-size-controls {
                      display: flex;
                      justify-content: center;
                      gap: 0.5rem;
                      margin: 0.5rem 0;
                  }

                  .image-size-controls button {
                      padding: 0.25rem 0.75rem;
                      border: 1px solid #e5e7eb;
                      background-color: white;
                      border-radius: 0.375rem;
                      font-size: 0.875rem;
                      color: #4b5563;
                      cursor: pointer;
                      transition: all 0.2s ease;
                  }

                  .image-size-controls button:hover {
                      background-color: #f3f4f6;
                      border-color: #d1d5db;
                  }

                  .image-size-controls button.active {
                      background-color: #2563eb;
                      border-color: #2563eb;
                      color: white;
                  }

                  .article-image-container {
                      text-align: center;
                      margin: 2rem 0;
                  }

                  .article-image-container figcaption {
                      color: #666;
                      font-size: 0.875rem;
                      margin-top: 0.5rem;
                  }
              </style>
            </head>
            <body class="bg-gray-100 min-h-screen">
              <!-- 图片预览模态框 -->
              <div id="imagePreviewModal" class="image-preview-modal" onclick="closeImagePreview()">
                  <div class="close-button" onclick="closeImagePreview()">×</div>
                  <img id="previewImage" src="" alt="" onclick="event.stopPropagation()">
                  <div id="imageCaption" class="image-caption"></div>
              </div>
                <header class="bg-white shadow">
                    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                        <h1 class="text-3xl font-bold text-gray-900">
                            <a href="/" class="hover:text-gray-600">叮叮博客</a>
                        </h1>
                    </div>
                </header>
                <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div class="px-4 py-6 sm:px-0">
                        <div id="article-container" class="bg-white shadow overflow-hidden rounded-lg">
                            <!-- 文章内容将通过JavaScript动态加载 -->
                            <div class="px-4 py-5 sm:p-6">
                                <h2 class="text-2xl font-bold mb-4 text-gray-500">加载中...</h2>
                                <div class="animate-pulse">
                                    <div class="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
                                    <div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
                                    <div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
                                    <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
                <footer class="bg-white border-t mt-12 py-6">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <p class="text-center text-gray-500 text-sm">
                            &copy; 2023 叮叮博客 | 基于 Cloudflare Pages 构建
                        </p>
                    </div>
                </footer>
                <script>
                  // 配置 marked
                  function initMarked() {
                      if (typeof marked === 'undefined') {
                          console.error('Marked.js not loaded');
                          return false;
                      }
                      
                      const renderer = new marked.Renderer();
                      renderer.image = function(href, title, text) {
                          if (!href || typeof href !== 'string') {
                              console.warn('Invalid image href:', href);
                              return '';
                          }
                          
                          let imgSrc = href.trim();
                          
                          // 如果是完整 URL，提取文件名
                          if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
                              const url = new URL(imgSrc);
                              // 如果是当前域名下的文件
                              if (url.pathname.startsWith('/file/')) {
                                  imgSrc = url.pathname; // 只保留路径部分
                              } else {
                                  // 如果是其他来源，提取文件名
                                  const fileName = url.pathname.split('/').pop();
                                  if (fileName) {
                                      imgSrc = '/file/' + fileName;
                                  }
                              }
                          } else if (!imgSrc.startsWith('/file/')) {
                              // 如果是相对路径，添加 /file/ 前缀
                              const fileName = imgSrc.split('/').pop();
                              if (fileName) {
                                  imgSrc = '/file/' + fileName;
                              }
                          }
                          
                          return '<figure class="article-image-container">' +
                              '<img src="' + imgSrc + '"' +
                              ' alt="' + (text || '') + '"' +
                              ' title="' + (title || '') + '"' +
                              ' loading="lazy"' +
                              ' onclick="openImagePreview(this)"' +
                              ' onerror="handleImageError(this)"' +
                              '/>' +
                              (title ? '<figcaption>' + title + '</figcaption>' : '') +
                              '</figure>';
                      };
                      
                      marked.setOptions({
                          renderer: renderer,
                          gfm: true,
                          breaks: true,
                          sanitize: false,
                          smartLists: true,
                          smartypants: true
                      });
                      
                      return true;
                  }
                  
                  function handleImageError(img) {
                      if (!img.retryCount) {
                          img.retryCount = 0;
                      }
                      
                      if (img.retryCount < 3) {
                          img.retryCount++;
                          console.log('Retrying image load (' + img.retryCount + '/3): ' + img.src);
                          
                          // 清除错误处理器，防止无限循环
                          img.onerror = null;
                          
                          // 获取基础 URL（移除所有查询参数）
                          const baseUrl = img.src.split('?')[0];
                          
                          // 添加新的时间戳参数，确保只有一个 t 参数
                          img.src = baseUrl + '?t=' + Date.now();
                          
                          // 恢复错误处理器
                          setTimeout(() => {
                              img.onerror = () => handleImageError(img);
                          }, 0);
                      } else {
                          console.error('Image load failed after 3 retries:', img.src);
                          img.classList.add('image-load-error');
                          img.dataset.originalSrc = img.src.split('?')[0];
                          
                          // 添加点击重试事件
                          img.onclick = function() {
                              if (this.classList.contains('image-load-error')) {
                                  this.classList.remove('image-load-error');
                                  this.retryCount = 0;
                                  this.src = this.dataset.originalSrc + '?t=' + Date.now();
                              }
                          };
                      }
                  }
                  
                  // 等待 marked.js 加载完成
                  function waitForMarked(maxAttempts = 10) {
                      return new Promise((resolve, reject) => {
                          let attempts = 0;
                          
                          function check() {
                              attempts++;
                              if (typeof marked !== 'undefined') {
                                  resolve();
                              } else if (attempts >= maxAttempts) {
                                  reject(new Error('Markdown 解析器加载超时'));
                              } else {
                                  setTimeout(check, 500);
                              }
                          }
                          
                          check();
                      });
                  }
                  
                  // 主函数
                  async function loadArticle() {
                      try {
                          // 等待 marked.js 加载
                          await waitForMarked();
                          
                          // 初始化 marked
                          if (!initMarked()) {
                              throw new Error('Markdown 解析器初始化失败');
                          }
                          
                            // 从URL获取文章ID
                            const urlPath = window.location.pathname;
                            const postId = urlPath.split('/').pop();
                            
                            if (!postId) {
                                throw new Error('文章ID无效');
                            }
                            
                            // 获取文章数据
                            const response = await fetch('/api/post/' + postId);
                            
                            if (!response.ok) {
                                throw new Error('获取文章失败: ' + response.status);
                            }
                            
                            const article = await response.json();
                            
                            // 更新页面标题
                            document.title = article.title + ' - 叮叮博客';
                            
                            // 更新文章内容
                            const articleContainer = document.getElementById('article-container');
                            
                            // 格式化日期
                            const publishDate = new Date(article.published_at);
                            const formattedDate = publishDate.toLocaleDateString('zh-CN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                            
                          // 渲染文章内容
                          const renderedContent = marked.parse(article.content || '');
                          
                          // 使用字符串拼接而不是模板字符串
                            articleContainer.innerHTML = 
                                '<div class="px-4 py-5 sm:p-6">' +
                                    '<h2 class="text-3xl font-bold mb-4 text-gray-900">' + article.title + '</h2>' +
                                    '<p class="text-gray-500 mb-6">' + formattedDate + '</p>' +
                              '<div class="article-content">' + renderedContent + '</div>' +
                                '</div>';
                        } catch (error) {
                            console.error('加载文章失败:', error);
                            
                            const articleContainer = document.getElementById('article-container');
                            articleContainer.innerHTML = 
                                '<div class="px-4 py-5 sm:p-6">' +
                                    '<h2 class="text-2xl font-bold mb-4 text-red-500">加载文章失败</h2>' +
                                    '<p class="text-gray-700">' +
                                        '无法加载文章内容，请返回<a href="/" class="text-blue-500 hover:underline">首页</a>查看其他文章。' +
                                    '</p>' +
                                    '<p class="text-gray-500 mt-2">错误详情: ' + error.message + '</p>' +
                              '<button onclick="loadArticle()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">' +
                              '重试' +
                              '</button>' +
                                '</div>';
                        }
                  }
                  
                  // 页面加载完成后执行
                  document.addEventListener('DOMContentLoaded', loadArticle);
                  
                  // 图片预览功能
                  function openImagePreview(img) {
                      if (img.classList.contains('image-load-error')) {
                          return; // 如果图片加载失败，不执行预览
                      }
                      
                      const modal = document.getElementById('imagePreviewModal');
                      const previewImage = document.getElementById('previewImage');
                      const caption = document.getElementById('imageCaption');
                      
                      previewImage.src = img.src;
                      previewImage.alt = img.alt;
                      
                      // 设置说明文字（优先使用 title，如果没有则使用 alt）
                      const captionText = img.title || img.alt;
                      if (captionText) {
                          caption.textContent = captionText;
                          caption.style.display = 'block';
                      } else {
                          caption.style.display = 'none';
                      }
                      
                      modal.style.display = 'block';
                      document.body.style.overflow = 'hidden'; // 防止背景滚动
                  }
                  
                  function closeImagePreview() {
                      const modal = document.getElementById('imagePreviewModal');
                      modal.style.display = 'none';
                      document.body.style.overflow = ''; // 恢复滚动
                  }
                  
                  // 按 ESC 键关闭预览
                  document.addEventListener('keydown', function(event) {
                      if (event.key === 'Escape') {
                          closeImagePreview();
                      }
                  });
                </script>
            </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html' },
            }
          );
      } catch (error) {
        console.error('处理文章详情页面路由出错:', error);
        return new Response('获取文章详情页面出错: ' + error.message, { status: 500 });
      }
    }
    
    // 如果请求是针对API的
    if (path.startsWith('api/')) {
      console.log('处理API请求:', path);
      try {
        // 移除开头的'api/'来获取实际的API路径
        const apiPath = path.substring(4);
        
        // 处理文件请求
        if (apiPath.startsWith('file/')) {
          console.log('处理文件请求:', apiPath);
          const { onRequestGet: getFileHandler } = await import('./api/file/[name].js');
          return getFileHandler(context);
        }
        
        // 处理文章列表API
        if (apiPath === 'posts' && method === 'GET') {
          console.log('处理文章列表API');
          // 导入并调用posts.js中的处理函数
          const { onRequestGet: getPostsHandler } = await import('./api/posts.js');
          return getPostsHandler(context);
        }
        
        // 处理单篇文章API
        if (apiPath.startsWith('post/') && method === 'GET') {
          console.log('处理单篇文章API');
          // 导入并调用post/[id].js中的处理函数
          const { onRequestGet: getPostHandler } = await import('./api/post/[id].js');
          return getPostHandler(context);
        }
        
        // 处理登录API
        if (apiPath === 'admin/login' && method === 'POST') {
          console.log('处理登录API');
          // 导入并调用admin/login.js中的处理函数
          const { onRequestPost: loginHandler } = await import('./api/admin/login.js');
          return loginHandler(context);
        }
        
        // 处理文章管理API
        if (apiPath === 'admin/post' && method === 'POST') {
          console.log('处理文章管理API');
          // 导入并调用admin/post.js中的处理函数
          const { onRequestPost: postAdminHandler } = await import('./api/admin/post.js');
          return postAdminHandler(context);
        }
        
        // 处理文章删除API
        if (apiPath.startsWith('admin/delete/') && method === 'DELETE') {
          console.log('处理文章删除API');
          // 导入并调用admin/delete/[id].js中的处理函数
          const { onRequestDelete: deletePostHandler } = await import('./api/admin/delete/[id].js');
          return deletePostHandler(context);
        }
        
        // 如果没有匹配的API路径，返回404
        console.log('API路径不匹配:', apiPath);
        return new Response('API not found: ' + apiPath, { status: 404 });
      } catch (error) {
        console.error('处理API请求出错:', error);
        return new Response('API错误: ' + error.message, { status: 500 });
      }
    }
    
    // 对于其他请求，继续传递给下一个处理程序
    console.log('无匹配路由，交给静态资源处理器');
    return context.next();
  } catch (error) {
    console.error('处理请求时出错:', error);
    return new Response('Internal Server Error: ' + error.message, { status: 500 });
  }
} 