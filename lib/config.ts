export const ADMIN_USER_IDS = ['user_3EY7Xb5pBY6UUFxJU4cZCclp0Qv']

export function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId)
}
