import { Wallet } from '@lace/cardano';
import { QuorumOptionValue, QuorumRadioOption } from '../creation-flow/Quorum';

type Tag = 'any' | 'all' | 'n_of_k' | 'pubkey' | 'timelock_start' | 'timelock_expiry';

export const getQuorumRulesByTag = (tag: Tag, n?: number): QuorumOptionValue | null => {
  switch (tag) {
    case 'any': {
      return { option: QuorumRadioOption.Any };
    }
    case 'all': {
      return { option: QuorumRadioOption.AllAddresses };
    }
    case 'n_of_k': {
      return { numberOfCosigner: n, option: QuorumRadioOption.NOfK };
    }
    default:
      return null;
  }
};

export const getHashFromPublicKey = async (
  publicKey: string,
  scriptKeyPath: Wallet.KeyManagement.AccountKeyDerivationPath,
): Promise<Wallet.Crypto.Ed25519KeyHashHex> =>
  await Wallet.util.deriveEd25519KeyHashFromBip32PublicKey(Wallet.Crypto.Bip32PublicKeyHex(publicKey), scriptKeyPath);
