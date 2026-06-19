import { apiClient, unwrapApiResponse } from './apiClient.ts'
import type { ApiResponse, LessonProgress, UserBadge } from '../types/api.ts'

export interface LessonProgressInput {
  quizScore?: number
  quizTotal?: number
}

export interface LessonProgressResult {
  progress: LessonProgress
  newBadges: string[]
}

export const learnProgressService = {
  getProgress: async (topic: string) => {
    const response = await apiClient.get<ApiResponse<LessonProgress[]>>(
      `/api/learn/${topic}/progress`,
    )
    return unwrapApiResponse(response.data)
  },
  completeLesson: async (topic: string, lessonId: string, input: LessonProgressInput) => {
    const response = await apiClient.post<ApiResponse<LessonProgressResult>>(
      `/api/learn/${topic}/${lessonId}/progress`,
      input,
    )
    return unwrapApiResponse(response.data)
  },
  getBadges: async () => {
    const response = await apiClient.get<ApiResponse<UserBadge[]>>('/api/learn/badges')
    return unwrapApiResponse(response.data)
  },
  getBadgeDefinitions: async () => {
    const response = await apiClient.get<ApiResponse<string[]>>('/api/learn/badge-definitions')
    return unwrapApiResponse(response.data)
  },
}
