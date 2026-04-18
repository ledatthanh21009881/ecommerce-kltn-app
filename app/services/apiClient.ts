import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"
import { authService } from "./authService"

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

class ApiClient {
  private refreshPromise: Promise<string> | null = null

  // Get base URL dynamically from authService
  private async getBaseURL(): Promise<string> {
    return await authService.getApiBaseUrl()
  }

  /**
   * Get access token from AsyncStorage
   */
  private async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem("authToken")
  }

  /**
   * Get refresh token from AsyncStorage
   */
  private async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem("refreshToken")
  }

  /**
   * Check if error message indicates token error
   */
  private isTokenError(message: string): boolean {
    const lowerMessage = message.toLowerCase()
    return (
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('expired') ||
      lowerMessage.includes('token') ||
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('authentication')
    )
  }

  /**
   * Refresh access token using refresh token (with queue to prevent multiple calls)
   */
  private async refreshAccessToken(): Promise<string> {
    // If already refreshing, wait for that promise
    if (this.refreshPromise) {
      console.log('[ApiClient] Token refresh already in progress, waiting...')
      return await this.refreshPromise
    }

    // Start new refresh
    this.refreshPromise = (async () => {
      try {
        console.log('[ApiClient] Refreshing access token...')
        const { token } = await authService.refreshToken()
        console.log('[ApiClient] Token refreshed successfully')
        return token
      } catch (error) {
        console.error('[ApiClient] Token refresh failed:', error)
        // If refresh fails, clear tokens
        await AsyncStorage.removeItem("authToken")
        await AsyncStorage.removeItem("refreshToken")
        await AsyncStorage.removeItem("userData")
        throw error
      } finally {
        // Clear refresh promise
        this.refreshPromise = null
      }
    })()

    return await this.refreshPromise
  }

  /**
   * Make authenticated request with automatic token refresh
   */
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options

    // Build full URL
    const baseURL = await this.getBaseURL()
    const url = endpoint.startsWith("http") ? endpoint : `${baseURL}${endpoint}`

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(fetchOptions.headers as Record<string, string>),
    }

    // Add authorization header if not skipped
    if (!skipAuth) {
      const token = await this.getToken()
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
    }

    try {
      // Make request
      let response: Response
      try {
        response = await fetch(url, {
          ...fetchOptions,
          headers,
        })
      } catch (fetchError: any) {
        // If network error in dev mode, clear cache and retry with default IP
        if (__DEV__ && (fetchError.message?.includes('Network request failed') || 
            fetchError.message?.includes('Failed to fetch') ||
            fetchError.name === 'TypeError')) {
          console.log('[ApiClient] Network error detected, clearing cache and retrying...')
          await AsyncStorage.removeItem("apiBaseUrl")
          
          // Retry with fresh base URL
          const newBaseURL = await this.getBaseURL()
          const newUrl = endpoint.startsWith("http") ? endpoint : `${newBaseURL}${endpoint}`
          console.log('[ApiClient] Retrying with new URL:', newUrl)
          
          response = await fetch(newUrl, {
            ...fetchOptions,
            headers,
          })
        } else {
          throw fetchError
        }
      }

      // Check if response indicates token error (401, 403)
      const isTokenErrorByStatus = !skipAuth && (response.status === 401 || response.status === 403)

      // If token error by status, try to refresh token and retry
      if (isTokenErrorByStatus) {
        try {
          console.log('[ApiClient] Token error detected (status ' + response.status + '), refreshing token...')
          
          // Refresh token
          const newToken = await this.refreshAccessToken()

          // Retry request with new token
          const retryHeaders: Record<string, string> = {
            ...headers,
            Authorization: `Bearer ${newToken}`,
          }

          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers: retryHeaders,
          })

          // Parse retry response
          const retryData = await retryResponse.json().catch(() => ({}))
          
          if (!retryResponse.ok) {
            // If still fails after refresh, check if it's still token error
            const isStillTokenError = 
              retryResponse.status === 401 || 
              retryResponse.status === 403 ||
              (retryData.message && this.isTokenError(retryData.message))
            
            if (isStillTokenError) {
              console.error('[ApiClient] Token refresh failed, still getting token error')
              throw new Error("Session expired. Please login again.")
            }
            
            throw new Error(retryData.message || `HTTP error! status: ${retryResponse.status}`)
          }

          console.log('[ApiClient] Request retried successfully after token refresh')
          return retryData
        } catch (refreshError: any) {
          // If refresh fails, throw error
          console.error('[ApiClient] Token refresh failed:', refreshError)
          throw new Error(refreshError.message || "Session expired. Please login again.")
        }
      }

      // Parse response body
      const responseData = await response.json().catch(() => ({}))

      // Check if response message indicates token error (even if status is 200)
      const isTokenErrorByMessage = !skipAuth && responseData.message && this.isTokenError(responseData.message)

      // If token error by message, try to refresh token and retry
      if (isTokenErrorByMessage) {
        try {
          console.log('[ApiClient] Token error detected in message, refreshing token...', {
            message: responseData.message
          })
          
          // Refresh token
          const newToken = await this.refreshAccessToken()

          // Retry request with new token
          const retryHeaders: Record<string, string> = {
            ...headers,
            Authorization: `Bearer ${newToken}`,
          }

          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers: retryHeaders,
          })

          // Parse retry response
          const retryData = await retryResponse.json().catch(() => ({}))
          
          if (!retryResponse.ok) {
            // If still fails after refresh, check if it's still token error
            const isStillTokenError = 
              retryResponse.status === 401 || 
              retryResponse.status === 403 ||
              (retryData.message && this.isTokenError(retryData.message))
            
            if (isStillTokenError) {
              console.error('[ApiClient] Token refresh failed, still getting token error')
              throw new Error("Session expired. Please login again.")
            }
            
            throw new Error(retryData.message || `HTTP error! status: ${retryResponse.status}`)
          }

          console.log('[ApiClient] Request retried successfully after token refresh')
          return retryData
        } catch (refreshError: any) {
          // If refresh fails, throw error
          console.error('[ApiClient] Token refresh failed:', refreshError)
          throw new Error(refreshError.message || "Session expired. Please login again.")
        }
      }

      // Check if response is ok
      if (!response.ok) {
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`)
      }

      // Return parsed response
      return responseData
    } catch (error: any) {
      // If error is already a proper Error object with message, throw it
      if (error.message && error instanceof Error) {
        throw error
      }
      // Otherwise, wrap in new Error
      throw new Error(error.message || "Network error. Please check your connection.")
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    })
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    })
  }
}

export const apiClient = new ApiClient()

