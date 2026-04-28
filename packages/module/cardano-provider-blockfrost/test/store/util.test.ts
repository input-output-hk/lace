import { Asset, Cardano } from '@cardano-sdk/core';
import { AddressType, KeyRole } from '@cardano-sdk/key-management';
import {
  CardanoRewardAccount,
  CardanoPaymentAddress,
  toContractAddress,
} from '@lace-contract/cardano-context';
import { describe, expect, it } from 'vitest';

import { toContractTokenMetadata } from '../../src/store/util';

import type { AnyBlockchainAddress } from '@lace-contract/addresses';
import type {
  CardanoAddressData,
  CardanoTokenMetadata,
} from '@lace-contract/cardano-context';
import type { TokenMetadata } from '@lace-contract/tokens';

describe('blockfrost provider sideEffectDependencies utils', () => {
  describe('toContractAddress', () => {
    const rewardAccount = CardanoRewardAccount(
      'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
    );
    const address = CardanoPaymentAddress(
      'addr_test1qzrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3ydtmkg0e7e2jvzg443h0ffzfwd09wpcxy2fuql9tk0g',
    );

    it('maps GroupedAddress into AnyBlockchainAddress<CardanoAddressData>', () => {
      expect(
        toContractAddress(
          {
            accountIndex: 1,
            address: address as unknown as Cardano.PaymentAddress,
            index: 1,
            networkId: Cardano.NetworkId.Testnet,
            rewardAccount: rewardAccount as unknown as Cardano.RewardAccount,
            type: AddressType.External,
            stakeKeyDerivationPath: { index: 1, role: KeyRole.Stake },
          },
          Cardano.NetworkMagics.Preprod,
        ),
      ).toEqual<AnyBlockchainAddress<CardanoAddressData>>({
        address,
        name: '0/1',
        data: {
          accountIndex: 1,
          index: 1,
          networkId: Cardano.NetworkId.Testnet,
          networkMagic: Cardano.NetworkMagics.Preprod,
          rewardAccount,
          type: AddressType.External,
          stakeKeyDerivationPath: { index: 1, role: KeyRole.Stake },
        },
      });
    });
  });

  describe('toContractTokenMetadata', () => {
    const mediaType = Asset.MediaType('image/png');
    const file: Asset.NftMetadataFile = {
      src: Asset.Uri('https://img.com/other-img.png'),
      mediaType,
      name: 'Puppy',
      otherProperties: new Map([['good-boy', 'yes']]),
    };
    const assetInfo = {
      assetId: Cardano.AssetId(
        '50fdcdbfa3154db86a87e4b5697ae30d272e0bbcfa8122efd3e301cb6d616361726f6e2d63616b65',
      ),
      fingerprint: Cardano.AssetFingerprint(
        'asset1f0azzptnr8dghzjh7egqvdjmt33e3lz5uy59th',
      ),
      name: Cardano.AssetName('6d616361726f6e2d63616b65'),
      policyId: Cardano.PolicyId(
        '50fdcdbfa3154db86a87e4b5697ae30d272e0bbcfa8122efd3e301cb',
      ),
      nftMetadata: {
        name: 'Dog',
        image: Asset.Uri('https://img.com/img.png'),
        version: '1',
        description: 'Good boy',
        files: [file],
        mediaType: Asset.ImageMediaType(mediaType),
        otherProperties: new Map([['hungry', 'yes']]),
      },
      quantity: 1n,
      supply: 1n,
    };

    it('maps AssetInfo into TokenMetadata<CardanoTokenMetadata>', () => {
      expect(toContractTokenMetadata(assetInfo)).toEqual<
        TokenMetadata<CardanoTokenMetadata>
      >({
        blockchainSpecific: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          updatedAt: expect.any(Number),
          policyId: assetInfo.policyId.toString(),
          files: [
            {
              mediaType: file.mediaType,
              src: file.src,
              additionalProperties: { 'good-boy': 'yes' },
              name: file.name,
            },
          ],
        },
        decimals: 0,
        additionalProperties: { hungry: 'yes' },
        image: assetInfo.nftMetadata.image,
        isNft: true,
        name: assetInfo.nftMetadata.name,
        ticker: undefined,
      });
    });
  });
});
