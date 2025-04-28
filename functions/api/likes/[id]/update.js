/**
 * 更新特定文章的点赞数
 * @param {Request} request
 * @param {Object} env - 包含KV binding
 * @returns {Response}
 */
export async function onRequestPost({ params, request, env }) {
  try {
    const { id } = params;
    
    // 检查id是否存在
    if (!id) {
      return new Response(
        JSON.stringify({ error: "必须提供文章ID" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    // 检查KV绑定是否存在
    if (!env.BLOG_LIKES) {
      return new Response(
        JSON.stringify({ 
          error: "点赞功能暂不可用", 
          details: "缺少KV命名空间绑定" 
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    // 从请求体获取操作类型（增加或减少点赞）
    let { action } = await request.json().catch(() => ({}));
    
    // 默认为增加点赞
    if (!action || (action !== 'add' && action !== 'remove')) {
      action = 'add';
    }

    // 获取当前点赞数
    const key = `post_${id}_likes`;
    let currentLikes = 0;
    const storedLikes = await env.BLOG_LIKES.get(key);
    
    if (storedLikes !== null) {
      currentLikes = parseInt(storedLikes, 10);
    }
    
    // 根据操作更新点赞数
    let newLikes = currentLikes;
    if (action === 'add') {
      newLikes = currentLikes + 1;
    } else if (action === 'remove' && currentLikes > 0) {
      newLikes = currentLikes - 1;
    }
    
    // 将更新后的点赞数存储到KV
    await env.BLOG_LIKES.put(key, newLikes.toString());
    
    // 返回更新后的点赞数
    return new Response(
      JSON.stringify({ 
        id, 
        likes: newLikes,
        action: action
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: "更新点赞数时出错", 
        details: error.message 
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
} 