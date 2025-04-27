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

// 验证JWT令牌
export async function verifyToken(token) {
  if (!token) {
    return null;
  }
  
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    
    if (!encodedHeader || !encodedPayload || !signature) {
      return null;
    }
    
    // 验证签名
    const secret = 'your-secret-key'; // 应与生成令牌时使用的密钥相同
    
    const data = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await sha256(`${data}.${secret}`);
    const expectedSignatureBase64 = arrayBufferToBase64Url(
      new TextEncoder().encode(expectedSignature)
    );
    
    if (signature !== expectedSignatureBase64) {
      return null;
    }
    
    // 解码payload
    const decodedPayload = JSON.parse(atob(encodedPayload));
    
    // 检查令牌是否过期
    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < currentTime) {
      return null;
    }
    
    return decodedPayload;
  } catch (error) {
    console.error('验证令牌出错:', error);
    return null;
  }
}

// 认证中间件
export async function authenticate(request) {
  // 从请求头中获取Authorization
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
  return await verifyToken(token);
} 