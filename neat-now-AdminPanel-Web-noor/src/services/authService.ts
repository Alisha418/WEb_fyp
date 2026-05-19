import apiClient from './api';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface AdminData {
  admin_id:  number;
  email: string;
  name: string;
  role: string;
  created_at: string;
  last_login:  string | null;
  is_active: boolean;
}

interface LoginResponse {
  success: boolean;
  message:  string;
  data: {
    user: AdminData;
    access:  string;
    refresh: string;
  };
}

interface ProfileResponse {
  success: boolean;
  data: AdminData;
}

interface PasswordResetRequestResponse {
  success:  boolean;
  message: string;
  reset_link?:  string;
}

interface PasswordResetConfirmResponse {
  success: boolean;
  message:  string;
}

interface PasswordChangeResponse {
  success:  boolean;
  message: string;
}

// ✅ NEW: Token validation response
interface TokenValidationResponse {
  success: boolean;
  message: string;
}

interface ErrorResponse {
  success: boolean;
  message?:  string;
  error?: string;
  errors?: Record<string, string[]>;
}

// ============================================
// AUTH SERVICE CLASS
// ============================================

class AuthService {
  /**
   * Login admin user
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // Clear any existing tokens first
      this.logout();
      
      console.log('🔐 Attempting login:', email);
      
      const response = await apiClient.post<LoginResponse>('/admin/login/', { 
        email, 
        password 
      });
      
      console.log('📦 Login response:', response. data);
      
      if (response.data.success && response.data.data) {
        const { access, refresh, user } = response.data.data;
        
        // ✅ Validate response data
        if (!access || !refresh || !user) {
          console.error('❌ Invalid response structure:', response.data);
          throw new Error('Invalid login response from server');
        }
        
        if (!user.email || !user.name) {
          console.error('❌ Invalid user data:', user);
          throw new Error('Invalid user data from server');
        }
        
        // Store tokens and admin data
        this.setTokens(access, refresh);
        this.setAdminData(user);
        
        console.log('✅ Login successful:', user. email);
        console.log('✅ Stored admin data:', this.getAdminData());
      } else {
        console.error('❌ Login failed:', response.data);
        throw new Error(response.data.message || 'Login failed');
      }
      
      return response. data;
    } catch (error:  any) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response?.data);
      
      // Clear any partial data
      this.logout();
      
      throw error;
    }
  }

  /**
   * Get admin profile
   */
  async getProfile(): Promise<AdminData> {
    try {
      const response = await apiClient.get<ProfileResponse>('/admin/profile/');
      
      if (response.data.success && response.data.data) {
        this.setAdminData(response. data.data);
        return response.data.data;
      }
      
      throw new Error('Failed to fetch profile');
    } catch (error: any) {
      console.error('❌ Get profile error:', error);
      throw error;
    }
  }

