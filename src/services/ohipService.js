const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const ohipConfig = require('../config/ohip');
const { ENDPOINT_HEADERS, HEADER_PATTERNS } = require('../config/ohip-headers');
const { ENDPOINT_SCOPES } = require('../config/ohip-scopes');
const logger = require('../utils/logger');

class OHIPService {
  constructor() {
    const apiConfig = ohipConfig.getApiConfig();
    const authConfig = ohipConfig.getAuthCredentials();
    
    this.baseURL = apiConfig.baseUrl;
    this.clientId = authConfig.clientId;
    this.clientSecret = authConfig.clientSecret;
    this.hotelId = apiConfig.hotelId;
    this.appKey = apiConfig.appKey;
    this.timeout = apiConfig.timeout;
    this.retryAttempts = apiConfig.retryAttempts;
    this.scopes = authConfig.scopes;
    this.externalSystem = apiConfig.externalSystem;
    this.originatingApplication = apiConfig.originatingApplication;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    try {
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      // Include scopes in the OAuth request
      const scopeParam = this.scopes.length > 0 ? `&scope=${this.scopes.join(' ')}` : '';
      
      const response = await axios.post(`${this.baseURL}/oauth/token`, 
        `grant_type=client_credentials${scopeParam}`,
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: this.timeout
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 minute early

      logger.info(`Successfully obtained OHIP access token with scopes: ${this.scopes.join(', ')}`);
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to obtain OHIP access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with OHIP');
    }
  }

  generateRequestId() {
    return `~${uuidv4()}`;
  }

  validateHeader(headerName, value) {
    const pattern = HEADER_PATTERNS[headerName];
    if (pattern && !pattern.test(value)) {
      logger.warn(`Header ${headerName} validation failed for value: ${value}`);
    }
    return value;
  }

  buildHeaders(method, endpoint, additionalHeaders = {}) {
    const token = this.accessToken;
    if (!token) {
      throw new Error('Access token required but not available');
    }

    const endpointKey = `${method}:${endpoint}`;
    const headerConfig = ENDPOINT_HEADERS[endpointKey] || ENDPOINT_HEADERS[`*:${endpoint.split('/')[1]}`] || {
      required: ['x-app-key', 'x-hotelid', 'Authorization'],
      optional: ['x-request-id', 'x-externalsystem']
    };

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-app-key': this.validateHeader('x-app-key', this.appKey),
      'x-hotelid': this.validateHeader('x-hotelid', this.hotelId)
    };

    // Add optional headers
    if (headerConfig.alwaysInclude && headerConfig.alwaysInclude.includes('x-request-id')) {
      headers['x-request-id'] = this.validateHeader('x-request-id', this.generateRequestId());
    } else if (headerConfig.optional && headerConfig.optional.includes('x-request-id')) {
      headers['x-request-id'] = this.validateHeader('x-request-id', this.generateRequestId());
    }

    if (headerConfig.optional && headerConfig.optional.includes('x-externalsystem')) {
      headers['x-externalsystem'] = this.validateHeader('x-externalsystem', this.externalSystem);
    }

    if (headerConfig.optional && headerConfig.optional.includes('x-originating-application')) {
      headers['x-originating-application'] = this.originatingApplication;
    }

    if (headerConfig.optional && headerConfig.optional.includes('Accept-Language')) {
      headers['Accept-Language'] = 'en-US';
    }

    // Add any additional headers passed in
    Object.assign(headers, additionalHeaders);

    // Validate required headers are present
    const missingRequired = headerConfig.required?.filter(req => !headers[req]) || [];
    if (missingRequired.length > 0) {
      throw new Error(`Missing required headers for ${method} ${endpoint}: ${missingRequired.join(', ')}`);
    }

    return headers;
  }

  async makeRequest(method, endpoint, data = null, params = null, additionalHeaders = {}) {
    try {
      const token = await this.getAccessToken();
      const headers = this.buildHeaders(method, endpoint, additionalHeaders);
      
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers,
        timeout: this.timeout
      };

      if (data) {
        config.data = data;
      }

      if (params) {
        config.params = params;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      logger.error(`OHIP API Error (${method} ${endpoint}):`, error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        this.accessToken = null;
        this.tokenExpiry = null;
        return this.makeRequest(method, endpoint, data, params, additionalHeaders);
      }
      
      throw error;
    }
  }

