import { ApiError } from '@cardano-sdk/dapp-connector';
import { Wallet } from '@lace/cardano';
import { cip30 as walletCip30 } from '@cardano-sdk/wallet';

interface BaseCollateralProps {
  dappInfo: Wallet.DappInfo;
  collateralInfo: { amount: walletCip30.GetCollateralCallbackParams['data']['amount'] };
  reject: (reason: ApiError) => void;
}

export interface DappSetCollateralProps extends BaseCollateralProps {
  collateralInfo: BaseCollateralProps['collateralInfo'] & { lockableAmount: BigInt };
  confirm: () => void;
}

export interface DappCreateCollateralProps extends BaseCollateralProps {
  confirm: (utxos?: Wallet.Cardano.Utxo[]) => void;
}

export interface CollateralAmount {
  amount: walletCip30.GetCollateralCallbackParams['data']['amount'];
}

export interface CollateralAmountWithCollateralAmount extends CollateralAmount {
  lockableAmount: BigInt;
}
