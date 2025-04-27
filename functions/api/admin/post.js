export async function onRequestPost({ request, env }) {
  try {
    // 检查是否有BLOG_POSTS KV命名空间绑定
    if (!env.BLOG_POSTS) {
      return new Response(
        JSON.stringify({ 
          error: "未配置存储空间" 
        }), 
        { 
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    // 解析请求体
    const data = await request.json();
    
    // 验证必要字段
    if (!data.title || !data.content) {
      return new Response(
        JSON.stringify({ 
          error: "标题和内容是必填项" 
        }), 
        { 
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    // 准备文章数据
    const post = {
      id: data.id || crypto.randomUUID(), // 如果没有ID则创建新的
      title: data.title,
      summary: data.summary || "",
      content: data.content,
      published_at: data.published_at || new Date().toISOString()
    };
    
    // 存储到KV
    await env.BLOG_POSTS.put(`post:${post.id}`, JSON.stringify(post));
    
    // 更新文章列表索引
    let postsList = [];
    try {
      const existingList = await env.BLOG_POSTS.get("posts:list");
      if (existingList) {
        postsList = JSON.parse(existingList);
      }
    } catch (e) {
      // 如果解析失败，使用空列表
      console.error("解析文章列表失败:", e);
    }
    
    // 检查文章是否已存在于列表中
    const existingIndex = postsList.findIndex(item => item.id === post.id);
    
    if (existingIndex >= 0) {
      // 更新已有文章
      postsList[existingIndex] = {
        id: post.id,
        title: post.title,
        summary: post.summary,
        published_at: post.published_at
      };
    } else {
      // 添加新文章到列表
      postsList.push({
        id: post.id,
        title: post.title,
        summary: post.summary,
        published_at: post.published_at
      });
    }
    
    // 按发布日期排序
    postsList.sort((a, b) => 
      new Date(b.published_at) - new Date(a.published_at)
    );
    
    // 保存更新后的列表
    await env.BLOG_POSTS.put("posts:list", JSON.stringify(postsList));
    
    return Response.json({
      success: true,
      post: {
        id: post.id,
        title: post.title
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: "处理请求时出错", 
        details: error.message 
      }), 
      { 
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
} 