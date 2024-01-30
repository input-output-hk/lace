/* eslint-disable no-magic-numbers */
import { Cardano } from '@cardano-sdk/core';
// import { Wallet } from '@lace/cardano';

export const TSLA = Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41');
export const PXL = Cardano.AssetId('1ec85dcee27f2d90ec1f9a1e4ce74a667dc9be8b184463223f9c960150584c');
export const Unit = Cardano.AssetId('a5425bd7bc4182325188af2340415827a73f845846c165d9e14c5aed556e6974');

export type TransactionSummaryInspection = {
  assets: Cardano.TokenMap;
  coins: Cardano.Lovelace;
  collateral: Cardano.Lovelace;
  deposit: Cardano.Lovelace;
  returnedDeposit: Cardano.Lovelace;
  fee: Cardano.Lovelace;
  unresolved: {
    inputs: Cardano.TxIn[];
    value: Cardano.Value;
  };
};

const buildValue = (coins: bigint, assets: Array<[Cardano.AssetId, bigint]>): Cardano.Value => ({
  assets: new Map(assets),
  coins
});

// It needs to build an NFT with value more no more than 1, else is not an NFT
// onces it confirms NFT by cardano.assetId
// then we know it's an NFT

// Figure out how AssetInfo works and where it comes from and how it checkes the data
// const buildNftValue =  = (coins: bigint, assets: Array<[Cardano.AssetId, bigint]>, amount: number | string): Cardano.Value => ({
//   assets: new Map(assets),
//   amount: number | string;
// });

// isNFT()
export const transactionSummaryInspector = (): TransactionSummaryInspection => ({
  assets: buildValue(BigInt(0), [
    [Cardano.AssetId('b8fdbcbe003cef7e47eb5307d328e10191952bd02901a850699e7e3500000000000000'), BigInt(1)],
    [Cardano.AssetId('00000000000000000000000000000000000000000000000000000000aaaaaaaaaaaaaa'), BigInt(-1)],
    [Cardano.AssetId('5ba141e401cfebf1929d539e48d14f4b20679c5409526814e0f17121ffffffffffffff'), BigInt(100_000)],
    [TSLA, BigInt(-5)],
    [PXL, BigInt(-6)],
    [Unit, BigInt(-7)]
  ]).assets,
  coins: BigInt(-10_000_000),
  collateral: BigInt(0),
  deposit: BigInt(0),
  returnedDeposit: BigInt(0),
  fee: BigInt(170_000),
  unresolved: {
    inputs: [],
    value: { assets: new Map(), coins: BigInt(0) }
  }
});

// fromAddress: Map<Cardano.PaymentAddress, Cardano.Value>;
//   toAddress: Map<Cardano.PaymentAddress, Cardano.Value>;

// const createValue = [
//   {
//     Wallet.Cardano.PaymentAddress(
//       'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
//     ),
//   },
// ];

// export const tokenTransferInspector = {
//   fromAddress: Map<Cardano.PaymentAddress, Cardano.Value>;
//   toAddress: Map<Cardano.PaymentAddress, Cardano.Value>;
// };
