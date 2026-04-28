import { getI18n } from '@lace-contract/i18n';
import {
  isShieldedAddress,
  isUnshieldedAddress,
  MidnightNetworkId,
} from '@lace-contract/midnight-context';

import type { ComputeTxRestrictions, TxRestrictions } from '@lace-contract/app';

type MidnightTokenKind = 'shielded' | 'unshielded';

const getTokenKind = (
  blockchainSpecific: unknown,
): MidnightTokenKind | undefined => {
  const kind = (blockchainSpecific as { kind?: string } | undefined)?.kind;
  if (kind === 'shielded') return 'shielded';
  if (kind === 'unshielded') return 'unshielded';
  return undefined;
};

const getAddressKind = (
  address: string,
  rawNetworkId: string,
): MidnightTokenKind | undefined => {
  const networkId = MidnightNetworkId.getNetworkNameId(
    rawNetworkId as MidnightNetworkId,
  );
  if (!networkId) return undefined;
  try {
    if (isShieldedAddress(address, networkId)) return 'shielded';
    if (isUnshieldedAddress(address, networkId)) return 'unshielded';
  } catch {
    return undefined;
  }
  return undefined;
};

export const computeTxRestrictions: ComputeTxRestrictions = ({
  tokens,
  selectedTokenIds,
  existingTransferTokens,
  recipientAddress,
  networkId,
}) => {
  const t = getI18n().t;
  const emptyResult: TxRestrictions = {
    tokenRestrictions: { disabledTokenIds: new Set(), messages: [] },
    addressRestrictions: { isRestricted: false, messages: [] },
  };

  const addressKind = recipientAddress
    ? getAddressKind(recipientAddress, networkId)
    : undefined;

  let lockedKind: MidnightTokenKind | undefined = addressKind;

  if (!lockedKind) {
    for (const transfer of existingTransferTokens) {
      const kind = getTokenKind(transfer.blockchainSpecific);
      if (kind) {
        lockedKind = kind;
        break;
      }
    }
  }

  if (!lockedKind) {
    const selectedSet = new Set(selectedTokenIds);
    for (const token of tokens) {
      if (selectedSet.has(token.tokenId)) {
        const kind = getTokenKind(token.blockchainSpecific);
        if (kind) {
          lockedKind = kind;
          break;
        }
      }
    }
  }

  if (!lockedKind) return emptyResult;

  const tokenTypeLabel = lockedKind === 'shielded' ? 'Shielded' : 'Unshielded';

  const disabledTokenIds = new Set<string>();
  for (const token of tokens) {
    const kind = getTokenKind(token.blockchainSpecific);
    if (kind !== undefined && kind !== lockedKind) {
      disabledTokenIds.add(token.tokenId);
    }
  }

  const tokenMessages: string[] = [];
  if (addressKind) {
    tokenMessages.push(
      t('v2.send-flow.asset-select.address-type-info', {
        type: tokenTypeLabel,
      }),
    );
  } else {
    tokenMessages.push(
      t('v2.send-flow.asset-select.type-restriction', { type: tokenTypeLabel }),
    );
  }

  return {
    tokenRestrictions: {
      disabledTokenIds,
      messages: tokenMessages,
    },
    addressRestrictions: {
      isRestricted: lockedKind === 'shielded',
      messages: [],
    },
  };
};
