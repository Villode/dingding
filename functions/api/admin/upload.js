import { authenticate } from './auth.js';

export async function onRequestPost({ request, env }) {
  try {
    // 验证认证
    const user = await authenticate(request);
    if (!user) {
      return new Response(
        JSON.stringify({ error: '未授权，请先登录' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 获取上传的文件
    const formData = await request.formData();
    const file = formData.get('image');
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: '没有找到上传的图片' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ error: '只允许上传图片文件' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 生成唯一的文件名
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.type.split('/')[1];
    const fileName = `${timestamp}-${randomString}.${extension}`;

    // 上传到R2
    try {
      await env.BLOG_BUCKET.put(fileName, file.stream(), {
        httpMetadata: {
          contentType: file.type,
        }
      });

      // 获取上传后的图片URL
      const imageUrl = `${env.BLOG_ASSETS_URL}/${fileName}`;

      return new Response(
        JSON.stringify({ 
          success: true,
          url: imageUrl,
          fileName: fileName
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error('上传图片到R2失败:', error);
      return new Response(
        JSON.stringify({ 
          error: '上传图片失败',
          details: error.message 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('处理图片上传请求失败:', error);
    return new Response(
      JSON.stringify({ 
        error: '处理上传请求失败',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 