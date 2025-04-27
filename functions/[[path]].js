/**
 * 处理所有函数请求的主入口文件
 * 根据请求路径分发到相应的处理函数
 */

export async function onRequest(context) {
  // 解构上下文对象
  const { request, env, params } = context;
  
  // 获取请求方法
  const method = request.method;
  
  // 获取请求路径
  const url = new URL(request.url);
  const path = params.path || '';

  console.log(`处理请求: ${method} ${path}`);

  try {
    // 处理文章详情页面路由
    if (path.startsWith('post/') && method === 'GET') {
      // 从静态存储获取post.html
      const postPageResponse = await context.next();
      if (postPageResponse.status === 404) {
        // 如果找不到资源，返回post.html作为单页应用的入口
        const postHtmlResponse = await fetch(new URL('/post.html', url.origin));
        return new Response(await postHtmlResponse.text(), {
          headers: { 'Content-Type': 'text/html' },
        });
      }
      return postPageResponse;
    }
    
    // 如果请求是针对API的
    if (path.startsWith('api/')) {
      // 移除开头的'api/'来获取实际的API路径
      const apiPath = path.substring(4);
      
      // 处理文章列表API
      if (apiPath === 'posts' && method === 'GET') {
        // 导入并调用posts.js中的处理函数
        const { onRequestGet: getPostsHandler } = await import('./api/posts.js');
        return getPostsHandler(context);
      }
      
      // 处理单篇文章API
      if (apiPath.startsWith('post/') && method === 'GET') {
        // 导入并调用post/[id].js中的处理函数
        const { onRequestGet: getPostHandler } = await import('./api/post/[id].js');
        return getPostHandler(context);
      }
      
      // 处理登录API
      if (apiPath === 'admin/login' && method === 'POST') {
        // 导入并调用admin/login.js中的处理函数
        const { onRequestPost: loginHandler } = await import('./api/admin/login.js');
        return loginHandler(context);
      }
      
      // 处理文章管理API
      if (apiPath === 'admin/post' && method === 'POST') {
        // 导入并调用admin/post.js中的处理函数
        const { onRequestPost: postAdminHandler } = await import('./api/admin/post.js');
        return postAdminHandler(context);
      }
      
      // 处理文章删除API
      if (apiPath.startsWith('admin/delete/') && method === 'DELETE') {
        // 导入并调用admin/delete/[id].js中的处理函数
        const { onRequestDelete: deletePostHandler } = await import('./api/admin/delete/[id].js');
        return deletePostHandler(context);
      }
      
      // 如果没有匹配的API路径，返回404
      return new Response('API not found', { status: 404 });
    }
    
    // 对于其他请求，继续传递给下一个处理程序
    return context.next();
  } catch (error) {
    console.error('处理请求时出错:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 