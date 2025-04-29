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
      throw new Error('查询分类失败');
    }
    
    const categories = result.results || [];
    
    // 控制台打印原始数据
    console.log('原始分类数据:', categories);
    
    // 处理结果，将parent_id重命名为parent，与前端代码匹配
    const formattedCategories = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      parent: cat.parent_id, // 重命名为parent，与前端代码匹配
      parent_name: cat.parent_name,
      created_at: cat.created_at,
      updated_at: cat.updated_at
    }));
    
    // 构建分类树结构
    const buildCategoryTree = (categories, parentId = null) => {
      return categories
        .filter(cat => cat.parent === parentId)
        .map(cat => ({
          ...cat,
          children: buildCategoryTree(categories, cat.id)
        }));
    };
    
    const categoryTree = buildCategoryTree(formattedCategories);
    
    // 修改返回格式，确保categories是数组
    return new Response(JSON.stringify(formattedCategories), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('获取分类列表失败:', error);
    return new Response(JSON.stringify({ 
      error: error.message || '服务器内部错误' 
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