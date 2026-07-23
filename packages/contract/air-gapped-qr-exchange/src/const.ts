import { FeatureFlagKey } from '@lace-contract/feature';

export const FEATURE_FLAG_SEED_SIGNER = FeatureFlagKey('SEED_SIGNER');

export const FEATURE_FLAG_KEYSTONE = FeatureFlagKey('KEYSTONE');

/**
 * Connected-view location the extension opens for the camera scan. The host
 * overlay only mounts the camera in the tab at this location; MV3 popups and
 * side panels cannot use getUserMedia.
 */
export const AIR_GAPPED_QR_SCAN_LOCATION = '/seed-signer-scan';
