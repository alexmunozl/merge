// OHIP API Scopes Configuration
// Different endpoints may require different scopes

const OHIP_SCOPES = {
  // Profile management scopes
  PROFILES_READ: 'profiles.read',
  PROFILES_WRITE: 'profiles.write',
  PROFILES_DELETE: 'profiles.delete',
  
  // Merge operations scopes
  MERGES_EXECUTE: 'merges.execute',
  MERGES_READ: 'merges.read',
  
  // Search and query scopes
  SEARCH_READ: 'search.read',
  
  // Full access scope (if available)
  FULL_ACCESS: 'full_access'
};

// Default scopes to request during OAuth authentication
const DEFAULT_SCOPES = [
  OHIP_SCOPES.PROFILES_READ,
  OHIP_SCOPES.PROFILES_WRITE,
  OHIP_SCOPES.MERGES_EXECUTE,
  OHIP_SCOPES.MERGES_READ,
  OHIP_SCOPES.SEARCH_READ
];

// Endpoint-specific scope requirements
const ENDPOINT_SCOPES = {
  // Profile operations
  'GET:/profiles': [OHIP_SCOPES.PROFILES_READ, OHIP_SCOPES.SEARCH_READ],
  'GET:/profiles/{profileId}': [OHIP_SCOPES.PROFILES_READ],
  'PUT:/profiles/{profileId}': [OHIP_SCOPES.PROFILES_WRITE],
  'DELETE:/profiles/{profileId}': [OHIP_SCOPES.PROFILES_DELETE],
  
  // Merge operations
  'POST:/profiles/{survivorProfileId}/merges': [OHIP_SCOPES.MERGES_EXECUTE],
  'GET:/profiles/{survivorProfileId}/merges/snapshot': [OHIP_SCOPES.MERGES_READ],
  
  // Company operations
  'GET:/companies': [OHIP_SCOPES.PROFILES_READ],
  'POST:/companies': [OHIP_SCOPES.PROFILES_WRITE],
  'GET:/companies/{corporateID}': [OHIP_SCOPES.PROFILES_READ],
  
  // Duplicate subscriptions
  'GET:/duplicateExternalSubscriptions': [OHIP_SCOPES.PROFILES_READ],
  'GET:/duplicateOPERASubscriptions': [OHIP_SCOPES.PROFILES_READ]
};

module.exports = {
  OHIP_SCOPES,
  DEFAULT_SCOPES,
  ENDPOINT_SCOPES
};
