const config = require('./index');
const logger = require('../utils/logger');

class OHIPConfig {
  constructor() {
    this.baseUrl = config.ohip.baseUrl;
    this.clientId = config.ohip.clientId;
    this.clientSecret = config.ohip.clientSecret;
    this.hotelId = config.ohip.hotelId;
    this.appKey = config.ohip.appKey;
    this.timeout = config.ohip.timeout;
    this.retryAttempts = config.ohip.retryAttempts;
    this.scopes = config.ohip.scopes;
    this.externalSystem = config.ohip.externalSystem;
    this.originatingApplication = config.ohip.originatingApplication;
    
    this.validateConfig();
  }

  validateConfig() {
    const required = ['baseUrl', 'clientId', 'clientSecret', 'hotelId', 'appKey'];
    const missing = required.filter(key => !this[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required OHIP configuration: ${missing.join(', ')}`);
    }

    if (!this.baseUrl.startsWith('http')) {
      throw new Error('OHIP_BASE_URL must be a valid URL starting with http:// or https://');
    }

    logger.info('OHIP configuration validated successfully');
  }

  getAuthCredentials() {
    return {
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      scopes: this.scopes.length > 0 ? this.scopes : this.getDefaultScopes()
    };
  }

  getApiConfig() {
    return {
      baseUrl: this.baseUrl,
      hotelId: this.hotelId,
      appKey: this.appKey,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      externalSystem: this.externalSystem,
      originatingApplication: this.originatingApplication
    };
  }

  getDefaultScopes() {
    const { DEFAULT_SCOPES } = require('./ohip-scopes');
    return DEFAULT_SCOPES;
  }

  isConfigured() {
    return !!(this.baseUrl && this.clientId && this.clientSecret && this.hotelId && this.appKey);
  }
}

module.exports = new OHIPConfig();
