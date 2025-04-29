import posts from './posts/data.js';

export async function onRequestGet({ env }) {
  try {
    // 检查是否有BLOG_POSTS KV命名空间绑定
    if (env.BLOG_POSTS) {
      // 尝试从KV获取文章列表
      const kvPosts = await env.BLOG_POSTS.get("posts:list");
      
      if (kvPosts) {
        // 如果KV中有数据，返回KV数据
        return Response.json(JSON.parse(kvPosts));
      }
    }
    
    // 如果有D1数据库绑定，从数据库获取文章列表
    if (env.DB) {
      try {
        // 获取文章列表，包括分类和标签
        const postsQuery = await env.DB.prepare(`
          SELECT 
            p.id, p.title, p.summary, p.published_at,
            c.id as category_id, c.name as category_name, c.slug as category_slug
          FROM posts p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.published_at IS NOT NULL
          ORDER BY p.published_at DESC
        `).all();
        
        const posts = postsQuery.results || [];
        
        // 获取每篇文章的标签
        if (posts.length > 0) {
          const postIds = posts.map(post => post.id);
          
          const tagsQuery = await env.DB.prepare(`
            SELECT pt.post_id, t.id as tag_id, t.name as tag_name, t.slug as tag_slug, t.color as tag_color
            FROM posts_tags pt
            JOIN tags t ON pt.tag_id = t.id
            WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
          `).bind(...postIds).all();
          
          const tagsMap = {};
          if (tagsQuery.results) {
            tagsQuery.results.forEach(tag => {
              if (!tagsMap[tag.post_id]) {
                tagsMap[tag.post_id] = [];
              }
              tagsMap[tag.post_id].push({
                id: tag.tag_id,
                name: tag.tag_name,
                slug: tag.tag_slug,
                color: tag.tag_color
              });
            });
          }
          
          // 为每篇文章添加标签信息
          posts.forEach(post => {
            post.tags = tagsMap[post.id] || [];
            post.category = post.category_id ? {
              id: post.category_id,
              name: post.category_name,
              slug: post.category_slug
            } : null;
            
            // 删除不需要的字段
            delete post.category_id;
            delete post.category_name;
            delete post.category_slug;
          });
        }
        
        return Response.json(posts);
      } catch (dbError) {
        console.error("数据库查询错误:", dbError);
        // 数据库查询失败，返回错误信息
        return new Response(
          JSON.stringify({ 
            error: "获取文章列表失败", 
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
    console.error("获取文章列表时出错:", error);
    
    // 发生错误时返回错误信息
    return new Response(
      JSON.stringify({ 
        error: "获取文章列表失败", 
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