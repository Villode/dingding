export async function onRequestDelete({ params, env }) {
  const { id } = params;
  
  try {
    // 检查是否有BLOG_POSTS KV命名空间绑定
    if (!env.BLOG_POSTS) {
      return new Response(
        JSON.stringify({ 
          error: "未配置存储空间" 
        }), 
        { 
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    // 检查文章是否存在
    const post = await env.BLOG_POSTS.get(`post:${id}`);
    
    if (!post) {
      return new Response(
        JSON.stringify({ 
          error: "文章不存在" 
        }), 
        { 
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    // 删除文章
    await env.BLOG_POSTS.delete(`post:${id}`);
    
    // 更新文章列表
    const postsList = await env.BLOG_POSTS.get("posts:list");
    
    if (postsList) {
      const posts = JSON.parse(postsList);
      const updatedPosts = posts.filter(post => post.id !== id);
      await env.BLOG_POSTS.put("posts:list", JSON.stringify(updatedPosts));
    }
    
    return Response.json({
      success: true,
      message: "文章已删除"
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: "删除文章时出错", 
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