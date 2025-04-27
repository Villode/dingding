import { authenticate } from './auth.js';

// 生成简单的随机ID
function generateId(length = 8) {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export async function onRequestPost({ request, env }) {
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
    
    // 解析请求体
    const postData = await request.json();
    
    // 验证必要的字段
    if (!postData.title || !postData.content) {
      return new Response(
        JSON.stringify({ error: '标题和内容为必填项' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 设置文章ID（如果是新文章）或使用现有的
    const postId = postData.id || generateId(8);
    const isNew = !postData.id;
    
    // 构建完整的文章对象
    const post = {
      id: postId,
      title: postData.title,
      summary: postData.summary || '',
      content: postData.content,
      published_at: postData.published_at || new Date().toISOString()
    };
    
    // 检查是否有KV命名空间可用
    if (!env.BLOG_POSTS) {
      return new Response(
        JSON.stringify({ 
          error: 'KV存储不可用，无法保存文章',
          post // 返回构建的文章以便前端可以处理
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 保存文章到KV
    await env.BLOG_POSTS.put(`post:${postId}`, JSON.stringify(post));
    
    // 更新文章列表
    let posts = [];
    const kvPosts = await env.BLOG_POSTS.get('posts:list');
    
    if (kvPosts) {
      posts = JSON.parse(kvPosts);
    }
    
    // 如果是新文章，添加到列表；否则更新现有文章
    if (isNew) {
      posts.push({
        id: post.id,
        title: post.title,
        summary: post.summary,
        published_at: post.published_at
      });
    } else {
      // 更新现有文章
      const index = posts.findIndex(p => p.id === postId);
      if (index !== -1) {
        posts[index] = {
          id: post.id,
          title: post.title,
          summary: post.summary,
          published_at: post.published_at
        };
      } else {
        // 如果找不到，添加为新文章
        posts.push({
          id: post.id,
          title: post.title,
          summary: post.summary,
          published_at: post.published_at
        });
      }
    }
    
    // 按发布日期降序排序
    posts.sort((a, b) => 
      new Date(b.published_at) - new Date(a.published_at)
    );
    
    // 保存更新后的文章列表
    await env.BLOG_POSTS.put('posts:list', JSON.stringify(posts));
    
    // 返回成功响应
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isNew ? '文章创建成功' : '文章更新成功',
        post
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('保存文章时出错:', error);
    
    return new Response(
      JSON.stringify({ 
        error: '处理文章保存请求时出错', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 