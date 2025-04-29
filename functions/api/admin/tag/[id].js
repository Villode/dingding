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

    // 从KV存储中获取标签
    const { env } = context;
    let tag = null;

    if (env.BLOG_TAGS) {
      const tagData = await env.BLOG_TAGS.get(tagId, { type: 'json' });
      if (tagData) {
        tag = { ...tagData, id: tagId };
      }
    }

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

    // 从KV存储中删除标签
    const { env } = context;
    
    if (env.BLOG_TAGS) {
      // 检查标签是否存在
      const tagExists = await env.BLOG_TAGS.get(tagId);
      if (!tagExists) {
        return new Response(JSON.stringify({ error: 'Tag not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 删除标签
      await env.BLOG_TAGS.delete(tagId);
      
      // 在实际应用中，还应该处理与此标签相关的文章
      // 例如从文章中移除对此标签的引用
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