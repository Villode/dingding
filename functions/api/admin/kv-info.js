/**
 * KV 存储信息 API 端点
 * 返回 KV 命名空间列表和存储使用情况
 */

export async function onRequestGet(context) {
  try {
    // 检查用户身份验证
    const authHeader = context.request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: '未授权访问' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查是否有 KV 绑定可用
    if (!context.env.BLOG_POSTS) {
      return new Response(JSON.stringify({ 
        error: 'KV 存储不可用', 
        message: '无法访问 KV 命名空间，请检查环境配置' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 尝试从实际绑定的 KV 命名空间中获取数据
    try {
      // 列出 BLOG_POSTS 命名空间中的键
      const keys = await context.env.BLOG_POSTS.list({ limit: 100 });
      
      // 估算使用率（每个键平均 10KB）
      const estimatedUsage = keys.keys.length * 10 * 1024;
      
      // 获取查询参数中的命名空间 ID
      const namespaceId = new URL(context.request.url).searchParams.get('namespace');
      
      // 获取存储桶分布数据
      // 在实际环境中，这些数据应该从相应的存储服务 API 获取
      // 目前我们只有 Cloudflare KV 可用，所以只显示这一个
      const bucketDistribution = [
        { name: 'Cloudflare KV', usage: estimatedUsage, color: 'blue' }
      ];
      
      // 计算总使用量和百分比
      const totalUsage = bucketDistribution.reduce((total, bucket) => total + bucket.usage, 0);
      bucketDistribution.forEach(bucket => {
        bucket.percentage = totalUsage > 0 ? (bucket.usage / totalUsage * 100).toFixed(1) : 100;
      });
      
      // 准备响应数据
      const kvInfo = {
        namespaces: [
          { id: 'blog_posts', name: '博客文章数据', keys: keys.keys.length }
        ],
        usage: {
          // KV 命名空间大小限制
          total: 1024 * 1024 * 1024, // 1GB
          used: estimatedUsage
        },
        bucketDistribution: bucketDistribution
      };
      
      // 如果请求了特定命名空间且不是 blog_posts，返回错误
      if (namespaceId && namespaceId !== 'all' && namespaceId !== 'blog_posts') {
        return new Response(JSON.stringify({ 
          error: '命名空间不存在', 
          message: `未找到 ID 为 ${namespaceId} 的命名空间` 
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(kvInfo), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('获取 KV 数据失败', error);
      return new Response(JSON.stringify({ 
        error: '获取 KV 数据失败', 
        message: error.message || '无法读取 KV 存储数据' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: '获取 KV 存储信息失败', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 