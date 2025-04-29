import posts from './posts/data.js';

export async function onRequestGet({ env }) {
  try {
    // 添加一个调试参数，检查数据库结构
    const url = new URL(env.request?.url || 'http://localhost');
    const debug = url.searchParams.get('debug') === 'true';
    
    if (debug && env.DB) {
      return await diagnoseDatabaseIssues(env.DB);
    }
    
    // 检查是否有BLOG_POSTS KV命名空间绑定
    if (env.BLOG_POSTS) {
      // 尝试从KV获取文章列表
      const kvPosts = await env.BLOG_POSTS.get("posts:list");
      
      if (kvPosts) {
        // 如果KV中有数据，解析并添加分类和标签信息
        const parsedPosts = JSON.parse(kvPosts);
        
        // 检查是否有DB绑定，用于获取分类和标签信息
        if (env.DB) {
          try {
            // 为每篇文章添加分类和标签信息
            return await enrichPostsWithCategoriesAndTags(parsedPosts, env.DB);
          } catch (error) {
            console.error("从KV获取的文章添加分类和标签时出错:", error);
            // 如果添加分类和标签失败，仍返回原始文章数据
            return Response.json(parsedPosts);
          }
        }
        
        return Response.json(parsedPosts);
      }
    }
    
    // 如果有D1数据库绑定，从数据库获取文章列表
    if (env.DB) {
      try {
        // 获取文章列表，包括分类和标签
        const postsQuery = await env.DB.prepare(`
          SELECT 
            p.id, p.title, p.summary, p.published_at
          FROM posts p
          WHERE p.published_at IS NOT NULL
          ORDER BY p.published_at DESC
        `).all();
        
        const posts = postsQuery.results || [];
        
        // 如果没有文章，直接返回空数组
        if (posts.length === 0) {
          return Response.json([]);
        }

        // 为文章添加分类和标签信息
        return await enrichPostsWithCategoriesAndTags(posts, env.DB);
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

// 辅助函数：为文章添加分类和标签信息
async function enrichPostsWithCategoriesAndTags(posts, db) {
  try {
    // 确保文章有唯一标识符
    const validPosts = posts.filter(post => post && post.id);
    
    if (validPosts.length === 0) {
      console.log("没有有效的文章数据");
    return Response.json([]);
    }
    
    // 获取所有文章ID
    const postIds = validPosts.map(post => post.id);
    
    // 记录执行的步骤，帮助调试
    console.log(`开始为${validPosts.length}篇文章添加分类和标签信息`);
    console.log(`文章ID列表: ${postIds.join(', ')}`);
    
    // 1. 获取文章分类信息
    const categoriesQuery = await db.prepare(`
      SELECT p.id as post_id, c.id, c.name, c.slug
      FROM posts p
      LEFT JOIN posts_categories pc ON p.id = pc.post_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.id IN (${postIds.map(() => '?').join(',')})
    `).bind(...postIds).all();
    
    const categoriesMap = {};
    if (categoriesQuery.results && categoriesQuery.results.length > 0) {
      console.log(`查询到${categoriesQuery.results.length}条分类信息`);
      categoriesQuery.results.forEach(cat => {
        if (cat.id) { // 只处理有id的分类
          categoriesMap[cat.post_id] = {
            id: cat.id,
            name: cat.name,
            slug: cat.slug
          };
        }
      });
    } else {
      console.log('没有查询到任何分类信息');
    }
    
    // 2. 获取文章标签信息
    const tagsQuery = await db.prepare(`
      SELECT pt.post_id, t.id, t.name, t.slug, t.color
      FROM posts p
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.id IN (${postIds.map(() => '?').join(',')})
    `).bind(...postIds).all();
    
    const tagsMap = {};
    if (tagsQuery.results && tagsQuery.results.length > 0) {
      console.log(`查询到${tagsQuery.results.length}条标签信息`);
      tagsQuery.results.forEach(tag => {
        if (tag.id) { // 只处理有id的标签
          if (!tagsMap[tag.post_id]) {
            tagsMap[tag.post_id] = [];
          }
          tagsMap[tag.post_id].push({
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            color: tag.color || '#4299e1' // 提供默认颜色
          });
        }
      });
    } else {
      console.log('没有查询到任何标签信息');
    }
    
    // 3. 将分类和标签信息添加到文章中
    validPosts.forEach(post => {
      post.category = categoriesMap[post.id] || null;
      post.tags = tagsMap[post.id] || [];
    });
    
    // 添加调试日志
    console.log("处理后的文章数据:", JSON.stringify(validPosts.map(p => ({ 
      id: p.id, 
      title: p.title.substring(0, 20), 
      hasCategory: !!p.category, 
      tagsCount: p.tags.length 
    })), null, 2));
    
    return Response.json(validPosts);
  } catch (error) {
    console.error("为文章添加分类和标签信息时出错:", error);
    // 如果添加分类和标签失败，仍返回原始文章数据
    return Response.json(posts);
  }
}

// 诊断函数：检查数据库表结构和内容
async function diagnoseDatabaseIssues(db) {
  try {
    const diagnostics = {
      tables: {},
      counts: {},
      samples: {},
      message: "这是一个数据库诊断报告，用于检查分类和标签问题",
    };
    
    // 检查表结构
    const tablesQuery = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name IN ('posts', 'categories', 'tags', 'posts_tags', 'posts_categories')
    `).all();
    
    const tables = tablesQuery.results?.map(t => t.name) || [];
    diagnostics.tables.list = tables;
    
    // 检查表中的数据数量
    for (const table of tables) {
      try {
        const countQuery = await db.prepare(`SELECT COUNT(*) as count FROM ${table}`).first();
        diagnostics.counts[table] = countQuery?.count || 0;
        
        // 获取每个表的示例数据
        if (countQuery?.count > 0) {
          const sampleQuery = await db.prepare(`SELECT * FROM ${table} LIMIT 2`).all();
          diagnostics.samples[table] = sampleQuery.results || [];
        }
      } catch (error) {
        diagnostics.counts[table] = `错误: ${error.message}`;
      }
    }
    
    // 特别检查posts表的category_id字段
    try {
      const postsWithCategory = await db.prepare(`
        SELECT id, title, category_id FROM posts WHERE category_id IS NOT NULL LIMIT 5
      `).all();
      diagnostics.postsWithCategory = postsWithCategory.results || [];
    } catch (error) {
      diagnostics.postsWithCategory = `错误: ${error.message}`;
    }
    
    // 检查posts_tags表的关联数据
    try {
      const postTagsQuery = await db.prepare(`
        SELECT post_id, tag_id FROM posts_tags LIMIT 5
      `).all();
      diagnostics.postTagsRelations = postTagsQuery.results || [];
    } catch (error) {
      diagnostics.postTagsRelations = `错误: ${error.message}`;
    }
    
    return Response.json(diagnostics, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return Response.json({
      error: '诊断过程出错',
      message: error.message,
      stack: error.stack,
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 