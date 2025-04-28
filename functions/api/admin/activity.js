/**
 * 活动统计 API 端点
 * 返回过去7天的活动数据
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
        message: '无法访问文章数据，请检查环境配置' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 获取过去7天数据
    try {
      // 获取所有文章
      const posts = await getAllPosts(context);
      
      // 获取过去7天的日期
      const past7Days = getPast7Days();
      
      // 计算每天的文章数量
      const dailyPostCounts = calculateDailyPostCounts(posts, past7Days);
      
      // 计算每天的点赞数量 (模拟数据，因为我们目前没有真实的点赞功能)
      const dailyLikeCounts = calculateDailyLikeCounts(posts, past7Days);
      
      // 找出最活跃的日期
      const { mostActiveDate, highestDailyActivity } = findMostActiveDate(dailyPostCounts, dailyLikeCounts);
      
      // 准备响应数据
      const activityData = {
        dates: past7Days.map(date => formatDateForDisplay(date)),
        postCounts: dailyPostCounts,
        likeCounts: dailyLikeCounts,
        weeklyPostCount: dailyPostCounts.reduce((sum, count) => sum + count, 0),
        weeklyLikeCount: dailyLikeCounts.reduce((sum, count) => sum + count, 0),
        mostActiveDate: formatDateForDisplay(mostActiveDate),
        highestDailyActivity: highestDailyActivity
      };
      
      return new Response(JSON.stringify(activityData), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('获取活动数据失败', error);
      return new Response(JSON.stringify({ 
        error: '获取活动数据失败', 
        message: error.message || '无法读取活动数据' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: '获取活动统计失败', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 获取所有文章
 */
async function getAllPosts(context) {
  try {
    // 首先尝试从 KV 获取文章列表
    const keys = await context.env.BLOG_POSTS.list();
    const posts = [];
    
    for (const key of keys.keys) {
      const postJson = await context.env.BLOG_POSTS.get(key.name);
      if (postJson) {
        try {
          const post = JSON.parse(postJson);
          posts.push(post);
        } catch (e) {
          console.error(`解析文章 ${key.name} 失败:`, e);
        }
      }
    }
    
    return posts;
  } catch (error) {
    // 如果 KV 获取失败，尝试使用静态数据
    console.error('从 KV 获取文章失败，使用静态数据:', error);
    
    // 尝试导入静态数据
    try {
      const postsModule = await import('../posts/data.js');
      return postsModule.posts || [];
    } catch (e) {
      console.error('导入静态数据失败:', e);
      return [];
    }
  }
}

/**
 * 获取过去7天的日期数组
 */
function getPast7Days() {
  const dates = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0); // 重置时间为当天开始
    dates.push(date);
  }
  
  return dates;
}

/**
 * 计算每天的文章数量
 */
function calculateDailyPostCounts(posts, dates) {
  return dates.map(date => {
    const dateString = date.toISOString().split('T')[0];
    return posts.filter(post => post.published_at && post.published_at.startsWith(dateString)).length;
  });
}

/**
 * 计算每天的点赞数量
 * 注意：这里使用了基于文章数量的模拟数据
 */
function calculateDailyLikeCounts(posts, dates) {
  return dates.map(date => {
    const dateString = date.toISOString().split('T')[0];
    const postsOnDay = posts.filter(post => post.published_at && post.published_at.startsWith(dateString));
    
    // 如果有文章，生成随机点赞数（1-5）× 文章数
    if (postsOnDay.length > 0) {
      return Math.floor(Math.random() * 5 + 1) * postsOnDay.length;
    }
    
    // 没有文章的日子也可能有少量点赞（旧文章）
    return Math.floor(Math.random() * 3);
  });
}

/**
 * 找出最活跃的日期
 */
function findMostActiveDate(postCounts, likeCounts) {
  let maxActivity = 0;
  let maxIndex = 0;
  
  // 计算总活动（文章+点赞）
  for (let i = 0; i < postCounts.length; i++) {
    const totalActivity = postCounts[i] + likeCounts[i];
    if (totalActivity > maxActivity) {
      maxActivity = totalActivity;
      maxIndex = i;
    }
  }
  
  const dates = getPast7Days();
  return {
    mostActiveDate: dates[maxIndex],
    highestDailyActivity: maxActivity
  };
}

/**
 * 格式化日期为显示格式
 */
function formatDateForDisplay(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
} 