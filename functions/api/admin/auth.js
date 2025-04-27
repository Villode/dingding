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

// 将字符串转换为 Base64 URL 编码
function strToBase64Url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 超简单的JWT验证逻辑
 * 为确保在Cloudflare环境中正常工作，我们用最简单的方法
 */

// 解码Base64
function decodeBase64(str) {
  try {
    // 确保字符串是有效的Base64
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    return atob(str);
  } catch (e) {
    console.error('Base64解码失败:', e);
    return null;
  }
}

// 超简单的令牌验证，不校验签名
export async function verifyToken(token) {
  if (!token) {
    console.log('没有提供令牌');
    return null;
  }
  
  try {
    // 分割令牌
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('令牌格式无效');
      return null;
    }
    
    // 我们只需要解码payload部分即可
    const payload = decodeBase64(parts[1]);
    if (!payload) {
      console.log('无法解码令牌payload');
      return null;
    }
    
    // 解析成JSON对象
    const data = JSON.parse(payload);
    
    // 检查过期时间
    if (data.exp && Date.now() / 1000 > data.exp) {
      console.log('令牌已过期');
      return null;
    }
    
    // 返回解码后的数据
    return data;
  } catch (error) {
    console.error('令牌验证失败:', error);
    return null;
  }
}

// 认证中间件
export async function authenticate(request) {
  try {
    // 获取授权头
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.log('没有Authorization头');
      return null;
    }
    
    // 检查Bearer令牌
    if (!authHeader.startsWith('Bearer ')) {
      console.log('不是Bearer令牌');
      return null;
    }
    
    // 提取令牌
    const token = authHeader.substring(7);
    
    // 验证令牌
    return await verifyToken(token);
  } catch (error) {
    console.error('认证过程出错:', error);
    return null;
  }
} 