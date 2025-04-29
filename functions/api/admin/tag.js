export async function onRequestPost(context) {
  try {
    // 检查认证
    const authResult = await validateAuth(context);
    if (!authResult.valid) {
      return new Response(JSON.stringify({ error: '未授权访问' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 解析请求体
    const requestBody = await context.request.json();
    const { id, name, slug, color } = requestBody;

    // 验证必填字段
    if (!name) {
      return new Response(JSON.stringify({ error: '标签名称不能为空' }), {
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
    let tag;
    
    // 不使用SQL事务，而是使用batch操作
    if (tagId) {
      // 更新现有标签
      // 先检查标签是否存在
      const existingTag = await env.DB.prepare("SELECT id FROM tags WHERE id = ?")
        .bind(tagId)
        .first();
      
      if (!existingTag) {
        return new Response(JSON.stringify({ error: '标签不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 检查slug是否与其他标签冲突
      const slugExists = await env.DB.prepare("SELECT id FROM tags WHERE slug = ? AND id != ?")
        .bind(tagSlug, tagId)
        .first();
      
      if (slugExists) {
        return new Response(JSON.stringify({ error: '该标签别名已存在' }), {
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
      
      // 使用批处理更新并获取结果
      const batchResults = await env.DB.batch([
        updateStmt.bind(name, tagSlug, tagColor, tagId),
        env.DB.prepare("SELECT id, name, slug, color, created_at, updated_at FROM tags WHERE id = ?")
          .bind(tagId)
      ]);
      
      tag = batchResults[1].results[0];
    } else {
      // 创建新标签
      // 检查slug是否已存在
      const slugExists = await env.DB.prepare("SELECT id FROM tags WHERE slug = ?")
        .bind(tagSlug)
        .first();
      
      if (slugExists) {
        return new Response(JSON.stringify({ error: '该标签别名已存在' }), {
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
      
      // 获取新创建的标签数据
      tag = await env.DB.prepare("SELECT id, name, slug, color, created_at, updated_at FROM tags WHERE id = ?")
        .bind(tagId)
        .first();
    }
    
    // 返回成功响应，包含标签信息
    return new Response(JSON.stringify({ 
      success: true,
      ...tag
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('标签保存失败:', error);
    return new Response(JSON.stringify({ error: error.message || '服务器内部错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

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
    const tagId = params.id;

    if (!tagId) {
      return new Response(JSON.stringify({ error: '标签ID不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 从D1数据库查询标签
    const result = await env.DB.prepare(`
      SELECT id, name, slug, color, created_at, updated_at
      FROM tags
      WHERE id = ?
    `).bind(tagId).first();

    if (!result) {
      return new Response(JSON.stringify({ error: '标签不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取相关文章数量
    const postsCountResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM posts_tags
      WHERE tag_id = ?
    `).bind(tagId).first();

    const postsCount = postsCountResult ? postsCountResult.count : 0;

    const tag = {
      ...result,
      postsCount
    };

    return new Response(JSON.stringify({ tag }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching tag:', error);
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
      return new Response(JSON.stringify({ error: '未授权访问' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { env, params } = context;
    const tagId = params.id;

    if (!tagId) {
      return new Response(JSON.stringify({ error: '标签ID不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查标签是否存在
    const tagExists = await env.DB.prepare(
      "SELECT id FROM tags WHERE id = ?"
    ).bind(tagId).first();

    if (!tagExists) {
      return new Response(JSON.stringify({ error: '标签不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查该标签是否关联了文章
    const hasAssociatedPosts = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM posts_tags WHERE tag_id = ?"
    ).bind(tagId).first();

    if (hasAssociatedPosts && hasAssociatedPosts.count > 0) {
      return new Response(JSON.stringify({ 
        error: '无法删除已关联文章的标签，请先解除关联' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 删除标签
    await env.DB.prepare(
      "DELETE FROM tags WHERE id = ?"
    ).bind(tagId).run();

    return new Response(JSON.stringify({ 
      success: true,
      message: '标签已成功删除'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('删除标签失败:', error);
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