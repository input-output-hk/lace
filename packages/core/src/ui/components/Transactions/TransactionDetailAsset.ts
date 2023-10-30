export interface TransactionDetailAsset {
  icon?: string;
  title: string;
  subtitle?: string;
}

export interface CoinItemProps {
  amount: string;
  fiatBalance?: string;
  handleClick: () => unknown;
  id: number | string;
  logo?: string;
  name: string;
  symbol?: string;
}

export interface TxOutputInput {
  addr: string;
  amount: string;
  assetList?: CoinItemProps[];
}

export interface TxSummary extends Omit<TxOutputInput, 'addr'> {
  addr: string[];
}

interface TxMetadata {
  key: string;
  value: string | unknown[];
}

export interface TransactionMetadataProps {
  /**
   * List of key/value pairs with the transaction metadata
   */
  metadata: TxMetadata[];
}

/* export type TransactionCertificate = {
  __typename: string; // todo resolve
  deposit?: BigInt;
  dRep?: Wallet.Cardano.DelegateRepresentative;
  coldCredential?: Wallet.Cardano.Credential;
  hotCredential?: Wallet.Cardano.Credential;
  dRepCredential?: Wallet.Cardano.Credential;
  anchor?: {
    url:string;
    dataHash:string
  };
};

export type TransactionGovernanceProposal = {
  deposit: BigInt;
  rewardAccount: string;
  anchor: {
    url: string;
    hash:string;
  };
  governanceAction: {
    __typename: Wallet.Cardano.GovernanceActionType;
    governanceActionId?: {
      index: number;
      hash: string
    };
    protocolParamUpdate?: Wallet.Cardano.ProtocolParametersUpdate;
    protocolVersion?: {
      major: number;
      minor:number;
      patch?:number;
    };
    withdrawals?: Set<{
      rewardAccount: string;
      coin: BigInt;
    }>;
    membersToBeRemoved?: Set<{
      type: string;
      hash:string;
    }>;
    membersToBeAdded?: Set<Wallet.Cardano.CommitteeMember>;
    newQuorumThreshold?: Wallet.Cardano.Fraction;
    constitution?: Wallet.Cardano.Constitution;
  };
};*/
