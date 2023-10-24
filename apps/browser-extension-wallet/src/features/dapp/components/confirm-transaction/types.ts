import { Wallet } from '@lace/cardano';
import { DappDataService } from '@lib/scripts/types';

export type GetSignTxData = DappDataService['getSignTxData'];
export type SignTxData = { dappInfo: Wallet.DappInfo; tx: Wallet.Cardano.Tx };
