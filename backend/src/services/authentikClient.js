import fetch from 'node-fetch'
import { logger } from '../utils/logger.js'
import dotenv from 'dotenv'
dotenv.config()

export class AuthentikClient {
  constructor() {
    this.baseUrl = process.env.AUTHENTIK_URL || 'http://localhost:9000'
    this.apiToken = process.env.AUTHENTIK_TOKEN

    if (!this.apiToken) {
      throw new Error('AUTHENTIK_TOKEN environment variable is required')
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`

    const config = {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: response.statusText
        }))
        throw new Error(error.message || `Authentik API error: ${response.status}`)
      }

      if (response.status === 204) {
        return { success: true } // No content response
      }

      return await response.json()
    } catch (error) {
      logger.error('Authentik API error:', error)
      throw error
    }
  }

  async getUsers(params = {}) {
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    if (params.is_active !== undefined) searchParams.set('is_active', params.is_active)

    const query = searchParams.toString()
    const endpoint = `/api/v3/core/users/${query ? `?${query}` : ''}`

    const data = await this.request(endpoint)
    return data.results || []
  }

  async getUser(userId) {
    return this.request(`/api/v3/core/users/${userId}/`)
  }

  async createUser(userData) {
    return this.request('/api/v3/core/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async updateUser(userId, updates) {
    return this.request(`/api/v3/core/users/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  async setPassword(userId, password) {
    return this.request(`/api/v3/core/users/${userId}/set_password/`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  }

  async getUserByUsername(username) {
    const users = await this.getUsers({ search: username })
    return users.find(u => u.username === username) || null
  }

  async deleteUser(userId) {
    return this.request(`/api/v3/core/users/${userId}/`, {
      method: 'DELETE',
    })
  }

  async getGroups(params = {}) {
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)

    const query = searchParams.toString()
    const endpoint = `/api/v3/core/groups/${query ? `?${query}` : ''}`

    const data = await this.request(endpoint)
    return data.results || []
  }

  async getGroup(groupId) {
    return this.request(`/api/v3/core/groups/${groupId}/`)
  }
}

export const authentikClient = new AuthentikClient()
