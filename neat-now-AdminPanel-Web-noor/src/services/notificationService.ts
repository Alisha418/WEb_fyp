import apiClient from './api';
import { getErrorMessage } from './api';

// ============================================
// TYPES
// ============================================
export interface Notification {
  notification_id: number;
  recipient_type: 'worker' | 'citizen' | 'admin';
  recipient_id: number;
  message: string;
  /** Human-readable title from API (serializer) */
  title?: string;
  /** Human-readable body from API — prefer over raw JSON `message` in admin UI */
  formatted_message?: string;
  type?: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationFilters {
  recipient_type?: string;
  recipient_id?: number;
  is_read?: boolean;
  page?: number;
  page_size?: number;
}

interface NotificationsListResponse {
  success: boolean;
  count: number;
  next?:  string;
  previous?: string;
  data: Notification[];
  results?:  Notification[];
}

interface NotificationActionResponse {
  success: boolean;
  message:  string;
}

// ============================================
// NOTIFICATION SERVICE
// ============================================
class NotificationService {
  /**
   * Get all notifications with optional filters
   */
  async getNotifications(filters?: NotificationFilters): Promise<NotificationsListResponse> {
    try {
      console.log('📋 Fetching notifications with filters:', filters);
      const response = await apiClient.get('/notifications/', { params: filters });
      console.log(`✅ Fetched notifications: `, response.data);
      
      // Handle different response formats
      const data = response.data;
      return {
        success:  true,
        count: data.count || data.data?. length || data.results?.length || 0,
        data: data.data || data.results || [],
        next: data.next,
        previous: data.previous,
      };
    } catch (error) {
      console.error('❌ Error fetching notifications:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Get single notification by ID
   */
  async getNotification(id:  number): Promise<Notification> {
    try {
      console.log(`📋 Fetching notification #${id}`);
      const response = await apiClient.get(`/notifications/${id}/`);
      return response.data. data || response.data;
    } catch (error) {
      console.error(`❌ Error fetching notification #${id}:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Mark specific notifications as read
   */
  async markAsRead(notificationIds: number[]): Promise<NotificationActionResponse> {
    try {
      console.log('✅ Marking notifications as read:', notificationIds);
      const response = await apiClient.post('/notifications/mark_read/', {
        notification_ids: notificationIds,
      });
      console.log('✅ Marked as read:', response.data);
      return response.data;
    } catch (error) {
      console. error('❌ Error marking as read:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a recipient
   */
  async markAllAsRead(recipientType: string, recipientId:  number): Promise<NotificationActionResponse> {
    try {
      console.log(`✅ Marking all as read for ${recipientType}: ${recipientId}`);
      const response = await apiClient.post('/notifications/mark_read/', {
        mark_all: true,
        recipient_type: recipientType,
        recipient_id: recipientId,
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error marking all as read:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(recipientType?: string, recipientId?:  number): Promise<number> {
    try {
      const params:  any = {};
      if (recipientType) params.recipient_type = recipientType;
      if (recipientId) params.recipient_id = recipientId;
      
      const response = await apiClient.get('/notifications/unread_count/', { params });
      return response.data.count || 0;
    } catch (error) {
      console.error('❌ Error fetching unread count:', getErrorMessage(error));
      return 0;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id:  number): Promise<NotificationActionResponse> {
    try {
      console.log(`🗑️ Deleting notification #${id}`);
      const response = await apiClient.delete(`/notifications/${id}/`);
      console.log('✅ Notification deleted');
      return { success: true, message: 'Notification deleted successfully' };
    } catch (error) {
      console.error(`❌ Error deleting notification #${id}:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Delete multiple notifications
   */
  async deleteNotifications(ids: number[]): Promise<NotificationActionResponse> {
    try {
      console.log(`🗑️ Deleting ${ids.length} notifications`);
      await Promise.all(ids. map(id => apiClient.delete(`/notifications/${id}/`)));
      return { success: true, message: `${ids.length} notifications deleted` };
    } catch (error) {
      console.error('❌ Error deleting notifications:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Send notification to a worker (convenience method)
   */
  async sendToWorker(workerId: number, title: string, body:  string): Promise<any> {
    try {
      console. log(`📤 Sending notification to worker #${workerId}`);
      const response = await apiClient.post(`/workers/${workerId}/notify/`, {
        title,
        body,
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error sending notification:', getErrorMessage(error));
      throw error;
    }
  }
}

export default new NotificationService();