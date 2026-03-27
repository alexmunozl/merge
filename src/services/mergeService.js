const ohipService = require('./ohipService');
const aiService = require('./aiService');
const logger = require('../utils/logger');
const config = require('../config');
const settingsService = require('./settingsService');

class MergeService {
  constructor() {
    this.mergeQueue = [];
    this.processingMerges = new Set();
  }

  async analyzePotentialMerge(profileId, candidateProfileId) {
    try {
      logger.info(`Analyzing potential merge between profiles ${profileId} and ${candidateProfileId}`);
      
      const [profile1, profile2] = await Promise.all([
        ohipService.getProfile(profileId, ['Profile', 'Communication', 'Preference', 'Indicators']),
        ohipService.getProfile(candidateProfileId, ['Profile', 'Communication', 'Preference', 'Indicators'])
      ]);

      if (!profile1 || !profile2) {
        throw new Error('One or both profiles not found');
      }

      const similarity = aiService.calculateProfileSimilarity(profile1, profile2);
      
      if (similarity.overall < settingsService.getNumber('ai_confidence_threshold', config.ai.confidenceThreshold)) {
        return {
          shouldMerge: false,
          reason: `Similarity score ${similarity.overall.toFixed(3)} below threshold ${settingsService.getNumber('ai_confidence_threshold', config.ai.confidenceThreshold)}`,
          similarity,
          recommendation: 'NO_MERGE'
        };
      }

      const survivorProfile = aiService.selectSurvivorProfile(profile1, profile2, similarity);
      const victimProfile = survivorProfile.profileId === profile1.profileId ? profile2 : profile1;

      const mergeSnapshot = await this.getMergeSnapshot(survivorProfile.profileId, victimProfile.profileId);
      
      const mergeAnalysis = this.analyzeMergeImpact(survivorProfile, victimProfile, mergeSnapshot);
      
      return {
        shouldMerge: true,
        survivorProfileId: survivorProfile.profileId,
        victimProfileId: victimProfile.profileId,
        similarity,
        mergeSnapshot,
        mergeAnalysis,
        recommendation: this.getMergeRecommendation(similarity, mergeAnalysis)
      };

    } catch (error) {
      logger.error(`Error analyzing potential merge: ${error.message}`);
      throw error;
    }
  }

  async getMergeSnapshot(survivorProfileId, victimProfileId) {
    try {
      const snapshot = await ohipService.getMergeSnapshot(survivorProfileId, [victimProfileId]);
      return snapshot;
    } catch (error) {
      logger.error(`Error getting merge snapshot: ${error.message}`);
      throw error;
    }
  }

  analyzeMergeImpact(survivorProfile, victimProfile, mergeSnapshot) {
    const analysis = {
      dataConsolidation: {
        addresses: this.analyzeAddressConsolidation(survivorProfile, victimProfile),
        phones: this.analyzePhoneConsolidation(survivorProfile, victimProfile),
        emails: this.analyzeEmailConsolidation(survivorProfile, victimProfile),
        preferences: this.analyzePreferenceConsolidation(survivorProfile, victimProfile),
        memberships: this.analyzeMembershipConsolidation(survivorProfile, victimProfile)
      },
      potentialConflicts: [],
      dataLoss: [],
      warnings: []
    };

    this.identifyPotentialConflicts(survivorProfile, victimProfile, analysis);
    this.identifyPotentialDataLoss(victimProfile, analysis);
    this.identifyWarnings(survivorProfile, victimProfile, analysis);

    return analysis;
  }

