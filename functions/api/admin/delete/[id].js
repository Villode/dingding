import { authenticate } from '../auth.js';

export async function onRequestDelete({ request, env, params }) {
  try {
    // 验证认证
    const user = await authenticate(request);
    if (!user) {
      return new Response(
        JSON.stringify({ error: '未授权，请先登录' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const postId = params.id;
    if (!postId) {
      return new Response(
        JSON.stringify({ error: '缺少文章ID' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 检查是否有KV命名空间可用
    if (!env.BLOG_POSTS) {
      return new Response(
        JSON.stringify({ error: 'KV存储不可用，无法删除文章' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 首先，检查文章是否存在
    const existingPost = await env.BLOG_POSTS.get(`post:${postId}`);
    if (!existingPost) {
      return new Response(
        JSON.stringify({ error: '文章不存在' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 删除文章
    await env.BLOG_POSTS.delete(`post:${postId}`);
    
    // 从文章列表中删除
    let posts = [];
    const kvPosts = await env.BLOG_POSTS.get('posts:list');
    
    if (kvPosts) {
      posts = JSON.parse(kvPosts);
      // 过滤掉要删除的文章
      posts = posts.filter(post => post.id !== postId);
      
      // 保存更新后的文章列表
      await env.BLOG_POSTS.put('posts:list', JSON.stringify(posts));
    }
    
    // 返回成功响应
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '文章已成功删除'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('删除文章时出错:', error);
    
    return new Response(
      JSON.stringify({ 
        error: '处理删除请求时出错', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 