  /**
   * Update admin profile
   */
  async updateProfile(data: { 
    name?: string; 
    role?: string; 
    is_active?: boolean 
  }): Promise<AdminData> {
    try {
      const response = await apiClient.put<ProfileResponse>('/admin/profile/', data);
      
      if (response.data.success && response.data.data) {
        this.setAdminData(response.data.data);
        return response. data.data;
      }
      
      throw new Error('Failed to update profile');
    } catch (error: any) {
      console.error('❌ Update profile error:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(
    oldPassword: string, 
    newPassword: string, 
    newPasswordConfirm: string
  ): Promise<PasswordChangeResponse> {
    try {
      const response = await apiClient.post<PasswordChangeResponse>(
        '/admin/password-change/', 
        {
          old_password: oldPassword,
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm
        }
      );
      
      // After successful password change, user should login again
      if (response.data.success) {
        this.logout();
      }
      
      return response. data;
    } catch (error: any) {
      console.error('❌ Change password error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<PasswordResetRequestResponse> {
    try {
      console.log('📧 Requesting password reset for:', email);
      
      const response = await apiClient. post<PasswordResetRequestResponse>(
        '/admin/password-reset/request/', 
        { email }
      );
      
      console.log('✅ Password reset request response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Password reset request error:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW:  Validate password reset token
   */
  async validateResetToken(token: string, uidb64: string): Promise<TokenValidationResponse> {
    try {
      console.log('🔍 Validating reset token:', { token, uidb64 });
      
      const response = await apiClient.post<TokenValidationResponse>(
        '/admin/password-reset/validate/', 
        {
          token,
          uidb64
        }
      );
      
      console.log('✅ Token validation response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Token validation error:', error);
      throw error;
    }
  }

  /**
   * ✅ UPDATED: Reset password with token (simplified parameters)
   */
  async resetPassword(
    token: string,
    uidb64: string,
    newPassword: string
  ): Promise<PasswordResetConfirmResponse> {
    try {
      console.log('🔐 Resetting password with token');
      
      const response = await apiClient.post<PasswordResetConfirmResponse>(
        '/admin/password-reset/confirm/', 
        {
          token,
          uidb64,
          new_password:  newPassword,
          new_password_confirm: newPassword  // Auto-confirm with same password
        }
      );
      
      console.log('✅ Password reset response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      throw error;
    }
  }

  /**
   * Confirm password reset (legacy method - keeping for backwards compatibility)
   */
  async confirmPasswordReset(
    uid: string,
    token: string,
    newPassword: string,
    newPasswordConfirm:  string
  ): Promise<PasswordResetConfirmResponse> {
    try {
      const response = await apiClient.post<PasswordResetConfirmResponse>(
        '/admin/password-reset/confirm/', 
        {
          uid,
          token,
          new_password: newPassword,
          new_password_confirm:  newPasswordConfirm
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Password reset confirm error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = this.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      console.log('🔄 Refreshing token...');
      
      const response = await apiClient. post<{ access:  string }>(
        '/token/refresh/', 
        { refresh: refreshToken }
      );
      
      const newAccessToken = response.data.access;
      
      if (!newAccessToken) {
        throw new Error('No access token in refresh response');
      }
      
      localStorage.setItem('access_token', newAccessToken);
      
      console.log('✅ Token refreshed');
      
      return newAccessToken;
    } catch (error: any) {
      console.error('❌ Token refresh error:', error);
      this.logout();
      throw error;
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    console.log('👋 Logging out...');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('admin_data');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    try {
      const hasToken = !!this.getAccessToken();
      const hasData = !!this.getAdminData();
      const isValid = hasToken && hasData;
      
      console.log('🔍 Auth check:', { hasToken, hasData, isValid });
      
      return isValid;
    } catch (error) {
      console.error('❌ Auth check error:', error);
      return false;
    }
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Get admin data
   * ✅ FIXED: Safe JSON parsing with validation
   */
  getAdminData(): AdminData | null {
    try {
      const data = localStorage.getItem('admin_data');
      
      // Check for null, undefined, or empty string
      if (!data || data === 'undefined' || data === 'null' || data. trim() === '') {
        console.warn('⚠️ No admin data in localStorage');
        return null;
      }
      
      const parsed = JSON.parse(data);
      
      // Validate parsed data
      if (!parsed || typeof parsed !== 'object') {
        console.error('❌ Invalid admin data format');
        localStorage.removeItem('admin_data');
        return null;
      }
      
      // Check required fields
      if (!parsed.email) {
        console.error('❌ Admin data missing required fields:', parsed);
        localStorage.removeItem('admin_data');
        return null;
      }
      
      return parsed as AdminData;
    } catch (error) {
      console.error('❌ Error parsing admin data:', error);
      // Clear corrupted data
      localStorage.removeItem('admin_data');
      return null;
    }
  }

  /**
   * Set tokens in localStorage
   */
  private setTokens(accessToken: string, refreshToken: string): void {
    if (!accessToken || !refreshToken) {
      console.error('❌ Invalid tokens provided');
      throw new Error('Invalid tokens');
    }
    
    console.log('💾 Storing tokens...');
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    console.log('✅ Tokens stored');
  }

  /**
   * Set admin data in localStorage
   * ✅ FIXED:  Validate data before storing
   */
  private setAdminData(admin: AdminData): void {
    if (!admin || typeof admin !== 'object') {
      console.error('❌ Invalid admin data type:', typeof admin);
      throw new Error('Invalid admin data');
    }
    
    if (!admin.email) {
      console.error('❌ Admin data missing required fields:', admin);
      throw new Error('Admin data missing required fields');
    }
    
    console.log('💾 Storing admin data:', admin);
    localStorage.setItem('admin_data', JSON.stringify(admin));
    console.log('✅ Admin data stored');
  }

  /**
   * Get admin name
   */
  getAdminName(): string {
    return this.getAdminData()?.name || 'Admin';
  }

  /**
   * Get admin email
   */
  getAdminEmail(): string {
    return this.getAdminData()?.email || '';
  }

  /**
   * Get admin role
   */
  getAdminRole(): string {
    return this.getAdminData()?.role || 'admin';
  }

  /**
   * Check if super admin
   */
  isSuperAdmin(): boolean {
    return this.getAdminData()?.role === 'super_admin';
  }

  /**
   * Check if moderator
   */
  isModerator(): boolean {
    return this.getAdminData()?.role === 'moderator';
  }

  /**
   * Get admin ID
   */
  getAdminId(): number | null {
    return this.getAdminData()?.admin_id || null;
  }

  /**
   * Check if admin is active
   */
  isActive(): boolean {
    return this.getAdminData()?.is_active || false;
  }

  /**
   * Get last login time
   */
  getLastLogin(): string | null {
    return this.getAdminData()?.last_login || null;
  }

  /**
   * Get formatted role name
   */
  getRoleDisplay(): string {
    const role = this.getAdminRole();
    switch (role) {
      case 'super_admin': 
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'moderator':  
        return 'Moderator';
      default:  
        return role;
    }
  }

  /**
   * Clear all auth data (use for logout or error recovery)
   */
  clearAll(): void {
    this.logout();
  }
}

// Export singleton instance
export default new AuthService();

// Export types
export type {
  AdminData,
  LoginResponse,
  ProfileResponse,
  PasswordChangeResponse,
  PasswordResetRequestResponse,
  PasswordResetConfirmResponse,
  TokenValidationResponse,
  ErrorResponse
};