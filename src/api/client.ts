import axios, { AxiosInstance, AxiosError } from 'axios'
import { useAuthStore } from '../store/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/v1'

class ApiClient {
  private client: AxiosInstance
  
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Request interceptor: add auth token
    this.client.interceptors.request.use((config) => {
      const { tokens } = useAuthStore.getState()
      if (tokens) {
        config.headers.Authorization = `Bearer ${tokens.access_token}`
      }
      return config
    })
    
    // Response interceptor: handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }
  
  get<T>(url: string, config?: any) {
    return this.client.get<T>(url, config)
  }
  
  post<T>(url: string, data?: any, config?: any) {
    return this.client.post<T>(url, data, config)
  }
  
  patch<T>(url: string, data?: any, config?: any) {
    return this.client.patch<T>(url, data, config)
  }
  
  delete<T>(url: string, config?: any) {
    return this.client.delete<T>(url, config)
  }
}

export const apiClient = new ApiClient()