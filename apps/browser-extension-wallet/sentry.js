import * as Sentry from '@sentry/react';
import { v4 as uuidv4 } from 'uuid';
import { storage } from 'webextension-polyfill';

const STANDARD_QUOTA_LIMIT = 10 * 1024 * 1024; // ~10MB
const NEAR_QUOTA_THRESHOLD = STANDARD_QUOTA_LIMIT * 0.8; // 80% of quota

/**
 * Checks storage quota asynchronously when a LevelDB error occurs
 * This runs independently of error handling to avoid blocking
 */
const checkStorageQuota = async () => {
  try {
    const bytesInUse = await storage.local.getBytesInUse(null);
    const hasUnlimitedStorage = typeof storage?.local?.QUOTA_BYTES === 'undefined';
    const isNearQuota = bytesInUse > NEAR_QUOTA_THRESHOLD;
    const exceedsStandardQuota = bytesInUse > STANDARD_QUOTA_LIMIT;

    return {
      bytesInUse,
      isNearQuota,
      exceedsStandardQuota,
      hasUnlimitedStorage
    };
  } catch (error) {
    console.error('Storage quota check failed:', error);
    return null;
  }
};

/**
 * Reports storage quota warning to Sentry if quota is exceeded or near limit
 * Only samples 10% of quota-related errors to reduce noise
 */
const reportQuotaWarningIfNeeded = async (errorMessage) => {
  const quotaStatus = await checkStorageQuota();

  if (!quotaStatus) {
    return; // Diagnostic check failed, skip reporting
  }

  // Only report if quota is actually an issue
  if (!quotaStatus.exceedsStandardQuota && !quotaStatus.isNearQuota) {
    return; // Quota is fine, likely not the cause
  }

  // Sample rate: 10% (send 1 out of 10 quota-related errors)
  const shouldSample = Math.random() < 0.1;
  if (!shouldSample) {
    return;
  }

  const diagnosticData = {
    bytesInUse: quotaStatus.bytesInUse,
    bytesInUseMB: (quotaStatus.bytesInUse / (1024 * 1024)).toFixed(2),
    hasUnlimitedStorage: quotaStatus.hasUnlimitedStorage,
    isNearQuota: quotaStatus.isNearQuota,
    exceedsStandardQuota: quotaStatus.exceedsStandardQuota,
    usagePercent: ((quotaStatus.bytesInUse / STANDARD_QUOTA_LIMIT) * 100).toFixed(2),
    originalError: errorMessage,
    timestamp: new Date().toISOString()
  };

  Sentry.captureMessage('Storage Quota Warning - LevelDB Write Failed', {
    level: 'warning',
    tags: {
      error_type: 'storage_quota',
      quota_exceeded: quotaStatus.exceedsStandardQuota,
      unlimited_storage_enabled: quotaStatus.hasUnlimitedStorage
    },
    extra: diagnosticData
  });
};

Sentry.init({
  environment: process.env.SENTRY_ENVIRONMENT,
  dsn: process.env.SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration(), Sentry.browserProfilingIntegration(), Sentry.replayIntegration()],
  // Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
  tracePropagationTargets: ['localhost', 'chrome-extension://gafhhkghbfjjkeiendhlofajokpaflmk'],
  // .5%
  tracesSampleRate: 0.05,
  profilesSampleRate: 0.05,
  // Since profilesSampleRate is relative to tracesSampleRate,
  // the final profiling rate can be computed as tracesSampleRate * profilesSampleRate
  // A tracesSampleRate of 0.05 and profilesSampleRate of 0.05 results in 2.5% of
  // transactions being profiled (0.05*0.05=0.0025)

  // Capture Replay for 0.05% of all sessions,
  replaysSessionSampleRate: 0.005,
  // ...plus for 100% of sessions with an error
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    // Filter out LevelDB file creation errors - these are benign user environment issues
    const errorMessage = event.exception?.values?.[0]?.value || '';
    if (errorMessage.includes('Unable to create writable file') && errorMessage.includes('.ldb')) {
      // Trigger async quota check (non-blocking)
      // This will sample and report quota-related issues separately
      reportQuotaWarningIfNeeded(errorMessage).catch((error) => {
        console.error('Failed to report quota warning:', error);
      });

      // Always filter the original LevelDB error from error tracking
      // These are typically benign and related to user environment/storage issues
      return null;
    }
    return event;
  }
});

storage.local.get('SENTRY-UUID').then((storageVar) => {
  let sentryUuid = storageVar?.['SENTRY-UUID'] ?? uuidv4();
  if (!storageVar?.['SENTRY-UUID']) {
    storage.local.set({ 'SENTRY-UUID': sentryUuid });
  }
  Sentry.setUser({ id: sentryUuid });
});