  async searchProfiles(searchParams) {
    const params = {
      hotelId: this.hotelId,
      limit: searchParams.limit || 200,
      offset: searchParams.offset || 0,
      ...searchParams
    };

    const response = await this.makeRequest('GET', '/crm/v1/profiles', null, params);
    return response;
  }

  async getProfile(profileId, fetchInstructions = null) {
    const params = {};
    if (fetchInstructions) {
      params.fetchInstructions = fetchInstructions;
    }

    const response = await this.makeRequest('GET', `/crm/v1/profiles/${profileId}`, null, params);
    return response;
  }

  async getCompanyProfile(corporateId, fetchInstructions = null) {
    const params = {};
    if (fetchInstructions) {
      params.fetchInstructions = fetchInstructions;
    }

    const response = await this.makeRequest('GET', `/crm/v1/companies/${corporateId}`, null, params);
    return response;
  }

  async updateProfile(profileId, profileData) {
    const response = await this.makeRequest('PUT', `/crm/v1/profiles/${profileId}`, profileData);
    return response;
  }

  async deleteProfile(profileId) {
    const response = await this.makeRequest('DELETE', `/crm/v1/profiles/${profileId}`);
    return response;
  }

  async getMergeSnapshot(survivorProfileId, toBeMergedIds) {
    const params = {
      toBeMergedId: toBeMergedIds
    };

    const response = await this.makeRequest('GET', `/crm/v1/profiles/${survivorProfileId}/merges/snapshot`, null, params);
    return response;
  }

  async mergeProfiles(survivorProfileId, victimProfileId) {
    const data = {
      victimProfileId: {
        id: victimProfileId
      }
    };

    const response = await this.makeRequest('POST', `/crm/v1/profiles/${survivorProfileId}/merges`, data);
    return response;
  }

  async getDuplicateExternalSubscriptions(params = {}) {
    const response = await this.makeRequest('GET', '/crm/v1/duplicateExternalSubscriptions', null, params);
    return response;
  }

  async getDuplicateOPERASubscriptions(params = {}) {
    const response = await this.makeRequest('GET', '/crm/v1/duplicateOPERASubscriptions', null, params);
    return response;
  }

  async getProfilesByIds(profileIds, fetchInstructions = null) {
    const params = {
      profileIds: profileIds,
      limit: profileIds.length
    };

    if (fetchInstructions) {
      params.fetchInstructions = fetchInstructions;
    }

    const response = await this.makeRequest('GET', '/crm/v1/profiles', null, params);
    return response;
  }

  async searchProfilesByName(profileName, givenName = null, profileType = null) {
    const params = {
      profileName,
      limit: 200
    };

    if (givenName) {
      params.givenName = givenName;
    }

    if (profileType) {
      params.profileType = profileType;
    }

    const response = await this.makeRequest('GET', '/crm/v1/profiles', null, params);
    return response;
  }

  async searchProfilesByEmail(email, profileType = null) {
    const params = {
      email: email,
      limit: 200
    };

    if (profileType) {
      params.profileType = profileType;
    }

    const response = await this.makeRequest('GET', '/crm/v1/profiles', null, params);
    return response;
  }

  async searchProfilesByPhone(phone, profileType = null) {
    const params = {
      phoneNumber: phone,
      limit: 200
    };

    if (profileType) {
      params.profileType = profileType;
    }

    const response = await this.makeRequest('GET', '/crm/v1/profiles', null, params);
    return response;
  }

  async getProfilesCreatedAfter(timestamp, limit = 200) {
    const params = {
      limit,
      offset: 0
    };

    const response = await this.makeRequest('GET', '/crm/v1/profiles', null, params);
    
    if (response.profiles && response.profiles.profile) {
      const filteredProfiles = response.profiles.profile.filter(profile => {
        const createDate = profile.createDateTime ? new Date(profile.createDateTime) : null;
        return createDate && createDate > new Date(timestamp);
      });

      return {
        ...response,
        profiles: {
          profile: filteredProfiles,
          totalResults: filteredProfiles.length
        }
      };
    }

    return response;
  }
}

module.exports = new OHIPService();
