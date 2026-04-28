import type { Cardano } from '@cardano-sdk/core';
export type ClaimPayload = {
  faucet_url: string;
  code: string;
  user_id?: string;
};

export type ClaimTokenWithCdnMetadata = CDNMetadataResponse & {
  assetId: Cardano.AssetId;
  balance: string;
  image: string;
};

export type ClaimResponseSuccessWithCdnMetadata = ClaimResponseSuccess & {
  tokens: Record<Cardano.AssetId, ClaimTokenWithCdnMetadata>;
};

/**
 * CIP-25 NFT metadata structure for claim payload.
 * The metadata follows the CIP-25 standard for NFT metadata.
 */
export type NftClaimItem = {
  policy_id: string;
  asset_id: string; // hex-encoded asset name
  metadata: {
    [key: string]: unknown; // other metadata fields
    // CIP-25 required fields
    name: string[] | string; // Required: human-readable name
    image: string[] | string; // Required: URI or array of URI parts (if >64 chars, split)
    // CIP-25 optional fields
    mediaType?: string; // e.g., "image/png"
    description?: string[] | string;
    files?: Array<{
      [key: string]: unknown;
      mediaType: string;
      src: string[] | string;
      name?: string;
    }>;
  };
};

/**
 * Processed NFT metadata ready for display in the claim success screen.
 */
export type ClaimNftWithMetadata = {
  assetId: Cardano.AssetId; // policy_id.asset_id format
  name: string;
  image: string;
  policyId: string;
  assetName: string;
};

export type CDNMetadataResponse = {
  id: string; //Token ID (so-called "asset name" on Cardano)
  name: string; //Token display name (to be displayed to users)
  policy: string; //Policy ID
  fingerprint: string; //CIP-14 Fingerprint
  decimals: number; //Optional number of decimals (0 by default)
  metadata: unknown; //Token original metadata
};

type BaseClaimResponse = {
  code: number;
  status: string;
  lovelaces: string;
  queue_position?: number;
  tokens: {
    [token_id: Cardano.AssetId]: string; // string contains the balance of the token
  };
  nfts?: NftClaimItem[]; // CIP-25 NFT metadata
};

// First Successful Request
type ClaimResponse200 = BaseClaimResponse & {
  code: 200;
  status: 'accepted';
  queue_position: number;
};

// Subsequent Successful Request (Address + Code Match) prior to token distribution
type ClaimResponse201 = BaseClaimResponse & {
  code: 201;
  status: 'queued';
  queue_position: number;
};

// Subsequent Successful Request (Address + Code Match) after token(s) are distributed
type ClaimResponse202 = BaseClaimResponse & {
  code: 202;
  status: 'claimed';
  queue_position: never;
  tx_hash: string;
};

export type ClaimResponseSuccess =
  | ClaimResponse200
  | ClaimResponse201
  | ClaimResponse202;

export const isClaimResponseSuccess = (v: unknown): v is ClaimResponseSuccess =>
  typeof v === 'object' &&
  v !== null &&
  'code' in v &&
  typeof (v as { code: unknown }).code === 'number' &&
  /2\d\d/.test(String((v as { code: number }).code));

export const isClaimResponseError = (v: unknown): v is ClaimResponseError =>
  typeof v === 'object' &&
  v !== null &&
  'code' in v &&
  'status' in v &&
  (v.code === 400 ||
    v.code === 404 ||
    v.code === 409 ||
    v.code === 410 ||
    v.code === 425 ||
    v.code === 429);

export type ClaimResponseError =
  | ErrorAlreadyClaimed
  | ErrorExpired
  | ErrorInvalidAddress
  | ErrorInvalidNetwork
  | ErrorMissingCode
  | ErrorNotKnown
  | ErrorRateLimited
  | ErrorTooEarly;

type ErrorInvalidAddress = {
  code: 400;
  status: 'invalidaddress';
};

type ErrorMissingCode = {
  code: 400;
  status: 'missingcode';
};

type ErrorInvalidNetwork = {
  code: 400;
  status: 'invalidnetwork';
};

type ErrorNotKnown = { code: 404; status: 'notfound' };

type ErrorAlreadyClaimed = {
  code: 409;
  status: 'alreadyclaimed';
};

type ErrorExpired = {
  code: 410;
  status: 'expired';
};

type ErrorTooEarly = {
  code: 425;
  status: 'tooearly';
};

type ErrorRateLimited = {
  code: 429;
  status: 'ratelimited';
};
