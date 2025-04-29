export async function onRequestPost(context) {
  try {
    // 检查认证
    const authResult = await validateAuth(context);
    if (!authResult.valid) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 解析请求体
    const requestBody = await context.request.json();
    const { id, name, slug, description, parent } = requestBody;

    // 验证必填字段
    if (!name) {
      return new Response(JSON.stringify({ error: 'Category name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 准备分类数据
    const categoryData = {
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description: description || '',
      parent: parent || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 保存到KV存储
    const { env } = context;
    let categoryId = id;

    if (env.BLOG_CATEGORIES) {
      // 检查父分类是否存在
      if (parent) {
        const parentCategory = await env.BLOG_CATEGORIES.get(parent);
        if (!parentCategory) {
          return new Response(JSON.stringify({ error: 'Parent category not found' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // 检查是否会创建循环引用
        if (id && await wouldCreateCycle(env, id, parent)) {
          return new Response(JSON.stringify({ error: 'Cannot set parent: would create category hierarchy cycle' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // 如果是更新现有分类
      if (categoryId) {
        // 检查分类是否存在
        const existingCategory = await env.BLOG_CATEGORIES.get(categoryId);
        if (!existingCategory) {
          return new Response(JSON.stringify({ error: 'Category not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // 保留创建时间
        const existingCategoryData = JSON.parse(existingCategory);
        categoryData.created_at = existingCategoryData.created_at;
      } else {
        // 新建分类，生成唯一ID
        categoryId = generateUniqueId();
      }
      
      // 保存分类数据
      await env.BLOG_CATEGORIES.put(categoryId, JSON.stringify(categoryData));
    } else {
      // 如果没有KV存储，返回错误
      return new Response(JSON.stringify({ error: 'BLOG_CATEGORIES KV namespace is not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 返回成功响应，包含分类ID
    return new Response(JSON.stringify({ 
      success: true, 
      id: categoryId,
      ...categoryData
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 检查是否会创建循环引用
async function wouldCreateCycle(env, categoryId, parentId) {
  // 如果尝试将分类设置为自己的父级，则会形成循环
  if (categoryId === parentId) {
    return true;
  }
  
  // 检查连续的父级关系，防止形成更深层次的循环
  let currentParentId = parentId;
  let visitedIds = new Set([categoryId]);
  
  while (currentParentId) {
    // 如果遇到已经访问过的ID，说明存在循环
    if (visitedIds.has(currentParentId)) {
      return true;
    }
    
    visitedIds.add(currentParentId);
    
    // 获取当前父级的父级
    const parentData = await env.BLOG_CATEGORIES.get(currentParentId, { type: 'json' });
    if (!parentData) {
      // 父级不存在，不会形成循环
      return false;
    }
    
    // 移动到下一个父级
    currentParentId = parentData.parent;
  }
  
  // 没有检测到循环
  return false;
}

// 生成唯一ID
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
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