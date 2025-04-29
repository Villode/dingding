export async function onRequestGet({ request, env, params }) {
    try {
        // 检查环境变量
        console.log('Available env bindings:', Object.keys(env));
        
        if (!env.BLOG_BUCKET) {
            console.error('R2 bucket binding BLOG_BUCKET is not available');
            return new Response('Storage configuration error: R2 bucket not bound', { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!params.name) {
            return new Response('File name is required', { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const filePath = `my-file/${params.name}`;
        console.log('Attempting to fetch file:', filePath);

        // 从 R2 获取文件
        const file = await env.BLOG_BUCKET.get(filePath);
        if (!file) {
            console.log('File not found:', filePath);
            return new Response('File not found', { 
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('File found:', {
            contentType: file.httpMetadata?.contentType,
            size: file.size
        });

        // 准备响应头
        const headers = new Headers();
        headers.set('Content-Type', file.httpMetadata?.contentType || 'application/octet-stream');
        headers.set('Cache-Control', 'public, max-age=31536000'); // 1年缓存
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        
        // 返回文件内容
        return new Response(file.body, { headers });
    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            env: env ? 'env exists' : 'env missing',
            params: params ? JSON.stringify(params) : 'params missing'
        });
        
        return new Response(JSON.stringify({
            error: 'Internal Server Error',
            message: error.message,
            details: 'Check logs for more information'
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 