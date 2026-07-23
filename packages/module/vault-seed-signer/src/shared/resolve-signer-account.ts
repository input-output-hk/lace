import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';

export interface ResolveSignerAccountProps {
  wallet: AnyWallet;
  accountId: AccountId;
  canSign: (account: AnyAccount) => boolean;
  factoryName: string;
}

/**
 * Looks up the account a signer factory was asked to sign for and verifies
 * the factory supports it. Throws with the factory name when the account is
 * missing or of an unsupported type.
 */
export const resolveSignerAccount = ({
  wallet,
  accountId,
  canSign,
  factoryName,
}: ResolveSignerAccountProps): AnyAccount => {
  const account = wallet.accounts.find(a => a.accountId === accountId);
  if (!account || !canSign(account)) {
    throw new Error(
      `${factoryName} does not support account type: ${
        account?.accountType ?? 'unknown'
      }`,
    );
  }
  return account;
};
