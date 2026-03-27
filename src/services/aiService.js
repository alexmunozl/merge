const logger = require('../utils/logger');
const config = require('../config');
const settingsService = require('./settingsService');

class AIService {
  constructor() {
  }

  getThresholds() {
    return {
      confidenceThreshold: settingsService.getNumber('ai_confidence_threshold', config.ai.confidenceThreshold),
      nameSimilarityThreshold: settingsService.getNumber('ai_name_similarity_threshold', config.ai.nameSimilarityThreshold),
      emailSimilarityThreshold: settingsService.getNumber('ai_email_similarity_threshold', config.ai.emailSimilarityThreshold),
      phoneSimilarityThreshold: settingsService.getNumber('ai_phone_similarity_threshold', config.ai.phoneSimilarityThreshold),
      addressSimilarityThreshold: settingsService.getNumber('ai_address_similarity_threshold', config.ai.addressSimilarityThreshold)
    };
  }

  getMasterKeywords() {
    const raw = settingsService.getString('master_profile_keywords', config.businessRules.masterProfileKeywords.join(','));
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  calculateLevenshteinDistance(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[len2][len1];
  }

  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const normalized1 = this.normalizeString(str1);
    const normalized2 = this.normalizeString(str2);
    
    if (normalized1 === normalized2) return 1.0;
    
    const distance = this.calculateLevenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    
    return 1 - (distance / maxLength);
  }

