import { Cardano } from '@cardano-sdk/core';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { NavigationControls, StackRoutes } from '@lace-lib/navigation';
import {
  catchError,
  defer,
  filter,
  forkJoin,
  from,
  map,
  of,
  switchMap,
  withLatestFrom,
} from 'rxjs';

import { isClaimResponseError, isClaimResponseSuccess } from '../types';

import type { SideEffect } from '..';
import type {
  CDNMetadataResponse,
  ClaimNftWithMetadata,
  ClaimResponseError,
  ClaimTokenWithCdnMetadata,
  NftClaimItem,
} from '../types';
import type { BlockchainNetworkId } from '@lace-contract/network';

const getFingerprint = (token: string): Cardano.AssetFingerprint => {
  const [policyId, name] = token.split('.');
  return Cardano.AssetFingerprint.fromParts(
    Cardano.PolicyId(policyId),
    Cardano.AssetName(name),
  );
};

const getCdnDomain = (blockchainNetworkId: BlockchainNetworkId): string => {
  const chainId = CardanoNetworkId.getChainId(blockchainNetworkId);
  if (!chainId) return 'preprod';
  const magic = Number(chainId.networkMagic);
  if (magic === Number(Cardano.NetworkMagics.Mainnet)) return 'lace';
  if (magic === Number(Cardano.NetworkMagics.Preprod)) return 'preprod';
  if (magic === Number(Cardano.NetworkMagics.Preview)) return 'preview';
  if (magic === Number(Cardano.NetworkMagics.Sanchonet)) return 'sanchonet';
  return 'preprod';
};

/**
 * Extracts a string value from CIP-25 metadata field.
 * Handles both string and array formats (arrays are used when value exceeds 64 chars).
 * Per CIP-25: arrays should be concatenated to form the complete value.
 */
const extractCip25MetadataString = (
  value: string[] | string | undefined,
): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join('');
  return '';
};

/**
 * Constructs Cardano.AssetId from policy_id and asset_id.
 */
const constructAssetId = (policyId: string, assetId: string): Cardano.AssetId =>
  `${policyId}.${assetId}` as Cardano.AssetId;

/**
 * Constructs fingerprint from policy_id and asset_id.
 */
const getNftFingerprint = (
  policyId: string,
  assetId: string,
): Cardano.AssetFingerprint =>
  Cardano.AssetFingerprint.fromParts(
    Cardano.PolicyId(policyId),
    Cardano.AssetName(assetId),
  );

/**
 * Side effect that handles claim submission to the faucet URL.
 * Triggered when submitClaim action is dispatched.
 */
export const submitClaimSideEffect: SideEffect = (
  { cardanoUriLinking: { submitClaim$ } },
  {
    cardanoUriLinking: { selectClaimingAccount$ },
    addresses: { selectAllAddresses$ },
  },
  { actions, logger },
) =>
  submitClaim$.pipe(
    withLatestFrom(selectClaimingAccount$, selectAllAddresses$),
    filter(([_, claimingAccount]) => claimingAccount !== null),
    switchMap(([{ payload }, claimingAccount, addresses]) => {
      const { faucet_url, code, user_id } = payload;
      const claimingAddress = addresses.find(
        address => address.accountId === claimingAccount?.accountId,
      );

      if (!claimingAddress) {
        const error: ClaimResponseError = {
          code: 400,
          status: 'invalidaddress',
        };
        NavigationControls.actions.closeAndNavigate(StackRoutes.ClaimError);
        return of(actions.cardanoUriLinking.submitClaimFailed(error));
      }

      return defer(() =>
        from(
          fetch(faucet_url, {
            headers: {
              'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
              address: claimingAddress.address,
              code,
              ...(!!user_id && { user_id }),
            }),
          }),
        ),
      ).pipe(
        switchMap(response =>
          defer(() => from(response.text())).pipe(
            map(raw => {
              const contentType = response.headers.get('content-type') ?? '';

              if (!contentType.includes('application/json')) {
                throw new Error('Invalid response content type');
              }

              const parsed = JSON.parse(raw) as unknown;

              if (!response.ok || !isClaimResponseSuccess(parsed)) {
                const error: ClaimResponseError = isClaimResponseError(parsed)
                  ? parsed
                  : { code: 404, status: 'notfound' };
                NavigationControls.actions.closeAndNavigate(
                  StackRoutes.ClaimError,
                );
                return actions.cardanoUriLinking.submitClaimFailed(error);
              }

              NavigationControls.actions.closeAndNavigate(
                StackRoutes.ClaimSuccess,
              );
              return actions.cardanoUriLinking.submitClaimSuccess(parsed);
            }),
          ),
        ),
        catchError(error => {
          logger.error('Claim submission failed', error);
          const typedError: ClaimResponseError = isClaimResponseError(error)
            ? error
            : { code: 404, status: 'notfound' };
          NavigationControls.actions.closeAndNavigate(StackRoutes.ClaimError);
          return of(actions.cardanoUriLinking.submitClaimFailed(typedError));
        }),
      );
    }),
  );

/**
 * Side effect that loads token metadata from the NFT CDN.
 * Triggered when a claim response is successfully received.
 */
