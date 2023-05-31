import { Wallet } from '@lace/cardano';
import { PromiseResolvedType } from './util';

export type CardanoTxBuild = PromiseResolvedType<Wallet.ObservableWallet['initializeTx']>;
export type CardanoTxOutAddress = Wallet.Cardano.TxOut['address'];
export type CardanoTxOutValue = Wallet.Cardano.TxOut['value'];
export type CardanoTxOut = Wallet.Cardano.TxOut;
export type CardanoTxIn = Wallet.Cardano.HydratedTxIn;
export type CardanoWalletToken = Wallet.Cardano.TokenMap;
export type CardanoCertificate = Wallet.Cardano.Certificate;
export type CardanoStakePool = Wallet.Cardano.StakePool;
export type CardanoMinimumCoinQty = Wallet.InitializeTxPropsValidationResult['minimumCoinQuantities'];
