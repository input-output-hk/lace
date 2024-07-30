/* eslint-disable max-params */
import { Cardano, Serialization } from '@cardano-sdk/core';
import { firstValueFrom } from 'rxjs';

import { ERROR, TX } from '../../config/config';
// import { Loader } from '../loader';
import { blockfrostRequest } from '../util';

import { signTxHW, submitTx } from '.';

import type { OutsideHandlesContextValue } from '../../ui';
import type { UnwitnessedTx } from '@cardano-sdk/tx-construction';
import type { Wallet } from '@lace/cardano';

// const WEIGHTS = Uint32Array.from([
//   200, // weight ideal > 100 inputs
//   1000, // weight ideal < 100 inputs
//   1500, // weight assets if plutus
//   800, // weight assets if not plutus
//   800, // weight distance if not plutus
//   5000, // weight utxos
// ]);

export const initTx = async () => {
  return await Promise.resolve({});
  // const latest_block = await blockfrostRequest('/blocks/latest');
  // const p = await blockfrostRequest(`/epochs/latest/parameters`);
  // return {
  //   linearFee: {
  //     minFeeA: p.min_fee_a.toString(),
  //     minFeeB: p.min_fee_b.toString(),
  //   },
  //   minUtxo: '1000000', //p.min_utxo, minUTxOValue protocol paramter has been removed since Alonzo HF. Calulation of minADA works differently now, but 1 minADA still sufficient for now
  //   poolDeposit: p.pool_deposit,
  //   keyDeposit: p.key_deposit,
  //   coinsPerUtxoWord: p.coins_per_utxo_size.toString(),
  //   maxValSize: p.max_val_size,
  //   priceMem: p.price_mem,
  //   priceStep: p.price_step,
  //   maxTxSize: Number.parseInt(p.max_tx_size),
  //   slot: Number.parseInt(latest_block.slot),
  //   collateralPercentage: Number.parseInt(p.collateral_percent),
  //   maxCollateralInputs: Number.parseInt(p.max_collateral_inputs),
  // };
};

export const buildTx = async (
  output: Serialization.TransactionOutput,
  auxiliaryData: Serialization.AuxiliaryData,
  inMemoryWallet: Wallet.ObservableWallet,
): Promise<Wallet.UnwitnessedTx> => {
  const txBuilder = inMemoryWallet.createTxBuilder();
  const metadata = auxiliaryData.metadata()?.toCore();
  const tip = await firstValueFrom(inMemoryWallet.tip$);
  txBuilder.addOutput(output.toCore());

  if (metadata) {
    txBuilder.metadata(metadata);
  }

  txBuilder.setValidityInterval({
    invalidHereafter: Cardano.Slot(tip.slot + TX.invalid_hereafter),
  });

  const transaction = txBuilder.build();

  return transaction;
};

export const signAndSubmit = async (
  tx: UnwitnessedTx,
  password: string,
  withSignTxConfirmation: OutsideHandlesContextValue['withSignTxConfirmation'],
  inMemoryWallet: Wallet.ObservableWallet,
) =>
  withSignTxConfirmation(async () => {
    const { cbor: signedTx } = await tx.sign();

    const txHash = await submitTx(signedTx, inMemoryWallet);

    return txHash;
  }, password);

export const signAndSubmitHW = async (
  tx: Serialization.Transaction,
  {
    keyHashes,
    account,
    hw,
    partialSign,
  }: Readonly<{ keyHashes: any; account: any; hw: any; partialSign?: boolean }>,
) => {
  const witnessSet = await signTxHW(
    tx.toCbor(),
    keyHashes,
    account,
    hw,
    partialSign,
  );

  const transaction = new Serialization.Transaction(
    tx.body(),
    witnessSet,
    tx.auxiliaryData(),
  );

  try {
    const txHash = await submitTx(transaction.toCbor());
    return txHash;
  } catch {
    throw ERROR.submit;
  }
};

