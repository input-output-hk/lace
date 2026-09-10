import type { CardanoAccount } from './cardano-account';
import type { AnyWallet } from '@lace-contract/wallet-repo';

export const findCardanoAccount = (
  wallet: AnyWallet | undefined,
  blockchainNetworkId: unknown,
): CardanoAccount | undefined =>
  wallet?.accounts.find(
    account =>
      account.blockchainName === 'Cardano' &&
      account.blockchainNetworkId === blockchainNetworkId,
  ) as CardanoAccount | undefined;
