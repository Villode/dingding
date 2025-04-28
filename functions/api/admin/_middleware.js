/**
 * 管理后台 API 认证中间件
 * 验证请求中的 JWT 令牌
 */

export async function onRequest(context) {
  // 检查是否是登录API - 登录API不需要认证
  const url = new URL(context.request.url);
  if (url.pathname.endsWith('/api/admin/login')) {
    // 如果是登录API，跳过验证
    return context.next();
  }
  
  // 获取请求中的 Authorization 头
  const authHeader = context.request.headers.get('Authorization');
  
  // 如果没有 Authorization 头，返回未授权错误
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '需要登录才能访问管理 API' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer'
      }
    });
  }
  
  // 提取令牌
  const token = authHeader.split(' ')[1];
  
  try {
    // 在实际应用中，这里应该验证 JWT 令牌
    // 为简化示例，我们仅检查令牌是否存在
    
    // 如果有环境变量，可以用它来验证
    if (context.env.JWT_SECRET) {
      // 实际项目中应该进行真实的 JWT 验证
      // 这里简化处理，只检查令牌长度
      if (token.length < 10) {
        throw new Error('无效的令牌');
      }
    }
    
    // 验证通过，继续处理请求
    return context.next();
    
  } catch (error) {
    // 令牌无效，返回未授权错误
    return new Response(JSON.stringify({ 
      error: '无效的认证令牌', 
      message: error.message 
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer'
      }
    });
  }
} 