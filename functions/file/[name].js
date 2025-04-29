export async function onRequestGet({ request, env, params }) {
    try {
        if (!params.name) {
            return new Response('File name is required', { status: 400 });
        }

        // 从 R2 获取文件
        const file = await env.MY_BUCKET.get(`my-file/${params.name}`);
        if (!file) {
            return new Response('File not found', { status: 404 });
        }

        // 准备响应头
        const headers = new Headers();
        headers.set('Content-Type', file.httpMetadata.contentType || 'application/octet-stream');
        headers.set('Cache-Control', 'public, max-age=31536000'); // 1年缓存
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        
        // 返回文件内容
        return new Response(file.body, {
            headers
        });
    } catch (error) {
        console.error('Error fetching file:', error);
        return new Response('Internal Server Error: ' + error.message, { status: 500 });
    }
} 