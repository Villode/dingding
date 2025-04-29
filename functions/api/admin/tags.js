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

    // 从D1数据库获取所有标签
    const { env } = context;
    
    // 检查数据库连接
    if (!env.DB) {
      console.error('数据库连接不可用');
      return new Response(JSON.stringify({ error: '数据库连接失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      const stmt = env.DB.prepare("SELECT id, name, slug, color, created_at, updated_at FROM tags ORDER BY name");
      const result = await stmt.all();
      
      // 确保返回的是数组
      const tags = result.results || [];
      
      // 返回标签列表
      return new Response(JSON.stringify(tags), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (dbError) {
      console.error('数据库查询错误:', dbError);
      return new Response(JSON.stringify({ error: '数据库查询失败: ' + dbError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('获取标签列表出错:', error);
    return new Response(JSON.stringify({ error: error.message || '服务器内部错误' }), {
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