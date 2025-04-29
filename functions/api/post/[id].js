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
    
    // 如果有D1数据库绑定，从数据库获取文章
    if (env.DB) {
      try {
        // 获取文章详情，包括分类
        const postQuery = await env.DB.prepare(`
          SELECT 
            p.id, p.title, p.summary, p.content, p.published_at,
            c.id as category_id, c.name as category_name, c.slug as category_slug
          FROM posts p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.id = ?
        `).bind(id).first();
        
        if (!postQuery) {
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
        
        // 获取文章的标签
        const tagsQuery = await env.DB.prepare(`
          SELECT t.id, t.name, t.slug, t.color
          FROM posts_tags pt
          JOIN tags t ON pt.tag_id = t.id
          WHERE pt.post_id = ?
        `).bind(id).all();
        
        const post = {
          ...postQuery,
          category: postQuery.category_id ? {
            id: postQuery.category_id,
            name: postQuery.category_name,
            slug: postQuery.category_slug
          } : null,
          tags: tagsQuery.results || []
        };
        
        // 删除不需要的字段
        delete post.category_id;
        delete post.category_name;
        delete post.category_slug;
        
        // 添加调试日志
        console.log(`文章ID ${id} 的详情数据:`, JSON.stringify(post, null, 2));
        
        return Response.json(post);
      } catch (dbError) {
        console.error("数据库查询错误:", dbError);
        // 数据库查询失败，返回错误信息
        return new Response(
          JSON.stringify({ 
            error: "获取文章详情失败", 
            details: dbError.message 
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
    
    // 如果没有KV或DB可用，返回错误信息
    console.error("无可用数据源：KV和数据库均不可用");
    return new Response(
      JSON.stringify({ 
        error: "无法获取文章数据", 
        details: "数据存储服务不可用" 
      }), 
      { 
        status: 503,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
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