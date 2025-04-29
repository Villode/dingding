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
    const { id, name, slug, color } = requestBody;

    // 验证必填字段
    if (!name) {
      return new Response(JSON.stringify({ error: 'Tag name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 生成slug（如果未提供）
    const tagSlug = slug || name.toLowerCase().replace(/\s+/g, '-');
    const tagColor = color || '#4299e1';
    
    // 使用D1数据库保存标签
    const { env } = context;
    let tagId = id;
    let result;
    
    await env.DB.prepare("BEGIN").run();
    
    try {
      if (tagId) {
        // 更新现有标签
        // 先检查标签是否存在
        const checkStmt = env.DB.prepare("SELECT id FROM tags WHERE id = ?");
        const existingTag = await checkStmt.bind(tagId).first();
        
        if (!existingTag) {
          await env.DB.prepare("ROLLBACK").run();
          return new Response(JSON.stringify({ error: 'Tag not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // 检查slug是否与其他标签冲突
        const slugCheckStmt = env.DB.prepare("SELECT id FROM tags WHERE slug = ? AND id != ?");
        const slugExists = await slugCheckStmt.bind(tagSlug, tagId).first();
        
        if (slugExists) {
          await env.DB.prepare("ROLLBACK").run();
          return new Response(JSON.stringify({ error: 'Slug already exists' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // 更新标签
        const updateStmt = env.DB.prepare(`
          UPDATE tags 
          SET name = ?, slug = ?, color = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `);
        
        result = await updateStmt.bind(name, tagSlug, tagColor, tagId).run();
      } else {
        // 创建新标签
        // 检查slug是否已存在
        const slugCheckStmt = env.DB.prepare("SELECT id FROM tags WHERE slug = ?");
        const slugExists = await slugCheckStmt.bind(tagSlug).first();
        
        if (slugExists) {
          await env.DB.prepare("ROLLBACK").run();
          return new Response(JSON.stringify({ error: 'Slug already exists' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // 插入新标签
        const insertStmt = env.DB.prepare(`
          INSERT INTO tags (name, slug, color) 
          VALUES (?, ?, ?)
        `);
        
        result = await insertStmt.bind(name, tagSlug, tagColor).run();
        tagId = result.meta?.last_row_id;
      }
      
      // 获取更新后的标签数据
      const tagStmt = env.DB.prepare("SELECT id, name, slug, color, created_at, updated_at FROM tags WHERE id = ?");
      const tag = await tagStmt.bind(tagId).first();
      
      await env.DB.prepare("COMMIT").run();
      
      // 返回成功响应，包含标签信息
      return new Response(JSON.stringify({ 
        success: true,
        ...tag
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      await env.DB.prepare("ROLLBACK").run();
      throw err;
    }
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