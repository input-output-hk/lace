import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { BlockchainName } from '@lace-lib/util-store';

export type WalletData = { password: AuthSecret; walletName: string };

export type CreateInMemoryWalletProps = WalletData & {
  order: number;
  recoveryPhrase: string[];
  blockchains: BlockchainName[];
};

export type VaultInMemoryAppConfig = {
  faqCopyPasteRecoveryPhraseUrl: string;
  faqRecoveryPhraseUrl: string;
  recoveryPhraseVideoUrl: string;
};
