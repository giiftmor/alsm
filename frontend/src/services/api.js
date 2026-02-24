const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api'

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }))
        throw new Error(error.message || 'API request failed')
      }

      return await response.json()
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }

  // Dashboard endpoints
  async getDashboardStats() {
    return this.request('/dashboard/stats')
  }

  async getRecentActivity() {
    return this.request('/dashboard/activity')
  }

  async getSystemHealth() {
    return this.request('/dashboard/health')
  }

  // User endpoints
  async getUsers(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
    )
    const query = new URLSearchParams(cleanParams).toString()
    return this.request(`/users${query ? `?${query}` : ''}`)
  }

  async getUser(userId) {
    return this.request(`/users/${userId}`)
  }

  async getUserComparison(userId) {
    return this.request(`/users/${userId}/compare`)
  }

  async testUserMapping(userId) {
    return this.request(`/users/${userId}/test-mapping`, { method: 'POST' })
  }

  // Group endpoints
  async getGroups(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
    )
    const query = new URLSearchParams(cleanParams).toString()
    return this.request(`/groups${query ? `?${query}` : ''}`)
  }

  async getGroupComparison(groupId) {
    return this.request(`/groups/${groupId}/compare`)
  }

  // Schema endpoints
  async getFieldMappings() {
    return this.request('/schema/mappings')
  }

  async updateFieldMapping(mapping) {
    return this.request('/schema/mappings', {
      method: 'PUT',
      body: JSON.stringify(mapping),
    })
  }

  async validateMapping(mapping) {
    return this.request('/schema/validate', {
      method: 'POST',
      body: JSON.stringify(mapping),
    })
  }

  async testMapping(testData) {
    return this.request('/schema/test', {
      method: 'POST',
      body: JSON.stringify(testData),
    })
  }

  // Changes endpoints
  async getChanges(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
    )
    const query = new URLSearchParams(cleanParams).toString()
    return this.request(`/changes${query ? `?${query}` : ''}`)
  }

  async getPendingChanges() {
    return this.request('/changes/pending')
  }

  async approveChange(changeId, comment) {
    return this.request(`/changes/${changeId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    })
  }

  async rejectChange(changeId, reason) {
    return this.request(`/changes/${changeId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }
}

export const apiClient = new ApiClient()
