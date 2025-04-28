/**
 * API调用计数器中间件
 * 
 * 该文件用于统计API调用次数，所有API请求都会通过此中间件
 * 统计规则：
 * 1. 只统计成功的API调用（状态码2xx）
 * 2. 使用日期作为键，便于按日期统计
 * 3. 使用KV存储API_STATS保存计数
 */

export async function onRequest({ request, next, env }) {
  // 跳过静态资源请求
  const url = new URL(request.url);
  const isApiRequest = url.pathname.startsWith('/api/');
  
  // 如果不是API请求，直接传递给下一个处理程序
  if (!isApiRequest) {
    return await next();
  }
  
  // 处理API请求
  const response = await next();
  
  // 只计数成功的API请求（状态码2xx）
  if (response.status >= 200 && response.status < 300) {
    try {
      // 只有配置了API_STATS才进行统计
      if (env.API_STATS) {
        // 构造今日的键名
        const today = new Date().toISOString().split('T')[0]; // 格式: YYYY-MM-DD
        const keyName = `api:call:${today}`;
  
        // 获取当前计数
        const currentCount = await env.API_STATS.get(keyName) || '0';
        const newCount = parseInt(currentCount, 10) + 1;
  
        // 更新计数（设置24小时过期）
        await env.API_STATS.put(keyName, newCount.toString(), { expirationTtl: 86400 });
        
        // 将URL路径也记录下来，用于分析不同API的调用情况
        const pathKey = `api:path:${today}:${url.pathname}`;
        const pathCount = await env.API_STATS.get(pathKey) || '0';
        const newPathCount = parseInt(pathCount, 10) + 1;
        await env.API_STATS.put(pathKey, newPathCount.toString(), { expirationTtl: 86400 });
      }
    } catch (error) {
      // 记录错误但不中断请求处理
      console.error('API计数器错误:', error);
    }
  }
  
  // 返回原始响应
  return response;
} 