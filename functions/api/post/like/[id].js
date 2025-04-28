/**
 * 文章点赞API
 * 
 * 该API用于处理文章点赞功能
 * - GET: 获取文章的点赞数量
 * - POST: 为文章增加一个点赞
 */

export async function onRequestGet({ params, env }) {
  try {
    const postId = params.id;
    
    // 尝试从KV中获取点赞数
    let likes = 0;
    
    if (env.BLOG_LIKES) {
      const likeData = await env.BLOG_LIKES.get(`post:${postId}:likes`);
      if (likeData) {
        likes = parseInt(likeData, 10);
      }
    }
    
    return new Response(JSON.stringify({ likes }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export async function onRequestPost({ params, env }) {
  try {
    const postId = params.id;
    
    // 在实际生产中，这里应该有用户认证和防止重复点赞的逻辑
    
    // 从KV中获取当前点赞数
    let likes = 0;
    
    if (env.BLOG_LIKES) {
      const likeData = await env.BLOG_LIKES.get(`post:${postId}:likes`);
      if (likeData) {
        likes = parseInt(likeData, 10);
      }
      
      // 增加点赞数并保存
      likes += 1;
      await env.BLOG_LIKES.put(`post:${postId}:likes`, likes.toString());
    } else {
      // 如果没有KV绑定，使用模拟数据（仅用于开发）
      likes = 1;
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      likes,
      message: '点赞成功！'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 