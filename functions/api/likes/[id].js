/**
 * 获取特定文章的点赞数
 * @param {Request} request
 * @param {Object} env - 包含KV binding
 * @returns {Response}
 */
export async function onRequestGet({ params, env }) {
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
    
    // 尝试从KV获取点赞数
    let likes = 0;
    if (env.BLOG_LIKES) {
      const storedLikes = await env.BLOG_LIKES.get(`post_${id}_likes`);
      if (storedLikes !== null) {
        likes = parseInt(storedLikes, 10);
      }
    } else {
      // 没有KV绑定时返回错误信息
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
    
    // 返回点赞数
    return new Response(
      JSON.stringify({ id, likes }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60" // 缓存1分钟
        }
      }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: "获取点赞数时出错", 
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