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
      console.log('处理管理后台路由');
      try {
        const adminHtmlResponse = await fetch(new URL('/admin.html', url.origin));
        if (!adminHtmlResponse.ok) {
          console.error('获取admin.html失败:', adminHtmlResponse.status);
          return new Response('找不到管理页面', { status: 404 });
        }
        return new Response(await adminHtmlResponse.text(), {
          headers: { 'Content-Type': 'text/html' },
        });
      } catch (error) {
        console.error('获取admin.html出错:', error);
        return new Response(`获取管理页面出错: ${error.message}`, { status: 500 });
      }
    }
    
    // 处理登录页面路由
    if (path === 'login' && method === 'GET') {
      console.log('处理登录页面路由');
      try {
        const loginHtmlResponse = await fetch(new URL('/login.html', url.origin));
        if (!loginHtmlResponse.ok) {
          console.error('获取login.html失败:', loginHtmlResponse.status);
          return new Response('找不到登录页面', { status: 404 });
        }
        return new Response(await loginHtmlResponse.text(), {
          headers: { 'Content-Type': 'text/html' },
        });
      } catch (error) {
        console.error('获取login.html出错:', error);
        return new Response(`获取登录页面出错: ${error.message}`, { status: 500 });
      }
    }
    
    // 处理文章详情页面路由
    if (path.startsWith('post/') && method === 'GET') {
      console.log('处理文章详情页面路由');
      try {
        // 从静态存储获取post.html
        const postPageResponse = await context.next();
        if (postPageResponse.status === 404) {
          // 如果找不到资源，返回post.html作为单页应用的入口
          const postHtmlResponse = await fetch(new URL('/post.html', url.origin));
          if (!postHtmlResponse.ok) {
            console.error('获取post.html失败:', postHtmlResponse.status);
            return new Response('找不到文章详情页面', { status: 404 });
          }
          return new Response(await postHtmlResponse.text(), {
            headers: { 'Content-Type': 'text/html' },
          });
        }
        return postPageResponse;
      } catch (error) {
        console.error('处理文章详情页面路由出错:', error);
        return new Response(`获取文章详情页面出错: ${error.message}`, { status: 500 });
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
        return new Response(`API not found: ${apiPath}`, { status: 404 });
      } catch (error) {
        console.error('处理API请求出错:', error);
        return new Response(`API错误: ${error.message}`, { status: 500 });
      }
    }
    
    // 对于其他请求，继续传递给下一个处理程序
    console.log('无匹配路由，交给静态资源处理器');
    return context.next();
  } catch (error) {
    console.error('处理请求时出错:', error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
} 