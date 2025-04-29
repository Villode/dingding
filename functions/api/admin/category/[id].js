export async function onRequestGet(context) {
  try {
    // 检查认证
    const authResult = await validateAuth(context);
    if (!authResult.valid) {
      return new Response(JSON.stringify({ error: '未授权访问' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { env, params } = context;
    const categoryId = params.id;

    if (!categoryId) {
      return new Response(JSON.stringify({ error: '分类ID不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 从D1数据库查询分类
    const result = await env.DB.prepare(`
      SELECT c.id, c.name, c.slug, c.description, c.parent_id, 
             c.created_at, c.updated_at, 
             p.name as parent_name 
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = ?
    `).bind(categoryId).first();

    if (!result) {
      return new Response(JSON.stringify({ error: '分类不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取子分类
    const childrenResult = await env.DB.prepare(`
      SELECT id, name, slug, description, parent_id, created_at, updated_at
      FROM categories
      WHERE parent_id = ?
    `).bind(categoryId).all();

    const children = childrenResult.success ? childrenResult.results : [];

    // 获取相关文章数量
    const postsCountResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM posts_categories
      WHERE category_id = ?
    `).bind(categoryId).first();

    const postsCount = postsCountResult ? postsCountResult.count : 0;

    const category = {
      ...result,
      children,
      postsCount
    };

    return new Response(JSON.stringify({ category }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching category:', error);
    return new Response(JSON.stringify({ 
      error: error.message || '服务器内部错误' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestDelete(context) {
  try {
    // 检查认证
    const authResult = await validateAuth(context);
    if (!authResult.valid) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取URL参数中的分类ID
    const { params } = context;
    const categoryId = params.id;

    if (!categoryId) {
      return new Response(JSON.stringify({ error: 'Category ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 从D1数据库中删除分类
    const { env } = context;
    
    // 开始事务
    await env.DB.prepare("BEGIN").run();
    
    try {
      // 检查分类是否存在
      const checkStmt = env.DB.prepare("SELECT id FROM categories WHERE id = ?");
      const existingCategory = await checkStmt.bind(categoryId).first();
      
      if (!existingCategory) {
        await env.DB.prepare("ROLLBACK").run();
        return new Response(JSON.stringify({ error: 'Category not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 检查是否有子分类
      const childrenStmt = env.DB.prepare("SELECT id FROM categories WHERE parent_id = ?");
      const children = await childrenStmt.bind(categoryId).all();
      
      if (children && children.results && children.results.length > 0) {
        await env.DB.prepare("ROLLBACK").run();
        return new Response(JSON.stringify({ 
          error: 'Cannot delete category with child categories. Remove or reassign child categories first.' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 先删除分类与文章的关联
      await env.DB.prepare("DELETE FROM post_categories WHERE category_id = ?").bind(categoryId).run();
      
      // 删除分类
      await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(categoryId).run();
      
      // 提交事务
      await env.DB.prepare("COMMIT").run();
    } catch (err) {
      // 回滚事务
      await env.DB.prepare("ROLLBACK").run();
      throw err;
    }

    // 返回成功响应
    return new Response(JSON.stringify({ success: true, message: 'Category deleted successfully' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 获取所有分类
async function getAllCategories(env) {
  let categories = [];
  
  if (env.BLOG_CATEGORIES) {
    const categoriesList = await env.BLOG_CATEGORIES.list();
    
    if (categoriesList.keys.length > 0) {
      const categoryPromises = categoriesList.keys.map(async (key) => {
        const categoryData = await env.BLOG_CATEGORIES.get(key.name, { type: 'json' });
        return { ...categoryData, id: key.name };
      });
      
      categories = await Promise.all(categoryPromises);
    }
  }
  
  return categories;
}

// 验证认证令牌
async function validateAuth(context) {
  const authHeader = context.request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false };
  }
  
  const token = authHeader.substring(7);
  
  // 在实际应用中，这里应该验证令牌
  // 简单示例，实际应用需要更完善的验证机制
  if (token) {
    return { valid: true, user: { role: 'admin' } };
  }
  
  return { valid: false };
} 