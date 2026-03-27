// OHIP API Headers Configuration
// Different endpoints may require different headers

const OHIP_HEADERS = {
  // Standard headers for all requests
  STANDARD: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // OHIP-specific headers
  OHIP_REQUIRED: {
    'x-app-key': '', // Will be set from environment
    'x-hotelid': '', // Will be set from environment
    'Authorization': '', // Will be set from OAuth token
  },
  
  // Optional headers
  OPTIONAL: {
    'x-request-id': '', // UUID for request tracking
    'x-externalsystem': '', // External system code
    'x-originating-application': '', // Originating application
    'Accept-Language': 'en-US' // Language preference
  }
};

// Endpoint-specific header requirements
const ENDPOINT_HEADERS = {
  // Profile operations - require all standard OHIP headers
  'GET:/profiles': {
    required: ['x-app-key', 'x-hotelid', 'Authorization'],
    optional: ['x-request-id', 'x-externalsystem', 'Accept-Language']
  },
  
  'GET:/profiles/{profileId}': {
    required: ['x-app-key', 'x-hotelid', 'Authorization'],
    optional: ['x-request-id', 'x-externalsystem', 'Accept-Language'],
    // Additional headers for detailed profile fetch
    fetchInstructions: ['Profile', 'Communication', 'Preference', 'Indicators', 'Membership']
  },
  
  'PUT:/profiles/{profileId}': {
    required: ['x-app-key', 'x-hotelid', 'Authorization'],
    optional: ['x-request-id', 'x-externalsystem', 'x-originating-application']
  },
  
  'DELETE:/profiles/{profileId}': {
    required: ['x-app-key', 'x-hotelid', 'Authorization'],
    optional: ['x-request-id', 'x-externalsystem']
  },
  
  // Merge operations - require additional tracking
  'POST:/profiles/{survivorProfileId}/merges': {
    required: ['x-app-key', 'x-hotelid', 'Authorization'],
    optional: ['x-request-id', 'x-externalsystem', 'x-originating-application'],
    // Merge operations should always have request tracking
    alwaysInclude: ['x-request-id']
  },
  
  'GET:/profiles/{survivorProfileId}/merges/snapshot': {
    required: ['x-app-key', 'x-hotelid', 'Authorization'],
    optional: ['x-request-id', 'x-externalsystem']
  },
  
  // Company operations
  'GET:/companies': {
    required: ['x-app-key', 'x-hotelid', 'Authorization'],
    optional: ['x-request-id', 'x-externalsystem', 'Accept-Language']
  },
  
  'POST:/companies': {
    required: ['x-app-key', 'x-hotelid', 'Authorization'],
    optional: ['x-request-id', 'x-externalsystem', 'x-originating-application']
  },
  
  'GET:/companies/{corporateID}': {
    required: ['x-app-key', 'x-hotelid', 'Authorization'],
    optional: ['x-request-id', 'x-externalsystem', 'Accept-Language']
  },
  
  // Duplicate subscriptions
  'GET:/duplicateExternalSubscriptions': {
    required: ['x-app-key', 'x-hotelid', 'Authorization'],
    optional: ['x-request-id', 'x-externalsystem']
  },
  
  'GET:/duplicateOPERASubscriptions': {
    required: ['x-app-key', 'x-hotelid', 'Authorization'],
    optional: ['x-request-id', 'x-externalsystem']
  }
};

// Header validation patterns
const HEADER_PATTERNS = {
  'x-app-key': /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}$/,
  'x-request-id': /^~*[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  'x-hotelid': /^[A-Z0-9_]{1,20}$/,
  'x-externalsystem': /^.{1,40}$/,
  'Accept-Language': /^[a-z]{2}-[A-Z]{2}$/
};

module.exports = {
  OHIP_HEADERS,
  ENDPOINT_HEADERS,
  HEADER_PATTERNS
};
