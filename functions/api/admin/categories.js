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

    // 获取所有分类
    const { env } = context;
    let categories = [];

    // 检查是否有KV命名空间
    if (env.BLOG_CATEGORIES) {
      // 列出所有分类
      const categoriesList = await env.BLOG_CATEGORIES.list();
      
      // 如果有分类，获取每个分类的详细信息
      if (categoriesList.keys.length > 0) {
        const categoryPromises = categoriesList.keys.map(async (key) => {
          const categoryData = await env.BLOG_CATEGORIES.get(key.name, { type: 'json' });
          return { ...categoryData, id: key.name };
        });
        
        categories = await Promise.all(categoryPromises);
      }
    }

    // 返回分类列表
    return new Response(JSON.stringify(categories), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
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
  // 例如检查KV存储中的有效令牌
  // 简单示例，实际应用需要更完善的验证机制
  if (token) {
    return { valid: true, user: { role: 'admin' } };
  }
  
  return { valid: false };
} 