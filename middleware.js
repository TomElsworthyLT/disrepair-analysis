// middleware.js
const { rateLimit } = require('./rate-limiter');

/**
 * Validate API key middleware
 * Verifies that requests have a valid API key, except for frontend requests
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function validateApiKey(req, res, next) {
  // Check for the custom frontend header
  const isFrontendRequest = req.headers['x-lexiotech-frontend'] === 'true';
  
  // For usage tracking
  const sourceType = isFrontendRequest ? 'frontend' : 'external-api';
  req.sourceType = sourceType;
  
  // Log usage
  console.log(`API Request: ${req.path} | Source: ${sourceType} | Time: ${new Date().toISOString()}`);
  
  // If it's a frontend request, bypass API key check
  if (isFrontendRequest) {
    req.client = { name: 'Frontend User', clientId: 'frontend' };
    return next();
  }
  
  // For direct API access, require API key
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Unauthorised',
      message: 'API key is required for direct API access. Please include an X-API-Key header.'
    });
  }
  
  try {
    // Parse client information from environment variable
    const clientsData = JSON.parse(process.env.CLIENT_API_KEYS || '{}');
    const clientInfo = clientsData.keys?.[apiKey];
    
    // Validate the key
    if (!clientInfo) {
      return res.status(401).json({ 
        error: 'Unauthorised',
        message: 'Invalid API key'
      });
    }
    
    // Check if key is active
    if (clientInfo.active === false) {
      return res.status(401).json({ 
        error: 'Unauthorised',
        message: 'API key is inactive'
      });
    }
    
    // Add client info to request for use in API handlers
    req.client = clientInfo;
    
    // Continue to the main handler
    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Error processing authentication'
    });
  }
}

module.exports = { validateApiKey, rateLimit };