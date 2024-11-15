import { cookies } from 'next/headers'

export async function getAuthSession() {
  const cookieStore = await cookies()
  return cookieStore.get('auth')?.value
}

export async function getUserData() {
  const cookieStore = await cookies()
  const userData = cookieStore.get('userData')?.value
  return userData ? JSON.parse(userData) : null
} 