import {
  AddressAlias,
  AddressAliasType,
  type Address,
  type AddressAliasResolver,
} from '@lace-contract/addresses';
import { BlockchainNetworkId } from '@lace-contract/network';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber, None, Some, Timestamp } from '@lace-sdk/util';
import { produce } from 'immer';
import merge from 'lodash/fp/merge';
import { firstValueFrom, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { humanMinimumAmount, validateForm } from '../src/validate-form';

import type { SendFlowAddressValidator } from '../src';
import type { AddressValidationResult, StateOpen } from '../src/types';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { DeepPartial } from '@lace-sdk/util';

const availableBalance = 10n;
const validForm: StateOpen['form'] = {
  address: {
    value: 'address',
    error: null,
    dirty: true,
  },
  tokenTransfers: [
    {
      amount: {
        value: BigNumber(1n),
        dirty: true,
        error: null,
      },
      token: {
        value: {
          accountId: 'cardano-acc' as AccountId,
          address: 'cardano-addr' as Address,
          blockchainName: 'Cardano',
          available: BigNumber(availableBalance),
          pending: BigNumber(0n),
          tokenId: TokenId('id'),
          displayLongName: 'test',
          displayShortName: 'TEST',
          decimals: 2,
          metadata: {
            blockchainSpecific: {},
            decimals: 2,
            name: 'test',
            ticker: 'TEST',
          },
        },
      },
    },
  ],
};

const runFormValidator = async ({
  validateAddress = () => of(None),
  // cast is required because DeepPartial transforms unknown into {}
  formPartial = validForm as DeepPartial<StateOpen['form']>,
  addressAliasResolvers = [],
  minimumAmount = BigNumber(1n),
}: {
  formPartial?: DeepPartial<StateOpen['form']>;
  validateAddress?: SendFlowAddressValidator['validateAddress'] | null;
  addressAliasResolvers?: AddressAliasResolver[];
  minimumAmount?: BigNumber;
} = {}) =>
  firstValueFrom(
    validateForm({
      addressValidator: validateAddress
        ? {
            blockchainName: 'Midnight' as const,
            validateAddress,
          }
        : null,
      addressAliasResolvers,
      blockchainSpecificData: {},
      form: produce(validForm, draft => merge(draft, formPartial)),
      logger: dummyLogger,
      minimumAmount,
      network: BlockchainNetworkId('midnight-mainnet'),
    }),
  );

describe('send-flow validateForm', () => {
  it('returns form error data for amount and address', async () => {
    const validationResult = await runFormValidator();

    expect(validationResult[0]).toHaveProperty('fieldName', 'address');
    expect(validationResult[0]).toHaveProperty('error');
    expect(validationResult[1]).toHaveProperty(
      'fieldName',
      'tokenTransfers.amount',
    );
    expect(validationResult[1]).toHaveProperty('error');
  });

  describe('address validation', () => {
    it('returns null if address field was not yet entered', async () => {
      const validationResult = await runFormValidator({
        formPartial: { address: { dirty: false } },
      });

      expect(validationResult[0].error).toBe(null);
    });

    it('returns "empty" if address field is empty', async () => {
      const validationResult = await runFormValidator({
        formPartial: { address: { value: '' } },
      });

      expect(validationResult[0].error).toBe(
        'v2.send-flow.form.errors.address.empty' satisfies TranslationKey,
      );
    });

    it('returns "null" if address validator is not available', async () => {
      const validationResult = await runFormValidator({
        validateAddress: null,
      });

      expect(validationResult[0].error).toBe(null);
    });

    it('returns "invalid" if address validator resulted with an error', async () => {
      const validateAddress = vi.fn().mockReturnValueOnce(of(Some('invalid')));
      const validationResult = await runFormValidator({
        validateAddress,
      });

      expect(validationResult[0].error).toBe(
        'v2.send-flow.form.errors.address.invalid' satisfies TranslationKey,
      );
    });

    it('returns "null" if address is correct', async () => {
      const validateAddress = vi.fn().mockReturnValueOnce(of(None));
      const validationResult = await runFormValidator({
        validateAddress,
      });

      expect(validationResult[0].error).toBe(null);
    });

    it('uses first matching alias resolver when address validation fails', async () => {
      const validateAddress = vi.fn().mockReturnValueOnce(of(Some('invalid')));
      const resolvedAddr = 'resolved-by-second' as Address;

      const firstResolver: AddressAliasResolver = {
        looksLikeAlias: (_input): _input is AddressAlias => false,
        resolveAlias: vi.fn(),
      };
      const secondResolver: AddressAliasResolver = {
        looksLikeAlias: (_input): _input is AddressAlias => true,
        resolveAlias: () =>
          of(
            Some({
              alias: AddressAlias('test'),
              aliasType: AddressAliasType('test-type'),
              blockchainName: 'Cardano' as const,
              networkId: BlockchainNetworkId('network'),
              resolvedAddress: resolvedAddr,
              resolvedAt: Timestamp(Date.now()),
              data: undefined,
            }),
          ),
      };

      const validationResult = await runFormValidator({
        validateAddress,
        addressAliasResolvers: [firstResolver, secondResolver],
      });

      const addressResult = validationResult[0] as AddressValidationResult;
      expect(addressResult.resolvedAddress).toBe(resolvedAddr);
      expect(firstResolver.resolveAlias).not.toHaveBeenCalled();
    });
  });

  describe('amount validation', () => {
    it('returns null if amount field was not yet entered', async () => {
      const validationResult = await runFormValidator({
        formPartial: { tokenTransfers: [{ amount: { dirty: false } }] },
      });

      expect(validationResult[1].error).toBe(null);
    });

    it('returns "less-than-minimum" if amount is zero', async () => {
      const validationResult = await runFormValidator({
        formPartial: {
          tokenTransfers: [{ amount: { value: BigNumber(0n) } }],
        },
      });

      expect(validationResult[1].error).toEqual({
        error: 'less-than-minimum',
        argument: humanMinimumAmount(2),
      });
    });

    it('returns "less-than-minimum" if amount is negative', async () => {
      const validationResult = await runFormValidator({
        formPartial: {
          tokenTransfers: [{ amount: { value: BigNumber(-1n) } }],
        },
      });

      expect(validationResult[1].error).toEqual({
        error: 'less-than-minimum',
        argument: humanMinimumAmount(2),
      });
    });

    it('returns null for NFT when amount is 1', async () => {
      const validationResult = await runFormValidator({
        formPartial: {
          tokenTransfers: [
            {
              amount: { value: BigNumber(1n) },
              token: {
                value: {
                  metadata: {
                    isNft: true,
                  },
                },
              },
            },
          ],
        },
      });

      expect(validationResult[1].error).toBe(null);
    });

    it('returns "insufficient-balance" if amount is bigger than balance', async () => {
      const validationResult = await runFormValidator({
        formPartial: {
          tokenTransfers: [
            { amount: { value: BigNumber(availableBalance + 1n) } },
          ],
        },
      });

      expect(validationResult[1].error).toEqual({
        error: 'insufficient-balance',
      });
    });

    it('returns "null" if amount is correct', async () => {
      const validationResult = await runFormValidator({
        formPartial: {
          tokenTransfers: [
            { amount: { value: BigNumber(availableBalance - 1n) } },
          ],
        },
      });

      expect(validationResult[1].error).toBe(null);
    });

    it('uses chain minimumAmount for lovelace and surfaces ADA in the error argument', async () => {
      const chainMinLovelace = BigNumber(840000n);
      const validationResult = await runFormValidator({
        minimumAmount: chainMinLovelace,
        formPartial: {
          tokenTransfers: [
            {
              amount: { value: BigNumber(1000n) },
              token: {
                value: {
                  tokenId: TokenId('lovelace'),
                  available: BigNumber(10_000_000n),
                  decimals: 6,
                },
              },
            },
          ],
        },
        validateAddress: vi.fn().mockReturnValueOnce(of(None)),
      });

      expect(validationResult[1].error).toEqual({
        error: 'less-than-minimum',
        argument: (Number(chainMinLovelace) / 1_000_000).toString(),
      });
    });

    it('returns null for lovelace when amount meets chain minimumAmount', async () => {
      const chainMinLovelace = BigNumber(840000n);
      const validationResult = await runFormValidator({
        minimumAmount: chainMinLovelace,
        formPartial: {
          tokenTransfers: [
            {
              amount: { value: chainMinLovelace },
              token: {
                value: {
                  tokenId: TokenId('lovelace'),
                  available: BigNumber(10_000_000n),
                  decimals: 6,
                },
              },
            },
          ],
        },
        validateAddress: vi.fn().mockReturnValueOnce(of(None)),
      });

      expect(validationResult[1].error).toBe(null);
    });

    it('returns null when amount is dirty: false (untouched field is not validated)', async () => {
      const validationResult = await runFormValidator({
        formPartial: {
          tokenTransfers: [
            // Below minimum AND over available balance — still no error because
            // the field has not been touched by the user yet.
            { amount: { value: BigNumber(0n), dirty: false } },
          ],
        },
      });

      expect(validationResult[1].error).toBe(null);
    });
  });
});