  calculateJaroWinklerDistance(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1.0;
    
    const len1 = s1.length;
    const len2 = s2.length;
    const maxDist = Math.floor(Math.max(len1, len2) / 2) - 1;
    
    let matches = 0;
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);
    
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - maxDist);
      const end = Math.min(i + maxDist + 1, len2);
      
      for (let j = start; j < end; j++) {
        if (!s2Matches[j] && s1[i] === s2[j]) {
          s1Matches[i] = s2Matches[j] = true;
          matches++;
          break;
        }
      }
    }
    
    if (matches === 0) return 0;
    
    let transpositions = 0;
    let s2Index = 0;
    
    for (let i = 0; i < len1; i++) {
      if (s1Matches[i]) {
        while (!s2Matches[s2Index]) {
          s2Index++;
        }
        if (s1[i] !== s2[s2Index]) {
          transpositions++;
        }
        s2Index++;
      }
    }
    
    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
    const prefixLength = Math.min(4, this.getPrefixLength(s1, s2));
    
    return jaro + (prefixLength * 0.1 * (1 - jaro));
  }

  getPrefixLength(str1, str2) {
    const minLength = Math.min(str1.length, str2.length);
    let i = 0;
    
    while (i < minLength && str1[i] === str2[i]) {
      i++;
    }
    
    return i;
  }

  normalizePhone(phone) {
    if (!phone) return '';
    return phone.replace(/[^\d]/g, '');
  }

  calculatePhoneSimilarity(phone1, phone2) {
    if (!phone1 || !phone2) return 0;
    
    const normalized1 = this.normalizePhone(phone1);
    const normalized2 = this.normalizePhone(phone2);
    
    if (normalized1 === normalized2) return 1.0;
    
    if (normalized1.length >= 10 && normalized2.length >= 10) {
      const last10_1 = normalized1.slice(-10);
      const last10_2 = normalized2.slice(-10);
      
      if (last10_1 === last10_2) return 0.9;
      
      const last7_1 = normalized1.slice(-7);
      const last7_2 = normalized2.slice(-7);
      
      if (last7_1 === last7_2) return 0.8;
    }
    
    return this.calculateStringSimilarity(normalized1, normalized2);
  }

  normalizeEmail(email) {
    if (!email) return '';
    return email.toLowerCase().trim();
  }

  calculateEmailSimilarity(email1, email2) {
    if (!email1 || !email2) return 0;
    
    const normalized1 = this.normalizeEmail(email1);
    const normalized2 = this.normalizeEmail(email2);
    
    if (normalized1 === normalized2) return 1.0;
    
    const domain1 = normalized1.split('@')[1];
    const domain2 = normalized2.split('@')[1];
    
    if (domain1 && domain2 && domain1 === domain2) {
      const local1 = normalized1.split('@')[0];
      const local2 = normalized2.split('@')[0];
      return this.calculateStringSimilarity(local1, local2) * 0.8;
    }
    
    return this.calculateStringSimilarity(normalized1, normalized2);
  }

  normalizeAddress(address) {
    if (!address) return '';
    return address.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl)\b/g, '')
      .replace(/\b(north|south|east|west|n|s|e|w)\b/g, '')
      .trim();
  }

  calculateAddressSimilarity(address1, address2) {
    if (!address1 || !address2) return 0;
    
    const normalized1 = this.normalizeAddress(address1);
    const normalized2 = this.normalizeAddress(address2);
    
    if (normalized1 === normalized2) return 1.0;
    
    const similarity = this.calculateStringSimilarity(normalized1, normalized2);
    const jaroWinkler = this.calculateJaroWinklerDistance(normalized1, normalized2);
    
    return (similarity + jaroWinkler) / 2;
  }

  extractNameParts(personName) {
    if (!personName || !personName.length) return { givenName: '', surname: '' };
    
    const primaryName = personName.find(name => name.nameType === 'PRIMARY') || personName[0];
    
    return {
      givenName: primaryName.givenName || '',
      surname: primaryName.surname || '',
      nameTitle: primaryName.nameTitle || '',
      middleName: primaryName.middleName || ''
    };
  }

  calculateNameSimilarity(profile1, profile2) {
    const name1 = this.extractNameParts(profile1.customer?.personName || []);
    const name2 = this.extractNameParts(profile2.customer?.personName || []);
    
    let totalScore = 0;
    let weightSum = 0;
    
    if (name1.surname && name2.surname) {
      const surnameSimilarity = this.calculateJaroWinklerDistance(name1.surname, name2.surname);
      totalScore += surnameSimilarity * 0.6;
      weightSum += 0.6;
    }
    
    if (name1.givenName && name2.givenName) {
      const givenNameSimilarity = this.calculateJaroWinklerDistance(name1.givenName, name2.givenName);
      totalScore += givenNameSimilarity * 0.3;
      weightSum += 0.3;
    }
    
    if (name1.nameTitle && name2.nameTitle) {
      const titleMatch = name1.nameTitle === name2.nameTitle ? 1 : 0;
      totalScore += titleMatch * 0.1;
      weightSum += 0.1;
    }
    
    return weightSum > 0 ? totalScore / weightSum : 0;
  }

  calculateContactSimilarity(profile1, profile2) {
    let emailScore = 0;
    let phoneScore = 0;
    let addressScore = 0;
    
    const emails1 = profile1.customer?.contactInfo?.email || [];
    const emails2 = profile2.customer?.contactInfo?.email || [];
    
    if (emails1.length > 0 && emails2.length > 0) {
      let maxEmailSimilarity = 0;
      for (const email1 of emails1) {
        for (const email2 of emails2) {
          const similarity = this.calculateEmailSimilarity(email1.emailAddress, email2.emailAddress);
          maxEmailSimilarity = Math.max(maxEmailSimilarity, similarity);
        }
      }
      emailScore = maxEmailSimilarity;
    }
    
    const phones1 = profile1.customer?.contactInfo?.phone || [];
    const phones2 = profile2.customer?.contactInfo?.phone || [];
    
    if (phones1.length > 0 && phones2.length > 0) {
      let maxPhoneSimilarity = 0;
      for (const phone1 of phones1) {
        for (const phone2 of phones2) {
          const similarity = this.calculatePhoneSimilarity(phone1.phoneNumber, phone2.phoneNumber);
          maxPhoneSimilarity = Math.max(maxPhoneSimilarity, similarity);
        }
      }
      phoneScore = maxPhoneSimilarity;
    }
    
    const addresses1 = profile1.customer?.addresses?.addressInfo || [];
    const addresses2 = profile2.customer?.addresses?.addressInfo || [];
    
    if (addresses1.length > 0 && addresses2.length > 0) {
      let maxAddressSimilarity = 0;
      for (const address1 of addresses1) {
        for (const address2 of addresses2) {
          const fullAddress1 = `${address1.addressLine1 || ''} ${address1.addressLine2 || ''} ${address1.city || ''} ${address1.stateProvince || ''}`;
          const fullAddress2 = `${address2.addressLine1 || ''} ${address2.addressLine2 || ''} ${address2.city || ''} ${address2.stateProvince || ''}`;
          const similarity = this.calculateAddressSimilarity(fullAddress1, fullAddress2);
          maxAddressSimilarity = Math.max(maxAddressSimilarity, similarity);
        }
      }
      addressScore = maxAddressSimilarity;
    }
    
    return {
      email: emailScore,
      phone: phoneScore,
      address: addressScore,
      overall: (emailScore + phoneScore + addressScore) / 3
    };
  }

  calculateDataCompletenessScore(profile) {
    let fields = 0;
    let completedFields = 0;
    
    const customer = profile.customer || {};
    
    if (customer.personName && customer.personName.length > 0) {
      fields += 3;
      const name = this.extractNameParts(customer.personName);
      if (name.givenName) completedFields++;
      if (name.surname) completedFields++;
      if (name.nameTitle) completedFields++;
    }
    
    if (customer.contactInfo) {
      if (customer.contactInfo.email && customer.contactInfo.email.length > 0) {
        fields += 1;
        completedFields++;
      }
      
      if (customer.contactInfo.phone && customer.contactInfo.phone.length > 0) {
        fields += 1;
        completedFields++;
      }
    }
    
    if (customer.addresses && customer.addresses.addressInfo && customer.addresses.addressInfo.length > 0) {
      fields += 1;
      completedFields++;
    }
    
    if (customer.identifications && customer.identifications.identificationInfo && customer.identifications.identificationInfo.length > 0) {
      fields += 1;
      completedFields++;
    }
    
    if (customer.language) {
      fields += 1;
      completedFields++;
    }
    
    if (customer.nationality) {
      fields += 1;
      completedFields++;
    }
    
    if (profile.createDateTime) {
      fields += 1;
      completedFields++;
    }
    
    return fields > 0 ? completedFields / fields : 0;
  }

  calculateProfileSimilarity(profile1, profile2) {
    const nameSimilarity = this.calculateNameSimilarity(profile1, profile2);
    const contactSimilarity = this.calculateContactSimilarity(profile1, profile2);
    
    const completeness1 = this.calculateDataCompletenessScore(profile1);
    const completeness2 = this.calculateDataCompletenessScore(profile2);
    
    const weights = {
      name: 0.4,
      email: 0.2,
      phone: 0.15,
      address: 0.15,
      completeness: 0.1
    };
    
    const overallScore = 
      (nameSimilarity * weights.name) +
      (contactSimilarity.email * weights.email) +
      (contactSimilarity.phone * weights.phone) +
      (contactSimilarity.address * weights.address) +
      (Math.abs(completeness1 - completeness2) * weights.completeness);
    
    return {
      overall: overallScore,
      name: nameSimilarity,
      email: contactSimilarity.email,
      phone: contactSimilarity.phone,
      address: contactSimilarity.address,
      completeness1,
      completeness2,
      isDuplicate: overallScore >= this.getThresholds().confidenceThreshold
    };
  }

  async findPotentialDuplicates(newProfile, existingProfiles) {
    const candidates = [];
    
    for (const existingProfile of existingProfiles) {
      const similarity = this.calculateProfileSimilarity(newProfile, existingProfile);
      
      if (similarity.overall >= this.getThresholds().confidenceThreshold) {
        candidates.push({
          profile: existingProfile,
          similarity,
          recommendation: this.getMergeRecommendation(newProfile, existingProfile, similarity)
        });
      }
    }
    
    return candidates.sort((a, b) => b.similarity.overall - a.similarity.overall);
  }

  getMergeRecommendation(newProfile, existingProfile, similarity) {
    const completenessNew = similarity.completeness1;
    const completenessExisting = similarity.completeness2;
    
    if (completenessNew > completenessExisting + 0.1) {
      return {
        action: 'MERGE_INTO_NEW',
        reason: 'New profile has significantly more complete data',
        confidence: similarity.overall
      };
    } else if (completenessExisting > completenessNew + 0.1) {
      return {
        action: 'MERGE_INTO_EXISTING',
        reason: 'Existing profile has significantly more complete data',
        confidence: similarity.overall
      };
    } else {
      return {
        action: 'MANUAL_REVIEW',
        reason: 'Profiles have similar completeness levels',
        confidence: similarity.overall
      };
    }
  }

  hasMasterProfileKeyword(profile) {
    const keywords = profile.customer?.keywords?.keyword || [];
    const masterKeywords = this.getMasterKeywords();
    
    return keywords.some(keyword => 
      masterKeywords.includes(keyword.keyword)
    );
  }

  selectSurvivorProfile(profile1, profile2, similarity) {
    const hasMaster1 = this.hasMasterProfileKeyword(profile1);
    const hasMaster2 = this.hasMasterProfileKeyword(profile2);
    
    if (hasMaster1 && !hasMaster2) {
      return profile1;
    } else if (hasMaster2 && !hasMaster1) {
      return profile2;
    } else if (hasMaster1 && hasMaster2) {
      return profile1.createDateTime < profile2.createDateTime ? profile1 : profile2;
    }
    
    return similarity.completeness1 >= similarity.completeness2 ? profile1 : profile2;
  }
}

module.exports = new AIService();