export const delegationTx = async (
  account,
  delegation,
  protocolParameters,
  poolKeyHash,
) => {
  return await Promise.resolve({});
  // await Loader.load();

  // const txBuilderConfig = Loader.Cardano.TransactionBuilderConfigBuilder.new()
  //   .coins_per_utxo_byte(
  //     Loader.Cardano.BigNum.from_str(protocolParameters.coinsPerUtxoWord)
  //   )
  //   .fee_algo(
  //     Loader.Cardano.LinearFee.new(
  //       Loader.Cardano.BigNum.from_str(protocolParameters.linearFee.minFeeA),
  //       Loader.Cardano.BigNum.from_str(protocolParameters.linearFee.minFeeB)
  //     )
  //   )
  //   .key_deposit(Loader.Cardano.BigNum.from_str(protocolParameters.keyDeposit))
  //   .pool_deposit(
  //     Loader.Cardano.BigNum.from_str(protocolParameters.poolDeposit)
  //   )
  //   .max_tx_size(protocolParameters.maxTxSize)
  //   .max_value_size(protocolParameters.maxValSize)
  //   .ex_unit_prices(Loader.Cardano.ExUnitPrices.from_float(0, 0))
  //   .collateral_percentage(protocolParameters.collateralPercentage)
  //   .max_collateral_inputs(protocolParameters.maxCollateralInputs)
  //   .build();

  // const txBuilder = Loader.Cardano.TransactionBuilder.new(txBuilderConfig);

  // if (!delegation.active)
  //   txBuilder.add_certificate(
  //     Loader.Cardano.Certificate.new_stake_registration(
  //       Loader.Cardano.StakeRegistration.new(
  //         Loader.Cardano.StakeCredential.from_keyhash(
  //           Loader.Cardano.Ed25519KeyHash.from_bytes(
  //             Buffer.from(account.stakeKeyHash, 'hex')
  //           )
  //         )
  //       )
  //     )
  //   );

  // txBuilder.add_certificate(
  //   Loader.Cardano.Certificate.new_stake_delegation(
  //     Loader.Cardano.StakeDelegation.new(
  //       Loader.Cardano.StakeCredential.from_keyhash(
  //         Loader.Cardano.Ed25519KeyHash.from_bytes(
  //           Buffer.from(account.stakeKeyHash, 'hex')
  //         )
  //       ),
  //       Loader.Cardano.Ed25519KeyHash.from_bytes(
  //         Buffer.from(poolKeyHash, 'hex')
  //       )
  //     )
  //   )
  // );

  // txBuilder.set_ttl(
  //   Loader.Cardano.BigNum.from_str(
  //     (protocolParameters.slot + TX.invalid_hereafter).toString()
  //   )
  // );

  // const utxos = await getUtxos();

  // const utxosCore = Loader.Cardano.TransactionUnspentOutputs.new();
  // utxos.forEach((utxo) => utxosCore.add(utxo));

  // txBuilder.add_inputs_from(
  //   utxosCore,
  //   Loader.Cardano.Address.from_bech32(account.paymentAddr),
  //   WEIGHTS
  // );

  // txBuilder.balance(Loader.Cardano.Address.from_bech32(account.paymentAddr));

  // const transaction = await txBuilder.construct();

  // return transaction;
};