  analyzeAddressConsolidation(survivorProfile, victimProfile) {
    const survivorAddresses = survivorProfile.customer?.addresses?.addressInfo || [];
    const victimAddresses = victimProfile.customer?.addresses?.addressInfo || [];
    
    const duplicates = [];
    const uniqueVictimAddresses = [];

    for (const victimAddr of victimAddresses) {
      let isDuplicate = false;
      
      for (const survivorAddr of survivorAddresses) {
        const similarity = aiService.calculateAddressSimilarity(
          `${victimAddr.addressLine1} ${victimAddr.city} ${victimAddr.stateProvince}`,
          `${survivorAddr.addressLine1} ${survivorAddr.city} ${survivorAddr.stateProvince}`
        );
        
        if (similarity > settingsService.getNumber('ai_address_similarity_threshold', config.ai.addressSimilarityThreshold)) {
          duplicates.push({
            victim: victimAddr,
            survivor: survivorAddr,
            similarity
          });
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        uniqueVictimAddresses.push(victimAddr);
      }
    }

    return {
      survivorCount: survivorAddresses.length,
      victimCount: victimAddresses.length,
      duplicates,
      uniqueToAdd: uniqueVictimAddresses,
      finalCount: survivorAddresses.length + uniqueVictimAddresses.length
    };
  }

  analyzePhoneConsolidation(survivorProfile, victimProfile) {
    const survivorPhones = survivorProfile.customer?.contactInfo?.phone || [];
    const victimPhones = victimProfile.customer?.contactInfo?.phone || [];
    
    const duplicates = [];
    const uniqueVictimPhones = [];

    for (const victimPhone of victimPhones) {
      let isDuplicate = false;
      
      for (const survivorPhone of survivorPhones) {
        const similarity = aiService.calculatePhoneSimilarity(
          victimPhone.phoneNumber,
          survivorPhone.phoneNumber
        );
        
        if (similarity > settingsService.getNumber('ai_phone_similarity_threshold', config.ai.phoneSimilarityThreshold)) {
          duplicates.push({
            victim: victimPhone,
            survivor: survivorPhone,
            similarity
          });
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        uniqueVictimPhones.push(victimPhone);
      }
    }

    return {
      survivorCount: survivorPhones.length,
      victimCount: victimPhones.length,
      duplicates,
      uniqueToAdd: uniqueVictimPhones,
      finalCount: survivorPhones.length + uniqueVictimPhones.length
    };
  }

  analyzeEmailConsolidation(survivorProfile, victimProfile) {
    const survivorEmails = survivorProfile.customer?.contactInfo?.email || [];
    const victimEmails = victimProfile.customer?.contactInfo?.email || [];
    
    const duplicates = [];
    const uniqueVictimEmails = [];

    for (const victimEmail of victimEmails) {
      let isDuplicate = false;
      
      for (const survivorEmail of survivorEmails) {
        const similarity = aiService.calculateEmailSimilarity(
          victimEmail.emailAddress,
          survivorEmail.emailAddress
        );
        
        if (similarity > settingsService.getNumber('ai_email_similarity_threshold', config.ai.emailSimilarityThreshold)) {
          duplicates.push({
            victim: victimEmail,
            survivor: survivorEmail,
            similarity
          });
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        uniqueVictimEmails.push(victimEmail);
      }
    }

    return {
      survivorCount: survivorEmails.length,
      victimCount: victimEmails.length,
      duplicates,
      uniqueToAdd: uniqueVictimEmails,
      finalCount: survivorEmails.length + uniqueVictimEmails.length
    };
  }

  analyzePreferenceConsolidation(survivorProfile, victimProfile) {
    const survivorPrefs = survivorProfile.customer?.preferences || [];
    const victimPrefs = victimProfile.customer?.preferences || [];
    
    const duplicates = [];
    const uniqueVictimPrefs = [];

    for (const victimPref of victimPrefs) {
      const isDuplicate = survivorPrefs.some(survivorPref => 
        survivorPref.preferenceType === victimPref.preferenceType &&
        survivorPref.preferenceCode === victimPref.preferenceCode
      );
      
      if (isDuplicate) {
        duplicates.push(victimPref);
      } else {
        uniqueVictimPrefs.push(victimPref);
      }
    }

    return {
      survivorCount: survivorPrefs.length,
      victimCount: victimPrefs.length,
      duplicates,
      uniqueToAdd: uniqueVictimPrefs,
      finalCount: survivorPrefs.length + uniqueVictimPrefs.length
    };
  }

  analyzeMembershipConsolidation(survivorProfile, victimProfile) {
    const survivorMemberships = survivorProfile.profileMemberships || [];
    const victimMemberships = victimProfile.profileMemberships || [];
    
    const duplicates = [];
    const uniqueVictimMemberships = [];

    for (const victimMembership of victimMemberships) {
      const isDuplicate = survivorMemberships.some(survivorMembership => 
        survivorMembership.membershipType === victimMembership.membershipType &&
        survivorMembership.membershipNumber === victimMembership.membershipNumber
      );
      
      if (isDuplicate) {
        duplicates.push(victimMembership);
      } else {
        uniqueVictimMemberships.push(victimMembership);
      }
    }

    return {
      survivorCount: survivorMemberships.length,
      victimCount: victimMemberships.length,
      duplicates,
      uniqueToAdd: uniqueVictimMemberships,
      finalCount: survivorMemberships.length + uniqueVictimMemberships.length
    };
  }

  identifyPotentialConflicts(survivorProfile, victimProfile, analysis) {
    if (survivorProfile.customer?.personName && victimProfile.customer?.personName) {
      const survivorName = aiService.extractNameParts(survivorProfile.customer.personName);
      const victimName = aiService.extractNameParts(victimProfile.customer.personName);
      
      if (survivorName.surname !== victimName.surname || survivorName.givenName !== victimName.givenName) {
        analysis.potentialConflicts.push({
          type: 'NAME_MISMATCH',
          description: 'Primary names differ between profiles',
          survivor: survivorName,
          victim: victimName
        });
      }
    }

    if (analysis.dataConsolidation.memberships.duplicates.length > 0) {
      analysis.potentialConflicts.push({
        type: 'DUPLICATE_MEMBERSHIPS',
        description: 'Both profiles have similar memberships',
        count: analysis.dataConsolidation.memberships.duplicates.length
      });
    }
  }

  identifyPotentialDataLoss(victimProfile, analysis) {
    const victimData = {
      reservations: victimProfile.reservations?.length || 0,
      communications: victimProfile.communications?.length || 0,
      relationships: victimProfile.relationships?.length || 0,
      financialInfo: !!victimProfile.financialInfo
    };

    Object.entries(victimData).forEach(([key, value]) => {
      if (value > 0 || (key === 'financialInfo' && value)) {
        analysis.dataLoss.push({
          type: key.toUpperCase(),
          description: `${key} data from victim profile will be transferred`,
          count: typeof value === 'number' ? value : 1
        });
      }
    });
  }

  identifyWarnings(survivorProfile, victimProfile, analysis) {
    if (aiService.hasMasterProfileKeyword(survivorProfile) && aiService.hasMasterProfileKeyword(victimProfile)) {
      analysis.warnings.push({
        type: 'BOTH_MASTER_PROFILES',
        description: 'Both profiles have master profile keywords',
        severity: 'HIGH'
      });
    }

    if (analysis.dataConsolidation.addresses.duplicates.length > 3) {
      analysis.warnings.push({
        type: 'MANY_DUPLICATE_ADDRESSES',
        description: 'High number of duplicate addresses detected',
        severity: 'MEDIUM'
      });
    }

    const survivorAge = survivorProfile.createDateTime ? new Date(survivorProfile.createDateTime) : null;
    const victimAge = victimProfile.createDateTime ? new Date(victimProfile.createDateTime) : null;
    
    if (survivorAge && victimAge && Math.abs(survivorAge - victimAge) > (365 * 24 * 60 * 60 * 1000)) {
      analysis.warnings.push({
        type: 'AGE_DIFFERENCE',
        description: 'Profiles created more than a year apart',
        severity: 'LOW'
      });
    }
  }

  getMergeRecommendation(similarity, mergeAnalysis) {
    let confidence = similarity.overall;
    
    if (mergeAnalysis.potentialConflicts.length > 0) {
      confidence -= 0.1 * mergeAnalysis.potentialConflicts.length;
    }
    
    if (mergeAnalysis.warnings.some(w => w.severity === 'HIGH')) {
      confidence -= 0.2;
    }

    if (confidence >= 0.9) {
      return {
        action: 'AUTO_MERGE',
        reason: 'High confidence with minimal conflicts',
        confidence
      };
    } else if (confidence >= 0.7) {
      return {
        action: 'MANUAL_REVIEW',
        reason: 'Good confidence but requires human validation',
        confidence
      };
    } else {
      return {
        action: 'REJECT_MERGE',
        reason: 'Low confidence or too many conflicts',
        confidence
      };
    }
  }

  async executeMerge(survivorProfileId, victimProfileId, executedBy = 'system') {
    try {
      if (this.processingMerges.has(`${survivorProfileId}-${victimProfileId}`)) {
        throw new Error('Merge already in progress');
      }

      this.processingMerges.add(`${survivorProfileId}-${victimProfileId}`);
      
      logger.info(`Executing merge: survivor=${survivorProfileId}, victim=${victimProfileId}`);

      const mergeResult = await ohipService.mergeProfiles(survivorProfileId, victimProfileId);
      
      logger.info(`Merge completed successfully: ${JSON.stringify(mergeResult)}`);
      
      return {
        success: true,
        survivorProfileId,
        victimProfileId,
        executedBy,
        timestamp: new Date().toISOString(),
        mergeResult
      };

    } catch (error) {
      logger.error(`Merge execution failed: ${error.message}`);
      throw error;
    } finally {
      this.processingMerges.delete(`${survivorProfileId}-${victimProfileId}`);
    }
  }

  async batchMergeAnalysis(newProfile, existingProfiles) {
    const candidates = [];
    
    for (const existingProfile of existingProfiles) {
      try {
        const analysis = await this.analyzePotentialMerge(
          newProfile.profileId,
          existingProfile.profileId
        );
        
        if (analysis.shouldMerge) {
          candidates.push(analysis);
        }
      } catch (error) {
        logger.error(`Error analyzing merge with ${existingProfile.profileId}: ${error.message}`);
      }
    }

    return candidates.sort((a, b) => b.similarity.overall - a.similarity.overall);
  }

  async validateMergePreconditions(survivorProfileId, victimProfileId) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      const [survivorProfile, victimProfile] = await Promise.all([
        ohipService.getProfile(survivorProfileId),
        ohipService.getProfile(victimProfileId)
      ]);

      if (!survivorProfile) {
        validation.isValid = false;
        validation.errors.push('Survivor profile not found');
      }

      if (!victimProfile) {
        validation.isValid = false;
        validation.errors.push('Victim profile not found');
      }

      if (survivorProfile && victimProfile) {
        if (survivorProfile.statusCode !== 'Active' || victimProfile.statusCode !== 'Active') {
          validation.warnings.push('One or both profiles are not active');
        }

        if (aiService.hasMasterProfileKeyword(victimProfile)) {
          validation.warnings.push('Victim profile has master profile keyword');
        }

        if (survivorProfile.profileId === victimProfile.profileId) {
          validation.isValid = false;
          validation.errors.push('Cannot merge profile with itself');
        }
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }
}

module.exports = new MergeService();
