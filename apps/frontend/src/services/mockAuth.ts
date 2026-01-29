import type { User, UserRole } from '@/stores/auth'

const mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@bakong.com',
    displayName: 'Administrator',
    role: 'ADMIN_USER' as UserRole,
    password: 'admin123',
  },
  {
    id: 1,
    username: 'admin',
    email: 'admin@bakong.com',
    displayName: 'Administrator',
    role: 'ADMIN_USER' as UserRole,
    password: 'admin123',
  },
  {
    id: 2,
    username: 'user',
    email: 'user@bakong.com',
    displayName: 'Normal User',
    role: 'NORMAL_USER' as UserRole,
    password: 'user123',
  },
  {
    id: 3,
    username: 'api',
    email: 'api@bakong.com',
    displayName: 'API User',
    role: 'API_USER' as UserRole,
    password: 'api123',
  },
]

const generateMockToken = (user: any): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({
      sub: user.id.toString(),
      username: user.username,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    }),
  )
  const signature = btoa('mock-signature')

  return `${header}.${payload}.${signature}`
}

const createMockResponse = (
  data: any,
  responseCode: number = 0,
  responseMessage: string = 'Success',
) => {
  return {
    data: {
      responseCode,
      responseMessage,
      data,
    },
  }
}

export const mockAuthApi = {
  login: async (credentials: { username: string; password: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const user = mockUsers.find((u) => u.username === credentials.username)

    if (!user) {
      return createMockResponse(null, 1, 'User not found')
    }

    if (user.password !== credentials.password) {
      return createMockResponse(null, 1, 'Invalid password')
    }

    const accessToken = generateMockToken(user)

    const { password, ...userData } = user

    return createMockResponse({
      accessToken,
      user: userData,
    })
  },

  register: async (userData: {
    username: string
    password: string
    displayName: string
    role: string
  }) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const existingUser = mockUsers.find((u) => u.username === userData.username)
    if (existingUser) {
      return createMockResponse(null, 1, 'Username already exists')
    }

    const newUser = {
      id: mockUsers.length + 1,
      username: userData.username,
      email: `${userData.username}@bakong.com`,
      displayName: userData.displayName,
      role: userData.role as UserRole,
      password: userData.password,
    }

    mockUsers.push(newUser)

    const accessToken = generateMockToken(newUser)

    const { password, ...userDataWithoutPassword } = newUser

    return createMockResponse({
      accessToken,
      user: userDataWithoutPassword,
    })
  },

  logout: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    return createMockResponse({ message: 'Logged out successfully' })
  },

  refreshToken: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const token = localStorage.getItem('auth_token')
    if (!token) {
      return createMockResponse(null, 1, 'No token to refresh')
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const user = mockUsers.find((u) => u.id === parseInt(payload.sub))

      if (!user) {
        return createMockResponse(null, 1, 'User not found')
      }

      const newToken = generateMockToken(user)
      const { password, ...userData } = user

      return createMockResponse({
        accessToken: newToken,
        user: userData,
      })
    } catch (error) {
      return createMockResponse(null, 1, 'Invalid token')
    }
  },
}

/**
 * Mock authentication is disabled.
 * This function always returns false to use the real API.
 * To re-enable mock mode, change this to return true.
 */
export const isMockMode = (): boolean => {
  return false
}

export { mockUsers }
