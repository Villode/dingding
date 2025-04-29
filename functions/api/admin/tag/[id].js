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

    // 获取URL参数中的标签ID
    const { params } = context;
    const tagId = params.id;

    if (!tagId) {
      return new Response(JSON.stringify({ error: 'Tag ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 从D1数据库中获取标签
    const { env } = context;
    const stmt = env.DB.prepare("SELECT id, name, slug, color, created_at, updated_at FROM tags WHERE id = ?");
    const tag = await stmt.bind(tagId).first();

    if (!tag) {
      return new Response(JSON.stringify({ error: 'Tag not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 返回标签信息
    return new Response(JSON.stringify(tag), {
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

    // 获取URL参数中的标签ID
    const { params } = context;
    const tagId = params.id;

    if (!tagId) {
      return new Response(JSON.stringify({ error: 'Tag ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 从D1数据库中删除标签
    const { env } = context;
    
    // 开始事务
    await env.DB.prepare("BEGIN").run();
    
    try {
      // 检查标签是否存在
      const checkStmt = env.DB.prepare("SELECT id FROM tags WHERE id = ?");
      const existingTag = await checkStmt.bind(tagId).first();
      
      if (!existingTag) {
        await env.DB.prepare("ROLLBACK").run();
        return new Response(JSON.stringify({ error: 'Tag not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 先删除标签与文章的关联
      await env.DB.prepare("DELETE FROM post_tags WHERE tag_id = ?").bind(tagId).run();
      
      // 删除标签
      await env.DB.prepare("DELETE FROM tags WHERE id = ?").bind(tagId).run();
      
      // 提交事务
      await env.DB.prepare("COMMIT").run();
    } catch (err) {
      // 回滚事务
      await env.DB.prepare("ROLLBACK").run();
      throw err;
    }

    // 返回成功响应
    return new Response(JSON.stringify({ success: true, message: 'Tag deleted successfully' }), {
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