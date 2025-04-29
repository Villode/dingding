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

    // 准备标签数据
    const tagData = {
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      color: color || '#4299e1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 保存到KV存储
    const { env } = context;
    let tagId = id;

    if (env.BLOG_TAGS) {
      // 如果是更新现有标签
      if (tagId) {
        // 检查标签是否存在
        const existingTag = await env.BLOG_TAGS.get(tagId);
        if (!existingTag) {
          return new Response(JSON.stringify({ error: 'Tag not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // 保留创建时间
        const existingTagData = JSON.parse(existingTag);
        tagData.created_at = existingTagData.created_at;
      } else {
        // 新建标签，生成唯一ID
        tagId = generateUniqueId();
      }
      
      // 保存标签数据
      await env.BLOG_TAGS.put(tagId, JSON.stringify(tagData));
    } else {
      // 如果没有KV存储，返回错误
      return new Response(JSON.stringify({ error: 'BLOG_TAGS KV namespace is not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 返回成功响应，包含标签ID
    return new Response(JSON.stringify({ 
      success: true, 
      id: tagId,
      ...tagData
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