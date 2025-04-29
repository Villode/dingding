import { authenticate } from './auth.js';

// 生成简单的随机ID
function generateId(length = 8) {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export async function onRequestPost({ request, env }) {
  try {
    // 验证认证
    const user = await authenticate(request);
    if (!user) {
      return new Response(
        JSON.stringify({ error: '未授权，请先登录' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 解析请求体
    const postData = await request.json();
    
    // 验证必要的字段
    if (!postData.title || !postData.content) {
      return new Response(
        JSON.stringify({ error: '标题和内容为必填项' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 设置文章ID（如果是新文章）或使用现有的
    const postId = postData.id || generateId(8);
    const isNew = !postData.id;
    
    // 构建完整的文章对象
    const post = {
      id: postId,
      title: postData.title,
      summary: postData.summary || '',
      content: postData.content,
      published_at: postData.published_at || new Date().toISOString()
    };
    
    // 准备批处理操作数组
    const batchOperations = [];
    
    // 兼容KV存储
    if (env.BLOG_POSTS) {
      try {
        // 保存文章到KV
        await env.BLOG_POSTS.put(`post:${postId}`, JSON.stringify(post));
        
        // 更新文章列表
        let posts = [];
        const kvPosts = await env.BLOG_POSTS.get('posts:list');
        
        if (kvPosts) {
          posts = JSON.parse(kvPosts);
        }
        
        // 如果是新文章，添加到列表；否则更新现有文章
        if (isNew) {
          posts.push({
            id: post.id,
            title: post.title,
            summary: post.summary,
            published_at: post.published_at
          });
        } else {
          // 更新现有文章
          const index = posts.findIndex(p => p.id === postId);
          if (index !== -1) {
            posts[index] = {
              id: post.id,
              title: post.title,
              summary: post.summary,
              published_at: post.published_at
            };
          } else {
            // 如果找不到，添加为新文章
            posts.push({
              id: post.id,
              title: post.title,
              summary: post.summary,
              published_at: post.published_at
            });
          }
        }
        
        // 按发布日期降序排序
        posts.sort((a, b) => 
          new Date(b.published_at) - new Date(a.published_at)
        );
        
        // 保存更新后的文章列表
        await env.BLOG_POSTS.put('posts:list', JSON.stringify(posts));
      } catch (kvError) {
        console.error('KV存储操作失败:', kvError);
      }
    }
    
    // 使用D1数据库
    if (env.DB) {
      try {
        // 检查文章在D1中是否存在
        const existingPost = await env.DB.prepare(`
          SELECT id FROM posts WHERE id = ?
        `).bind(postId).first();
        
        if (existingPost) {
          // 更新现有文章
          batchOperations.push(
            env.DB.prepare(`
              UPDATE posts 
              SET title = ?, summary = ?, content = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).bind(post.title, post.summary, post.content, post.published_at, postId)
          );
        } else {
          // 插入新文章
          batchOperations.push(
            env.DB.prepare(`
              INSERT INTO posts (id, title, summary, content, published_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).bind(postId, post.title, post.summary, post.content, post.published_at)
          );
        }
        
        // 处理标签关联
        if (postData.tags && Array.isArray(postData.tags) && postData.tags.length > 0) {
          // 验证所有标签是否存在
          const tagIds = postData.tags;
          const existingTags = await env.DB.prepare(`
            SELECT id FROM tags WHERE id IN (${tagIds.map(() => '?').join(',')})
          `).bind(...tagIds).all();
          
          if (existingTags.results.length !== tagIds.length) {
            return new Response(
              JSON.stringify({ error: '存在无效的标签ID' }),
              { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          
          // 删除现有标签关联
          if (existingPost) {
            batchOperations.push(
              env.DB.prepare(`DELETE FROM post_tags WHERE post_id = ?`).bind(postId)
            );
          }
          
          // 添加新的标签关联
          for (const tagId of tagIds) {
            batchOperations.push(
              env.DB.prepare(`
                INSERT INTO post_tags (post_id, tag_id) 
                VALUES (?, ?)
              `).bind(postId, tagId)
            );
          }
        }
        
        // 处理分类关联
        if (postData.categories && Array.isArray(postData.categories) && postData.categories.length > 0) {
          // 验证所有分类是否存在
          const categoryIds = postData.categories;
          const existingCategories = await env.DB.prepare(`
            SELECT id FROM categories WHERE id IN (${categoryIds.map(() => '?').join(',')})
          `).bind(...categoryIds).all();
          
          if (existingCategories.results.length !== categoryIds.length) {
            return new Response(
              JSON.stringify({ error: '存在无效的分类ID' }),
              { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          
          // 删除现有分类关联
          if (existingPost) {
            batchOperations.push(
              env.DB.prepare(`DELETE FROM posts_categories WHERE post_id = ?`).bind(postId)
            );
          }
          
          // 添加新的分类关联
          for (const categoryId of categoryIds) {
            batchOperations.push(
              env.DB.prepare(`
                INSERT INTO posts_categories (post_id, category_id) 
                VALUES (?, ?)
              `).bind(postId, categoryId)
            );
          }
        }
        
        // 执行批处理操作
        if (batchOperations.length > 0) {
          await env.DB.batch(batchOperations);
        }
        
      } catch (dbError) {
        console.error('D1数据库操作失败:', dbError);
        return new Response(
          JSON.stringify({ 
            error: 'D1数据库操作失败', 
            details: dbError.message 
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // 返回成功响应
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isNew ? '文章创建成功' : '文章更新成功',
        post
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('保存文章时出错:', error);
    
    return new Response(
      JSON.stringify({ 
        error: '处理文章保存请求时出错', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function onRequestGet({ request, env, params }) {
  try {
    // 验证认证
    const user = await authenticate(request);
    if (!user) {
      return new Response(
        JSON.stringify({ error: '未授权，请先登录' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 获取URL参数
    const url = new URL(request.url);
    const postId = url.searchParams.get('id');
    
    if (!postId) {
      return new Response(
        JSON.stringify({ error: '文章ID为必填项' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    let post = null;
    let tags = [];
    let categories = [];
    
    // 尝试从D1获取
    if (env.DB) {
      try {
        // 查询文章
        post = await env.DB.prepare(`
          SELECT id, title, summary, content, published_at, created_at, updated_at 
          FROM posts 
          WHERE id = ?
        `).bind(postId).first();
        
        if (post) {
          // 查询文章的标签
          const tagsResult = await env.DB.prepare(`
            SELECT t.id, t.name, t.slug, t.color
            FROM tags t
            JOIN post_tags pt ON t.id = pt.tag_id
            WHERE pt.post_id = ?
            ORDER BY t.name
          `).bind(postId).all();
          
          if (tagsResult.results) {
            tags = tagsResult.results;
          }
          
          // 查询文章的分类
          const categoriesResult = await env.DB.prepare(`
            SELECT c.id, c.name, c.slug, c.description, c.parent_id
            FROM categories c
            JOIN post_categories pc ON c.id = pc.category_id
            WHERE pc.post_id = ?
            ORDER BY c.name
          `).bind(postId).all();
          
          if (categoriesResult.results) {
            categories = categoriesResult.results;
          }
        }
      } catch (dbError) {
        console.error('从D1获取文章数据失败:', dbError);
      }
    }
    
    // 如果D1没有数据，尝试从KV获取
    if (!post && env.BLOG_POSTS) {
      const kvPost = await env.BLOG_POSTS.get(`post:${postId}`, 'json');
      if (kvPost) {
        post = kvPost;
      }
    }
    
    if (!post) {
      return new Response(
        JSON.stringify({ error: '文章不存在' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 返回文章、标签和分类
    return new Response(
      JSON.stringify({ 
        post,
        tags,
        categories
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('获取文章时出错:', error);
    
    return new Response(
      JSON.stringify({ 
        error: '获取文章时出错', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 