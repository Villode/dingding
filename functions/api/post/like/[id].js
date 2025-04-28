/**
 * 文章点赞API
 * 
 * 该API用于处理文章点赞功能
 * - GET: 获取文章的点赞数量和用户点赞状态
 * - POST: 为文章增加或取消一个点赞
 * 
 * 功能说明：
 * 1. 一个用户（IP）只能对一篇文章点赞一次
 * 2. 用户可以取消已点赞的文章
 * 3. 每天对同一篇文章的点赞/取消点赞操作限制为3次
 * 4. 超过限制后需等到第二天才能重新操作
 */

// 获取当前的日期字符串（格式：YYYY-MM-DD）
function getCurrentDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function onRequestGet({ params, env, request }) {
  try {
    const postId = params.id;
    // 获取用户IP
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    
    // 尝试从KV中获取点赞数
    let likes = 0;
    let isLiked = false;
    let remainingOperations = 3; // 默认每天3次操作
    
    if (env.BLOG_LIKES) {
      // 获取文章点赞总数
      const likeData = await env.BLOG_LIKES.get(`post:${postId}:likes`);
      if (likeData) {
        likes = parseInt(likeData, 10);
      }
      
      // 检查该用户是否已点赞该文章
      const userLikeKey = `user:${clientIp}:like:${postId}`;
      const userLiked = await env.BLOG_LIKES.get(userLikeKey);
      isLiked = !!userLiked;
      
      // 获取用户今日操作次数
      const dateStr = getCurrentDateString();
      const operationsKey = `user:${clientIp}:operations:${postId}:${dateStr}`;
      const operationsData = await env.BLOG_LIKES.get(operationsKey);
      
      if (operationsData) {
        const operations = parseInt(operationsData, 10);
        remainingOperations = Math.max(0, 3 - operations);
      }
      
    } else {
      // 如果KV不可用，返回错误
      return new Response(JSON.stringify({ 
        error: '点赞功能暂不可用',
        message: '存储服务未配置，请联系管理员'
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    return new Response(JSON.stringify({ 
      likes, 
      isLiked,
      remainingOperations
    }), {
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

export async function onRequestPost({ params, env, request }) {
  try {
    const postId = params.id;
    
    // 获取用户IP
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    
    // 检查KV是否可用
    if (!env.BLOG_LIKES) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '点赞功能暂不可用',
        message: '存储服务未配置，请联系管理员'
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // 获取请求体中的操作类型（点赞或取消点赞）
    const { action } = await request.json().catch(() => ({ action: 'toggle' }));
    
    // 获取当前日期字符串
    const dateStr = getCurrentDateString();
    const operationsKey = `user:${clientIp}:operations:${postId}:${dateStr}`;
    
    // 检查用户今日操作次数
    const operationsData = await env.BLOG_LIKES.get(operationsKey);
    let operations = operationsData ? parseInt(operationsData, 10) : 0;
    
    // 检查是否超过每日操作限制
    if (operations >= 3) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '今日操作次数已用完',
        message: '每天只能对同一篇文章进行3次点赞/取消点赞操作，请明天再试',
        remainingOperations: 0
      }), {
        status: 429, // Too Many Requests
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // 用户点赞状态的键
    const userLikeKey = `user:${clientIp}:like:${postId}`;
    
    // 检查用户是否已点赞
    const userLiked = await env.BLOG_LIKES.get(userLikeKey);
    const isLiked = !!userLiked;
    
    // 从KV中获取当前点赞数
    let likes = 0;
    const likeData = await env.BLOG_LIKES.get(`post:${postId}:likes`);
    if (likeData) {
      likes = parseInt(likeData, 10);
    }
    
    // 根据请求的操作和当前状态决定是点赞还是取消点赞
    let newLikeState = false;
    if (action === 'toggle') {
      newLikeState = !isLiked;
    } else if (action === 'like') {
      newLikeState = true;
    } else if (action === 'unlike') {
      newLikeState = false;
    }
    
    // 如果状态没有变化，不计入操作次数
    if ((isLiked && newLikeState) || (!isLiked && !newLikeState)) {
      return new Response(JSON.stringify({ 
        success: true, 
        likes,
        isLiked: newLikeState,
        remainingOperations: 3 - operations,
        message: '点赞状态未变更'
      }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // 更新点赞数
    if (newLikeState && !isLiked) {
      // 点赞
      likes += 1;
      await env.BLOG_LIKES.put(userLikeKey, "1", { expirationTtl: 60 * 60 * 24 * 365 }); // 一年过期
    } else if (!newLikeState && isLiked) {
      // 取消点赞
      likes = Math.max(0, likes - 1);
      await env.BLOG_LIKES.delete(userLikeKey);
    }
    
    // 更新点赞总数
    await env.BLOG_LIKES.put(`post:${postId}:likes`, likes.toString());
    
    // 增加操作次数并保存
    operations += 1;
    await env.BLOG_LIKES.put(operationsKey, operations.toString(), { expirationTtl: 60 * 60 * 24 }); // 24小时过期
    
    // 计算剩余操作次数
    const remainingOperations = Math.max(0, 3 - operations);
    
    return new Response(JSON.stringify({ 
      success: true, 
      likes,
      isLiked: newLikeState,
      remainingOperations,
      message: newLikeState ? '点赞成功！' : '已取消点赞'
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