// 使用 Web Crypto API 代替 Node.js crypto 模块
async function sha256(message) {
  // 将消息编码为 Uint8Array
  const msgUint8 = new TextEncoder().encode(message);
  // 使用 Web Crypto API 的 subtle.digest 生成哈希
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  // 将缓冲区转换为字节数组
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // 将字节数组转换为十六进制字符串
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 将 ArrayBuffer 转换为 Base64 URL 编码
function arrayBufferToBase64Url(buffer) {
  // 将 ArrayBuffer 转换为 Base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  
  // 转换为 Base64 URL 格式
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 安全的密码比较函数
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// 生成简单的JWT令牌
async function generateToken(username) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const payload = {
    username,
    exp: Math.floor(Date.now() / 1000) + (3600 * 24) // 24小时过期
  };
  
  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(payload));
  
  const secret = 'your-secret-key'; // 在实际应用中应该使用环境变量
  
  const data = `${base64Header}.${base64Payload}`;
  const signature = await sha256(`${data}.${secret}`);
  const signatureBase64 = arrayBufferToBase64Url(
    new TextEncoder().encode(signature)
  );
  
  return `${data}.${signatureBase64}`;
}

// 验证管理员登录信息
export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json();
    
    // 检查是否有用户名和密码
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: '请提供用户名和密码' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 在KV中获取管理员信息，如果有的话
    let adminCredentials;
    if (env.BLOG_POSTS) {
      const kvAdminData = await env.BLOG_POSTS.get('admin:credentials');
      if (kvAdminData) {
        adminCredentials = JSON.parse(kvAdminData);
      }
    }
    
    // 如果KV中没有管理员信息，使用默认的
    if (!adminCredentials) {
      // 在实际应用中，应该使用更安全的存储方式和加密
      adminCredentials = {
        username: 'admin',
        // 使用SHA-256哈希密码 'password'
        passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
      };
    }
    
    // 计算密码哈希
    const passwordHash = await sha256(password);
    
    // 验证用户名和密码
    if (username !== adminCredentials.username || 
        !safeCompare(passwordHash, adminCredentials.passwordHash)) {
      return new Response(
        JSON.stringify({ error: '用户名或密码错误' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 生成JWT令牌
    const token = await generateToken(username);
    
    // 返回成功响应和令牌
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '登录成功',
        token
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('登录处理错误:', error);
    
    return new Response(
      JSON.stringify({ 
        error: '处理登录请求时出错', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 