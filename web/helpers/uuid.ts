export function getUserUUID() {
  const key = 'user_uuid'
  let uuid = localStorage.getItem(key)

  if (!uuid) {
    uuid = crypto.randomUUID() // 生成新的 UUID
    localStorage.setItem(key, uuid) // 存储到 localStorage
  }

  return uuid
}
