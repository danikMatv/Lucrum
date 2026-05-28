import { create } from 'zustand'
import { authService } from '../services/authService.ts'
import { setAccessToken } from '../services/apiClient.ts'
import type { User } from '../types/api.ts'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
  setUser: (user: User | null) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: Boolean(user), isLoading: false }),
  clearUser: () => {
    setAccessToken(null)
    set({ user: null, isAuthenticated: false, isLoading: false })
  },
  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { user } = await authService.login(email, password)
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },
  register: async (firstName, lastName, email, password) => {
    set({ isLoading: true })
    try {
      await authService.register(firstName, lastName, email, password)
      const { user } = await authService.login(email, password)
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },
  logout: async () => {
    set({ isLoading: true })
    try {
      await authService.logout()
    } finally {
      setAccessToken(null)
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
  fetchMe: async () => {
    set({ isLoading: true })
    try {
      const { user } = await authService.me()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      setAccessToken(null)
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
