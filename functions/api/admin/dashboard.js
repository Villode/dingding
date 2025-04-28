/**
 * 管理后台统计数据 API 端点
 * 返回文章总数、点赞总数等统计信息
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
    
    // 准备统计数据
    const stats = {
      postCount: 0,
      likeCount: 0,
      apiCalls: 0, // 暂时无法统计，返回0
      storageConfigs: 0
    };
    
    // 获取文章数
    if (context.env.BLOG_POSTS) {
      try {
        const keys = await context.env.BLOG_POSTS.list();
        stats.postCount = keys.keys.length;
        stats.storageConfigs = 1; // 有BLOG_POSTS配置
      } catch (error) {
        console.error('获取文章数据失败:', error);
      }
    }
    
    // 获取总点赞数
    if (context.env.BLOG_LIKES) {
      try {
        const keys = await context.env.BLOG_LIKES.list();
        let totalLikes = 0;
        
        // 获取每篇文章的点赞数并累加
        for (const key of keys.keys) {
          if (key.name.includes(':likes')) {
            const likeData = await context.env.BLOG_LIKES.get(key.name);
            if (likeData) {
              totalLikes += parseInt(likeData, 10);
            }
          }
        }
        
        stats.likeCount = totalLikes;
        stats.storageConfigs += 1; // 增加BLOG_LIKES配置
      } catch (error) {
        console.error('获取点赞数据失败:', error);
      }
    } else {
      // 明确标记点赞功能不可用
      stats.likeCount = -1; // 使用-1表示功能不可用
      stats.likeStatus = 'unavailable';
      stats.likeMessage = 'BLOG_LIKES KV命名空间未配置';
    }
    
    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: '获取统计数据失败', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 