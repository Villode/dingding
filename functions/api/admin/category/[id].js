export async function onRequestGet(context) {
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

    // 从KV存储中获取分类
    const { env } = context;
    let category = null;

    if (env.BLOG_CATEGORIES) {
      const categoryData = await env.BLOG_CATEGORIES.get(categoryId, { type: 'json' });
      if (categoryData) {
        category = { ...categoryData, id: categoryId };
      }
    }

    if (!category) {
      return new Response(JSON.stringify({ error: 'Category not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 返回分类信息
    return new Response(JSON.stringify(category), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
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

    const { env } = context;
    
    if (env.BLOG_CATEGORIES) {
      // 检查分类是否存在
      const categoryData = await env.BLOG_CATEGORIES.get(categoryId, { type: 'json' });
      if (!categoryData) {
        return new Response(JSON.stringify({ error: 'Category not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 检查是否有子分类
      const allCategories = await getAllCategories(env);
      const childCategories = allCategories.filter(cat => cat.parent === categoryId);
      
      if (childCategories.length > 0) {
        return new Response(JSON.stringify({ 
          error: 'Cannot delete category with child categories. Remove or reassign child categories first.' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 删除分类
      await env.BLOG_CATEGORIES.delete(categoryId);
      
      // 在实际应用中，还应该处理与此分类相关的文章
      // 例如从文章中移除对此分类的引用
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
  // 例如检查KV存储中的有效令牌
  // 简单示例，实际应用需要更完善的验证机制
  if (token) {
    return { valid: true, user: { role: 'admin' } };
  }
  
  return { valid: false };
} 