export const withdrawalTx = async (account, delegation, protocolParameters) => {
  return await Promise.resolve({});
  // await Loader.load();

  // const txBuilderConfig = Loader.Cardano.TransactionBuilderConfigBuilder.new()
  //   .coins_per_utxo_byte(
  //     Loader.Cardano.BigNum.from_str(protocolParameters.coinsPerUtxoWord)
  //   )
  //   .fee_algo(
  //     Loader.Cardano.LinearFee.new(
  //       Loader.Cardano.BigNum.from_str(protocolParameters.linearFee.minFeeA),
  //       Loader.Cardano.BigNum.from_str(protocolParameters.linearFee.minFeeB)
  //     )
  //   )
  //   .key_deposit(Loader.Cardano.BigNum.from_str(protocolParameters.keyDeposit))
  //   .pool_deposit(
  //     Loader.Cardano.BigNum.from_str(protocolParameters.poolDeposit)
  //   )
  //   .max_tx_size(protocolParameters.maxTxSize)
  //   .max_value_size(protocolParameters.maxValSize)
  //   .ex_unit_prices(Loader.Cardano.ExUnitPrices.from_float(0, 0))
  //   .collateral_percentage(protocolParameters.collateralPercentage)
  //   .max_collateral_inputs(protocolParameters.maxCollateralInputs)
  //   .build();

  // const txBuilder = Loader.Cardano.TransactionBuilder.new(txBuilderConfig);

  // txBuilder.add_withdrawal(
  //   Loader.Cardano.RewardAddress.from_address(
  //     Loader.Cardano.Address.from_bech32(account.rewardAddr)
  //   ),
  //   Loader.Cardano.BigNum.from_str(delegation.rewards)
  // );

  // txBuilder.set_ttl(
  //   Loader.Cardano.BigNum.from_str(
  //     (protocolParameters.slot + TX.invalid_hereafter).toString()
  //   )
  // );

  // const utxos = await getUtxos();

  // const utxosCore = Loader.Cardano.TransactionUnspentOutputs.new();
  // utxos.forEach((utxo) => utxosCore.add(utxo));

  // txBuilder.add_inputs_from(
  //   utxosCore,
  //   Loader.Cardano.Address.from_bech32(account.paymentAddr),
  //   WEIGHTS
  // );

  // txBuilder.balance(Loader.Cardano.Address.from_bech32(account.paymentAddr));

  // const transaction = await txBuilder.construct();

  // return transaction;
};

export const undelegateTx = async (account, delegation, protocolParameters) => {
  return await Promise.resolve({});
  // await Loader.load();

  // const txBuilderConfig = Loader.Cardano.TransactionBuilderConfigBuilder.new()
  //   .coins_per_utxo_byte(
  //     Loader.Cardano.BigNum.from_str(protocolParameters.coinsPerUtxoWord)
  //   )
  //   .fee_algo(
  //     Loader.Cardano.LinearFee.new(
  //       Loader.Cardano.BigNum.from_str(protocolParameters.linearFee.minFeeA),
  //       Loader.Cardano.BigNum.from_str(protocolParameters.linearFee.minFeeB)
  //     )
  //   )
  //   .key_deposit(Loader.Cardano.BigNum.from_str(protocolParameters.keyDeposit))
  //   .pool_deposit(
  //     Loader.Cardano.BigNum.from_str(protocolParameters.poolDeposit)
  //   )
  //   .max_tx_size(protocolParameters.maxTxSize)
  //   .max_value_size(protocolParameters.maxValSize)
  //   .ex_unit_prices(Loader.Cardano.ExUnitPrices.from_float(0, 0))
  //   .collateral_percentage(protocolParameters.collateralPercentage)
  //   .max_collateral_inputs(protocolParameters.maxCollateralInputs)
  //   .build();

  // const txBuilder = Loader.Cardano.TransactionBuilder.new(txBuilderConfig);

  // if (delegation.rewards > 0) {
  //   txBuilder.add_withdrawal(
  //     Loader.Cardano.RewardAddress.from_address(
  //       Loader.Cardano.Address.from_bech32(account.rewardAddr)
  //     ),
  //     Loader.Cardano.BigNum.from_str(delegation.rewards)
  //   );
  // }

  // txBuilder.add_certificate(
  //   Loader.Cardano.Certificate.new_stake_deregistration(
  //     Loader.Cardano.StakeDeregistration.new(
  //       Loader.Cardano.StakeCredential.from_keyhash(
  //         Loader.Cardano.Ed25519KeyHash.from_bytes(
  //           Buffer.from(account.stakeKeyHash, 'hex')
  //         )
  //       )
  //     )
  //   )
  // );

  // txBuilder.set_ttl(
  //   Loader.Cardano.BigNum.from_str(
  //     (protocolParameters.slot + TX.invalid_hereafter).toString()
  //   )
  // );

  // const utxos = await getUtxos();

  // const utxosCore = Loader.Cardano.TransactionUnspentOutputs.new();
  // utxos.forEach((utxo) => utxosCore.add(utxo));

  // txBuilder.add_inputs_from(
  //   utxosCore,
  //   Loader.Cardano.Address.from_bech32(account.paymentAddr),
  //   WEIGHTS
  // );

  // txBuilder.balance(Loader.Cardano.Address.from_bech32(account.paymentAddr));

  // const transaction = await txBuilder.construct();

  // return transaction;
};
