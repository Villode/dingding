/**
 * API调用统计详情接口
 * 提供API调用次数的详细信息，包括：
 * 1. 按日期统计的调用总数
 * 2. 按API路径统计的调用分布
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
    
    // 如果没有API_STATS配置，返回错误
    if (!context.env.API_STATS) {
      return new Response(JSON.stringify({ 
        error: 'API调用统计不可用',
        message: 'API_STATS KV命名空间未配置'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 获取查询参数
    const url = new URL(context.request.url);
    const days = parseInt(url.searchParams.get('days') || '7', 10);
    const maxDays = 30; // 最多查询30天数据
    
    // 限制查询天数
    const queryDays = Math.min(days, maxDays);
    
    // 准备结果对象
    const result = {
      totalCalls: 0,
      dailyStats: [],
      pathStats: []
    };
    
    // 获取日期范围
    const dates = [];
    for (let i = 0; i < queryDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // 日期排序（从旧到新）
    dates.reverse();
    
    // 按日期获取API调用数据
    for (const date of dates) {
      const keyName = `api:call:${date}`;
      const dailyCount = await context.env.API_STATS.get(keyName) || '0';
      const count = parseInt(dailyCount, 10);
      
      result.dailyStats.push({
        date,
        count
      });
      
      result.totalCalls += count;
    }
    
    // 获取最近一天的API路径分布
    if (dates.length > 0) {
      const latestDate = dates[dates.length - 1];
      const pathPrefix = `api:path:${latestDate}:`;
      
      // 列出所有当天的路径键
      const pathKeys = await context.env.API_STATS.list({ prefix: pathPrefix });
      
      // 获取每个路径的调用次数
      const pathPromises = pathKeys.keys.map(async key => {
        const count = await context.env.API_STATS.get(key.name) || '0';
        const path = key.name.substring(pathPrefix.length);
        return {
          path,
          count: parseInt(count, 10)
        };
      });
      
      // 等待所有路径数据获取完成
      const pathCounts = await Promise.all(pathPromises);
      
      // 按调用次数排序（从高到低）
      pathCounts.sort((a, b) => b.count - a.count);
      
      result.pathStats = pathCounts;
    }
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: '获取API调用统计数据失败', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 