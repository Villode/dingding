import posts from '../posts/data.js';

export async function onRequestGet({ params, env }) {
  const { id } = params;
  
  try {
    // 检查是否有BLOG_POSTS KV命名空间绑定
    if (env.BLOG_POSTS) {
      // 尝试从KV获取文章
      const kvPost = await env.BLOG_POSTS.get(`post:${id}`);
      
      if (kvPost) {
        // 如果KV中有数据，解析并添加分类和标签信息
        const parsedPost = JSON.parse(kvPost);
        
        // 如果有DB绑定，用于获取分类和标签信息
        if (env.DB) {
          try {
            return await enrichPostWithCategoryAndTags(parsedPost, env.DB);
          } catch (error) {
            console.error("为KV文章添加分类和标签时出错:", error);
            // 如果添加分类和标签失败，仍返回原始文章数据
            return Response.json(parsedPost);
          }
        }
        
        return Response.json(parsedPost);
      }
    }
    
    // 如果有D1数据库绑定，从数据库获取文章
    if (env.DB) {
      try {
        // 获取文章详情
        const postQuery = await env.DB.prepare(`
          SELECT 
            p.id, p.title, p.summary, p.content, p.published_at
          FROM posts p
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
    
        // 为文章添加分类和标签信息
        return await enrichPostWithCategoryAndTags(postQuery, env.DB);
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

// 辅助函数：为文章添加分类和标签信息
async function enrichPostWithCategoryAndTags(post, db) {
  try {
    // 确保文章有唯一标识符
    if (!post || !post.id) {
      console.error("无效的文章数据，缺少ID");
      return new Response(
        JSON.stringify({ 
          error: "无效的文章数据", 
          details: "文章缺少ID" 
        }), 
        { 
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    // 输出调试信息
    console.log(`开始为文章ID: ${post.id} 添加分类和标签信息`);
    
    // 1. 获取文章分类信息
    const categoryQuery = await db.prepare(`
      SELECT c.id, c.name, c.slug
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).bind(post.id).first();
    
    if (categoryQuery && categoryQuery.id) {
      console.log(`查询到文章分类: ${categoryQuery.name}`);
      post.category = {
        id: categoryQuery.id,
        name: categoryQuery.name,
        slug: categoryQuery.slug
      };
    } else {
      console.log('没有查询到文章分类');
      post.category = null;
    }
    
    // 2. 获取文章标签信息
    const tagsQuery = await db.prepare(`
      SELECT t.id, t.name, t.slug, t.color
      FROM posts p
      LEFT JOIN posts_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.id = ?
    `).bind(post.id).all();
    
    if (tagsQuery.results && tagsQuery.results.length > 0) {
      // 过滤出有效的标签（有id的标签）
      const validTags = tagsQuery.results.filter(tag => tag.id);
      console.log(`查询到${validTags.length}个有效文章标签`);
      
      post.tags = validTags.map(tag => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color || '#4299e1' // 提供默认颜色
      }));
    } else {
      console.log('没有查询到文章标签');
      post.tags = [];
    }
    
    // 添加调试日志
    console.log(`文章ID ${post.id} 的详情数据:`, JSON.stringify({
      id: post.id,
      title: post.title,
      category: post.category ? post.category.name : null,
      tagsCount: post.tags.length
    }, null, 2));
    
    return Response.json(post);
  } catch (error) {
    console.error("为文章添加分类和标签信息时出错:", error);
    // 如果添加分类和标签失败，仍返回原始文章数据
    return Response.json(post);
  }
} 