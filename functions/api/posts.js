import posts from './posts/data.js';

export async function onRequestGet({ env }) {
  try {
    // 检查是否有BLOG_POSTS KV命名空间绑定
    if (env.BLOG_POSTS) {
      // 尝试从KV获取文章列表
      const kvPosts = await env.BLOG_POSTS.get("posts:list");
      
      if (kvPosts) {
        // 如果KV中有数据，返回KV数据
        return Response.json(JSON.parse(kvPosts));
      }
    }
    
    // 如果KV不可用或没有数据，使用模拟数据
    console.log("使用模拟数据，因为KV不可用或无数据");
    
    // 为了不在API中返回完整的文章内容，我们只返回必要的信息
    const simplifiedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      summary: post.summary,
      published_at: post.published_at
    }));
    
    // 按发布日期降序排序（最新的文章先显示）
    simplifiedPosts.sort((a, b) => 
      new Date(b.published_at) - new Date(a.published_at)
    );
    
    return Response.json(simplifiedPosts);
  } catch (error) {
    console.error("获取文章列表时出错:", error);
    
    // 发生错误时返回空列表
    return Response.json([]);
  }
} 