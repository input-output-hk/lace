import { Wallet } from '@lace/cardano';

export enum ActivityStatus {
  SUCCESS = 'success',
  PENDING = 'sending',
  ERROR = 'error',
  SPENDABLE = 'spendable',
  AWAITING_COSIGNATURES = 'awaiting_cosignatures'
}

export enum TransactionActivityType {
  'outgoing' = 'outgoing',
  'incoming' = 'incoming',
  'self' = 'self',
  'rewards' = 'rewards'
}

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
  type: TransactionActivityType;
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

export interface TransactionDetailsProps {
  hash?: string;
  name: string;
  status?: ActivityStatus;
  /**
   * Transaction generation date
   */
  includedDate?: string;
  /**
   * Transaction generation time
   */
  includedTime?: string;
  assets?: TransactionDetailAsset[];
  /**
   * Input address list
   */
  addrInputs?: TxOutputInput[];
  /**
   * Output address list
   */
  addrOutputs?: TxOutputInput[];
  /**
   * Transaction total output
   */
  totalOutput?: string;
  /**
   * Transaction collateral
   */
  collateral?: string;
  /**
   * Transaction fee
   */
  fee?: string;
  pools?: { name: string; ticker: string; id: string }[];
  /**
   * Transaction deposit
   */
  deposit?: string;
  /**
   * Transaction returned deposit
   */
  depositReclaim?: string;
  /**
   * Transaction metadata
   */
  metadata?: TransactionMetadataProps['metadata'];
  amountTransformer: (amount: string) => string;
  headerDescription?: string;
  txSummary?: TxSummary[];
  coinSymbol: string;
  tooltipContent?: string;
  ownAddresses: string[];
  addressToNameMap: Map<string, string>;
  isPopupView?: boolean;
  handleOpenExternalHashLink?: () => void;
  sendAnalyticsInputs?: () => void;
  sendAnalyticsOutputs?: () => void;
  votingProcedures?: Wallet.Cardano.VotingProcedures;
  proposalProcedures?: Wallet.Cardano.ProposalProcedure[];
  certificates?: Wallet.Cardano.Certificate[];
  chainNetworkId: Wallet.Cardano.NetworkId;
  cardanoCoin: Wallet.CoinId;
  explorerBaseUrl: string;
}