export const loadTokenMetadataSideEffect: SideEffect = (
  { cardanoUriLinking: { submitClaimSuccess$ } },
  { cardanoUriLinking: { selectClaimingAccount$ } },
  { actions, logger },
) =>
  submitClaimSuccess$.pipe(
    withLatestFrom(selectClaimingAccount$),
    filter(([{ payload }, claimingAccount]) => {
      const tokens = payload.tokens;
      return (
        claimingAccount !== null && !!tokens && Object.keys(tokens).length > 0
      );
    }),
    switchMap(([{ payload }, claimingAccount]) => {
      const tokens = payload.tokens;

      if (!claimingAccount) {
        return of(actions.cardanoUriLinking.tokenMetadataFailed());
      }

      const cdnDomain = getCdnDomain(claimingAccount.blockchainNetworkId);

      const tokenFetches$ = Object.entries(tokens).map(([token, balance]) => {
        const fingerprint = getFingerprint(token);
        const tokenImage = `${process.env.EXPO_PUBLIC_NFT_CDN_URL}/${cdnDomain}/image/${fingerprint}?size=64`;

        return defer(() =>
          from(
            fetch(
              `${process.env.EXPO_PUBLIC_NFT_CDN_URL}/${cdnDomain}/metadata/${fingerprint}`,
            ),
          ),
        ).pipe(
          switchMap(response =>
            from(response.json() as Promise<CDNMetadataResponse>),
          ),
          map(data => ({
            ...data,
            assetId: token as Cardano.AssetId,
            balance,
            image: tokenImage,
          })),
          catchError(() => {
            // Swallow error silently if token is not found
            const name = token.split('.')[1];
            const assetHexName = Buffer.from(name, 'hex').toString('utf8');
            return of({
              assetId: token as Cardano.AssetId,
              balance,
              name: assetHexName,
              image: tokenImage,
            } as ClaimTokenWithCdnMetadata);
          }),
        );
      });

      return of(actions.cardanoUriLinking.loadTokenMetadata()).pipe(
        switchMap(() =>
          forkJoin(tokenFetches$).pipe(
            map(details =>
              actions.cardanoUriLinking.tokenMetadataLoaded(
                details.filter(
                  (d): d is ClaimTokenWithCdnMetadata => d !== undefined,
                ),
              ),
            ),
            catchError(error => {
              logger.error('Token metadata loading failed', error);
              // Fallback: return basic token info without metadata
              const fallbackDetails = Object.entries(tokens).map(
                ([token, balance]) => {
                  const name = token.split('.')[1];
                  const fingerprint = getFingerprint(token);
                  const assetHexName = Buffer.from(name, 'hex').toString(
                    'utf8',
                  );
                  const tokenImage = `${process.env.EXPO_PUBLIC_NFT_CDN_URL}/${cdnDomain}/image/${fingerprint}?size=64`;
                  return {
                    assetId: token as Cardano.AssetId,
                    balance,
                    name: assetHexName,
                    image: tokenImage,
                  } as ClaimTokenWithCdnMetadata;
                },
              );
              return of(
                actions.cardanoUriLinking.tokenMetadataLoaded(fallbackDetails),
              );
            }),
          ),
        ),
      );
    }),
  );

/**
 * Side effect that loads NFT metadata from the claim response payload.
 * Extracts CIP-25 metadata (name, image) from the nfts array.
 * Triggered when a claim response is successfully received.
 */
export const loadNftMetadataSideEffect: SideEffect = (
  { cardanoUriLinking: { submitClaimSuccess$ } },
  { cardanoUriLinking: { selectClaimingAccount$ } },
  { actions, logger },
) =>
  submitClaimSuccess$.pipe(
    withLatestFrom(selectClaimingAccount$),
    filter(([{ payload }, claimingAccount]) => {
      const nfts = payload.nfts;
      return claimingAccount !== null && !!nfts && nfts.length > 0;
    }),
    switchMap(([{ payload }, claimingAccount]) => {
      const nfts = payload.nfts;

      if (!claimingAccount || !nfts) {
        return of(actions.cardanoUriLinking.nftMetadataFailed());
      }

      const cdnDomain = getCdnDomain(claimingAccount.blockchainNetworkId);

      const processNft = (nft: NftClaimItem): ClaimNftWithMetadata => {
        const { policy_id, asset_id, metadata } = nft;

        // Construct asset ID in Cardano format (policy_id.asset_id)
        const assetId = constructAssetId(policy_id, asset_id);

        // Extract name from CIP-25 metadata (required field)
        const name = extractCip25MetadataString(metadata?.name);

        // Extract image directly from CIP-25 metadata
        const metadataImage = extractCip25MetadataString(metadata?.image);

        // Fallback to CDN image URL if metadata image is missing
        const fingerprint = getNftFingerprint(policy_id, asset_id);
        const cdnImage = `${process.env.EXPO_PUBLIC_NFT_CDN_URL}/${cdnDomain}/image/${fingerprint}?size=64`;
        const image = metadataImage || cdnImage;

        // Fallback name: try to decode hex asset_id to UTF-8, otherwise use the hex
        const fallbackName =
          name ||
          (() => {
            try {
              return Buffer.from(asset_id, 'hex').toString('utf8');
            } catch {
              return asset_id;
            }
          })();

        return {
          assetId,
          name: fallbackName,
          image,
          policyId: policy_id,
          assetName: asset_id,
        };
      };

      try {
        const nftDetails = nfts.map(processNft);
        return of(actions.cardanoUriLinking.loadNftMetadata()).pipe(
          map(() => actions.cardanoUriLinking.nftMetadataLoaded(nftDetails)),
        );
      } catch (error) {
        logger.error('NFT metadata processing failed', error);
        return of(actions.cardanoUriLinking.nftMetadataFailed());
      }
    }),
  );

export const initializeSideEffects = () => [
  submitClaimSideEffect,
  loadTokenMetadataSideEffect,
  loadNftMetadataSideEffect,
];
