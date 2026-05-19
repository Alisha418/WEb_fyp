// Utility to clear all auth data
export const clearAuthStorage = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('admin_data');
  console.log('✅ Auth storage cleared');
};

// Call this once to fix the issue
if (typeof window !== 'undefined') {
  clearAuthStorage();
}