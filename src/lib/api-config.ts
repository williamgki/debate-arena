// API configuration for frontend-backend communication
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';

export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
  return fetch(url, options);
};

export { API_BASE_URL };