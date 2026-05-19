import apiClient from './api';

class DashboardService {
  async getDashboardStats() {
    const response = await apiClient.get('/dashboard/stats/');
    return response. data;
  }

  async getActivities(limit: number = 7, days: number = 7) {
    const response = await apiClient.get('/dashboard/activities/', {
      params: { limit, days },
    });
    return response.data;
  }

  async getTopCitizens(limit:  number = 5) {
    const response = await apiClient.get('/dashboard/top-citizens/', {
      params:  { limit }
    });
    return response.data;
  }

  async getTopWorkers(limit: number = 5) {
    const response = await apiClient.get('/dashboard/top-workers/', {
      params: { limit }
    });
    return response.data;
  }

  async getTrendData(days: number = 7) {
    const response = await apiClient.get('/dashboard/trends/', {
      params: { days }
    });
    return response.data;
  }

  async getStatusDistribution() {
    const response = await apiClient.get('/dashboard/status-distribution/');
    return response.data;
  }

  /** days=0 → all reports (no date filter). */
  async getZoneStats(days: number = 0) {
    const response = await apiClient.get('/dashboard/zone-stats/', {
      params: { days },
    });
    return response.data;
  }
}

export default new DashboardService();