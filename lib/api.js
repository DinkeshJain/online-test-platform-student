import axios from 'axios';

// Configuration for backend URLs
const LOCAL_API_URL = 'http://localhost:5000/api';
const DEPLOYED_API_URL = import.meta.env.VITE_API_URL || 'https://online-test-platform-server-1q1h.onrender.com/api';

// Check if localhost is available
const checkLocalhost = async () => {
  try {
    console.log('🔍 Testing localhost availability...');
    const response = await fetch(`${LOCAL_API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    const isAvailable = response.ok;
    console.log(`${isAvailable ? '✅' : '❌'} Localhost test result:`, isAvailable);
    return isAvailable;
  } catch (error) {
    console.log('❌ Localhost test failed:', error.message);
    return false;
  }
};

// Determine API URL based on localhost availability
const getApiUrl = async () => {
  // Always try localhost first in development
  if (import.meta.env.DEV) {
    const isLocalAvailable = await checkLocalhost();
    if (isLocalAvailable) {
      console.log('✅ Using localhost API:', LOCAL_API_URL);
      return LOCAL_API_URL;
    } else {
      console.log('⚠️ Localhost unavailable, falling back to deployed API:', DEPLOYED_API_URL);
      return DEPLOYED_API_URL;
    }
  }
  
  // In production, still check localhost but prioritize deployed URL
  const isLocalAvailable = await checkLocalhost();
  if (isLocalAvailable) {
    console.log('✅ Localhost available in production, using:', LOCAL_API_URL);
    return LOCAL_API_URL;
  }
  
  console.log('🌐 Using deployed API URL:', DEPLOYED_API_URL);
  return DEPLOYED_API_URL;
};

// Initialize API URL (will be set asynchronously)
let API_BASE_URL = DEPLOYED_API_URL; // Default fallback
let isConfiguring = false;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Function to ensure API is configured before making requests
const ensureApiConfigured = async () => {
  if (isConfiguring) {
    // Wait for current configuration to complete
    while (isConfiguring) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return;
  }
  
  if (api.defaults.baseURL === DEPLOYED_API_URL) {
    // Try to configure with localhost if not already done
    isConfiguring = true;
    try {
      const correctUrl = await getApiUrl();
      api.defaults.baseURL = correctUrl;
      API_BASE_URL = correctUrl;
      console.log(`🚀 API configured with URL: ${correctUrl}`);
    } catch (error) {
      console.error('Failed to configure API URL:', error);
      console.log(`📡 Using fallback URL: ${API_BASE_URL}`);
    } finally {
      isConfiguring = false;
    }
  }
};

// Asynchronously set the correct API URL
(async () => {
  try {
    const correctUrl = await getApiUrl();
    if (api.defaults.baseURL !== correctUrl) {
      api.defaults.baseURL = correctUrl;
      API_BASE_URL = correctUrl;
      console.log(`🚀 API initially configured with URL: ${correctUrl}`);
    }
  } catch (error) {
    console.error('Failed to configure API URL:', error);
    console.log(`📡 Using fallback URL: ${API_BASE_URL}`);
  }
})();

// Add token to requests if available and ensure API is configured
api.interceptors.request.use(async (config) => {
  // Ensure API is properly configured before making request
  await ensureApiConfigured();
  
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration and network errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle network errors - try to switch to backup URL
    if (!error.response && (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message.includes('timeout'))) {
      console.error('❌ Network error with current URL:', api.defaults.baseURL);
      
      // Try to switch between localhost and deployed URL
      const currentUrl = api.defaults.baseURL;
      const backupUrl = currentUrl === LOCAL_API_URL ? DEPLOYED_API_URL : LOCAL_API_URL;
      
      try {
        // Test the backup URL
        const testResponse = await fetch(`${backupUrl}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        
        if (testResponse.ok) {
          console.log('🔄 Switching to backup URL:', backupUrl);
          api.defaults.baseURL = backupUrl;
          
          // Retry the original request with the new URL
          const retryConfig = { ...error.config, baseURL: backupUrl };
          return api.request(retryConfig);
        }
      } catch (switchError) {
        console.error('❌ Backup URL also failed:', switchError.message);
      }
    }

    return Promise.reject(error);
  }
);

// Function to get current backend info
api.getBackendInfo = () => {
  return {
    currentUrl: api.defaults.baseURL,
    isLocal: api.defaults.baseURL === LOCAL_API_URL,
    isDeployed: api.defaults.baseURL === DEPLOYED_API_URL,
    environment: import.meta.env.MODE,
    viteApiUrl: import.meta.env.VITE_API_URL,
    localUrl: LOCAL_API_URL,
    deployedUrl: DEPLOYED_API_URL
  };
};

// Function to manually switch API URL
api.switchToLocalhost = async () => {
  try {
    const isAvailable = await checkLocalhost();
    if (isAvailable) {
      api.defaults.baseURL = LOCAL_API_URL;
      API_BASE_URL = LOCAL_API_URL;
      console.log('✅ Switched to localhost:', LOCAL_API_URL);
      return true;
    } else {
      console.log('❌ Localhost not available');
      return false;
    }
  } catch (error) {
    console.error('Failed to switch to localhost:', error);
    return false;
  }
};

// Function to switch to deployed URL
api.switchToDeployed = () => {
  api.defaults.baseURL = DEPLOYED_API_URL;
  API_BASE_URL = DEPLOYED_API_URL;
  console.log('🌐 Switched to deployed URL:', DEPLOYED_API_URL);
};

// Function to force reconfiguration
api.reconfigure = async () => {
  isConfiguring = false; // Reset flag
  await ensureApiConfigured();
  return api.getBackendInfo();
};

export default api;

