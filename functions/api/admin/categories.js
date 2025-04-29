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
    
    const { env } = context;
    
    // 从D1数据库查询所有分类
    const result = await env.DB.prepare(`
      SELECT c.id, c.name, c.slug, c.description, c.parent_id, 
             c.created_at, c.updated_at, 
             p.name as parent_name 
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      ORDER BY c.name ASC
    `).all();
    
    if (!result.success) {
      throw new Error('Failed to fetch categories');
    }
    
    const categories = result.results || [];
    
    // 构建分类树结构
    const buildCategoryTree = (categories, parentId = null) => {
      return categories
        .filter(cat => cat.parent_id === parentId)
        .map(cat => ({
          ...cat,
          children: buildCategoryTree(categories, cat.id)
        }));
    };
    
    const categoryTree = buildCategoryTree(categories);
    
    return new Response(JSON.stringify({
      categories,
      categoryTree
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal Server Error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
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