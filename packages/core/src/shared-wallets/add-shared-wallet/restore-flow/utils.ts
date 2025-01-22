import { Wallet } from '@lace/cardano';
import { QuorumOptionValue, QuorumRadioOption } from '../creation-flow/Quorum';

type TagsNotRequiringCoSigners = 'any' | 'all' | 'pubkey' | 'timelock_start' | 'timelock_expiry';
type TagRequiringCoSigners = 'n_of_k';

type tagOptionsNotRequiringNumberOfCosigners = {
  tag: TagsNotRequiringCoSigners;
};

type tagOptionsRequiringNumberOfCosigners = {
  n: number;
  tag: TagRequiringCoSigners;
};

type tagOptions = tagOptionsNotRequiringNumberOfCosigners | tagOptionsRequiringNumberOfCosigners;

export const getQuorumRulesByTag = (props: tagOptions): QuorumOptionValue | null => {
  switch (props.tag) {
    case 'any': {
      return { option: QuorumRadioOption.Any };
    }
    case 'all': {
      return { option: QuorumRadioOption.AllAddresses };
    }
    case 'n_of_k': {
      return { numberOfCosigner: props.n, option: QuorumRadioOption.NOfK };
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
