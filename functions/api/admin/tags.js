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

    // 获取所有标签
    const { env } = context;
    let tags = [];

    // 检查是否有KV命名空间
    if (env.BLOG_TAGS) {
      // 列出所有标签
      const tagsList = await env.BLOG_TAGS.list();
      
      // 如果有标签，获取每个标签的详细信息
      if (tagsList.keys.length > 0) {
        const tagPromises = tagsList.keys.map(async (key) => {
          const tagData = await env.BLOG_TAGS.get(key.name, { type: 'json' });
          return { ...tagData, id: key.name };
        });
        
        tags = await Promise.all(tagPromises);
      }
    }

    // 返回标签列表
    return new Response(JSON.stringify(tags), {
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