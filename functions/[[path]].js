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
      // 直接将请求传递给静态文件处理器
      return context.next();
    }
    
    // 处理登录页面路由
    if (path === 'login' && method === 'GET') {
      console.log('处理登录页面路由，交给静态文件处理器');
      // 直接将请求传递给静态文件处理器
      return context.next();
    }
    
    // 处理文章详情页面路由
    if (path.startsWith('post/') && method === 'GET') {
      console.log('处理文章详情页面路由:', path);
      try {
        // 直接获取 post.html 内容作为模板
        const postHtmlResponse = await fetch(new URL('/post.html', url.origin));
        
        if (!postHtmlResponse.ok) {
          // 如果无法获取 post.html，返回内联的文章详情页模板
          console.warn('无法获取 post.html，使用内联模板');
          return new Response(
            `<!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>文章详情 - 叮叮博客</title>
                <link rel="icon" href="/favicon.svg" type="image/svg+xml">
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
            </head>
            <body class="bg-gray-100 min-h-screen">
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
                    document.addEventListener('DOMContentLoaded', async () => {
                        try {
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
                            
                            articleContainer.innerHTML = 
                                '<div class="px-4 py-5 sm:p-6">' +
                                    '<h2 class="text-3xl font-bold mb-4 text-gray-900">' + article.title + '</h2>' +
                                    '<p class="text-gray-500 mb-6">' + formattedDate + '</p>' +
                                    '<div class="prose max-w-none">' +
                                        article.content +
                                    '</div>' +
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
                                '</div>';
                        }
                    });
                </script>
            </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html' },
            }
          );
        }
        
        // 返回post.html的内容
        return new Response(await postHtmlResponse.text(), {
          headers: { 'Content-Type': 'text/html' },
        });
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