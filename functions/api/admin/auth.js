// 引入加密库
import { createHash } from 'crypto';

// 验证JWT令牌
export function verifyToken(token) {
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
    const expectedSignature = createHash('sha256')
      .update(`${data}.${secret}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    if (signature !== expectedSignature) {
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
  return verifyToken(token);
} 