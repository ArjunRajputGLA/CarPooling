// src/services/api.js

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://carpooling-9w8j.onrender.com';

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Handle API response
 * @param {Response} response 
 * @returns {Promise<any>}
 */
const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  
  const data = isJson ? await response.json() : await response.text();
  
  if (!response.ok) {
    const errorMessage = (data && data.error) || data.message || response.statusText;
    throw new ApiError(errorMessage, response.status);
  }
  
  return data;
};

export const api = {
  auth: {
    /**
     * Login user
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{user: object, session: object}>}
     */
    login: async (email, password) => {
      try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        
        return await handleResponse(response);
      } catch (error) {
        if (error.name === 'ApiError') {
          throw error;
        }
        // Handle network errors
        throw new Error('Network request failed. Please check your internet connection.');
      }
    },

    /**
     * Sign up user
     * @param {string} email 
     * @param {string} password 
     * @param {object} data - Additional user metadata (full_name, phone, role)
     * @returns {Promise<{user: object, session: object}>}
     */
    signup: async (email, password, data = {}) => {
      try {
        const response = await fetch(`${API_URL}/api/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email, 
            password,
            data // Pass metadata to backend
          }),
        });
        
        return await handleResponse(response);
      } catch (error) {
        if (error.name === 'ApiError') {
          throw error;
        }
        throw new Error('Network request failed. Please check your internet connection.');
      }
    }
  }
};
