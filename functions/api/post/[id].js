import posts from '../posts/data.js';

export async function onRequestGet({ params, env }) {
  const { id } = params;
  
  try {
    // 检查是否有BLOG_POSTS KV命名空间绑定
    if (env.BLOG_POSTS) {
      // 尝试从KV获取文章
      const kvPost = await env.BLOG_POSTS.get(`post:${id}`);
      
      if (kvPost) {
        // 如果KV中有数据，返回KV数据
        return Response.json(JSON.parse(kvPost));
      }
    }
    
    // 如果KV不可用或没有数据，使用模拟数据
    console.log(`使用模拟数据获取文章ID: ${id}`);
    
    // 从模拟数据中查找
    const post = posts.find(post => post.id === id);
    
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
    
    return Response.json(post);
  } catch (error) {
    console.error("获取文章时出错:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "获取文章时出错", 
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