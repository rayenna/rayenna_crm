import axios from 'axios';

// Get API base URL from environment variable
// Falls back to empty string (relative URLs) for local development with Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Create axios instance with base URL
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
