/**
 * API Router with Versioning Support
 * Main router that handles API versioning and routes distribution
 */

const express = require('express');
const { logger } = require('../config/logger');

const router = express.Router();

/**
 * API Version Detection Middleware
 */
const detectApiVersion = (req, res, next) => {
  // Check for version in header
  const headerVersion = req.headers['api-version'] || req.headers['x-api-version'];
  
  // Check for version in URL path
  const pathVersion = req.path.match(/^\/v(\d+)\//)?.[1];
  
  // Check for version in query parameter
  const queryVersion = req.query.version || req.query.v;
  
  // Priority: URL path > Header > Query > Default
  const version = pathVersion || headerVersion || queryVersion || '1';
  
  // Validate version
  const supportedVersions = ['1', '2'];
  const apiVersion = supportedVersions.includes(version) ? version : '1';
  
  // Set version information
  req.apiVersion = apiVersion;
  req.isLatestVersion = apiVersion === '2';
  req.versionSource = pathVersion ? 'path' : headerVersion ? 'header' : queryVersion ? 'query' : 'default';
  
  // Add version header to response
  res.setHeader('API-Version', apiVersion);
  res.setHeader('API-Version-Source', req.versionSource);
  res.setHeader('API-Latest-Version', '2');
  
  next();
};

/**
 * Deprecation Warning Middleware
 */
const deprecationWarning = (req, res, next) => {
  if (req.apiVersion === '1') {
    const deprecationMessage = 'API v1 is deprecated. Please migrate to v2. See https://docs.forten.com/api/migration';
    const deprecationDate = '2024-12-31'; // Example deprecation date
    const sunsetDate = '2025-06-30'; // Example sunset date
    
    // Add deprecation headers
    res.setHeader('Deprecation', `date="${deprecationDate}"`);
    res.setHeader('Sunset', sunsetDate);
    res.setHeader('Link', '<https://docs.forten.com/api/v2>; rel="successor-version"');
    res.setHeader('Warning', `299 - "Deprecated API" "${deprecationMessage}"`);
    
    // Log deprecation usage
    logger.warn('Deprecated API v1 usage', {
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      versionSource: req.versionSource
    });
  }
  
  next();
};

/**
 * Rate Limiting by Version
 */
const versionRateLimit = (req, res, next) => {
  // V1 has stricter rate limits due to deprecation
  if (req.apiVersion === '1') {
    res.setHeader('X-RateLimit-Version-Notice', 'v1 has reduced rate limits');
  }
  
  next();
};

/**
 * Response Transformation Middleware
 */
const responseTransform = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to add version metadata
  res.json = function(data) {
    const versionedResponse = {
      ...data,
      _meta: {
        ...(data._meta || {}),
        apiVersion: req.apiVersion,
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    };
    
    // Add version-specific transformations
    if (req.apiVersion === '1') {
      // V1 compatibility transformations
      versionedResponse._deprecated = true;
      versionedResponse._migration_info = {
        message: 'This API version is deprecated',
        migration_guide: 'https://docs.forten.com/api/migration',
        sunset_date: '2025-06-30'
      };
    }
    
    return originalJson.call(this, versionedResponse);
  };
  
  next();
};

// Apply version detection and middleware
router.use(detectApiVersion);
router.use(deprecationWarning);
router.use(versionRateLimit);
router.use(responseTransform);

// Version-specific routers
const v1Routes = require('./v1');
const v2Routes = require('./v2');

// Route to version-specific handlers
router.use('/v1', v1Routes);
router.use('/v2', v2Routes);

// Default routing (no version specified - defaults to v1 with extra warnings)
router.use('/', (req, res, next) => {
  if (!req.path.startsWith('/v1') && !req.path.startsWith('/v2')) {
    // If no version specified in path, route to appropriate version based on detected version
    if (req.apiVersion === '2') {
      return v2Routes(req, res, next);
    } else {
      // Default to v1 but add extra deprecation warning
      res.setHeader('X-Migration-Required', 'true');
      res.setHeader('X-Default-Version-Notice', 'No version specified, defaulting to v1. Please specify version explicitly.');
      return v1Routes(req, res, next);
    }
  }
  next();
});

// API version information endpoint
router.get('/versions', (req, res) => {
  res.json({
    success: true,
    data: {
      current: req.apiVersion,
      latest: '2',
      supported: ['1', '2'],
      deprecated: ['1'],
      versions: {
        '1': {
          status: 'deprecated',
          deprecation_date: '2024-12-31',
          sunset_date: '2025-06-30',
          documentation: 'https://docs.forten.com/api/v1',
          migration_guide: 'https://docs.forten.com/api/migration'
        },
        '2': {
          status: 'current',
          released: '2024-01-01',
          documentation: 'https://docs.forten.com/api/v2',
          features: [
            'Enhanced security',
            'Improved performance',
            'Better error handling',
            'Extended functionality'
          ]
        }
      }
    }
  });
});

// Health check with version info
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    version: req.apiVersion,
    timestamp: new Date().toISOString(),
    service: 'FORTEN API'
  });
});

// Catch-all for unsupported endpoints
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint not found in API v${req.apiVersion}`,
      path: req.path,
      method: req.method,
      available_versions: ['1', '2'],
      documentation: `https://docs.forten.com/api/v${req.apiVersion}`
    },
    _meta: {
      apiVersion: req.apiVersion,
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

module.exports = router;