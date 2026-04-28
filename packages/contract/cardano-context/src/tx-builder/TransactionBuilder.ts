import { Cardano, Serialization, setInConwayEra } from '@cardano-sdk/core';

import { resolveSlotNo } from '../common/time';
import { LargeFirstCoinSelector } from '../input-selection/LargeFirstCoinSelector';

import { balanceTransaction } from './balancing';

import type { CoinSelector } from '../input-selection/types';
import type { RequiredProtocolParameters } from '../types';

/**
 * A builder class for constructing Cardano transactions with various components like inputs, outputs.
 */
export class TransactionBuilder {
  private readonly params: RequiredProtocolParameters;
  private readonly transaction: Serialization.Transaction;
  private readonly preSelectedUtxos: Cardano.Utxo[] = [];
  private readonly certificates: Cardano.Certificate[] = [];
  private readonly withdrawals: Map<Cardano.RewardAccount, Cardano.Lovelace> =
    new Map();
  private coinSelector: CoinSelector = new LargeFirstCoinSelector();
  private changeAddress?: Cardano.PaymentAddress;
  private availableUtxos: Cardano.Utxo[] = [];
  private networkMagic: Cardano.NetworkMagics;

  /**
   * Creates a new {@link TransactionBuilder}.
   *
   * Initializes an empty transaction body (no inputs/outputs, fee `0n`),
   * and sets Conway era mode for `@cardano-sdk/core` serialization.
   *
   * @param networkMagic - Cardano network magic (e.g. `Mainnet`, `Preprod`, `Preview`).
   * @param params - Protocol parameters to be used during balancing and fee/min-ADA calculations.
   */
  public constructor(
    networkMagic: Cardano.NetworkMagics,
    params: RequiredProtocolParameters,
  ) {
    setInConwayEra(true);
    this.params = params;
    this.transaction = new Serialization.Transaction(
      new Serialization.TransactionBody(
        Serialization.CborSet.fromCore(
          [],
          Serialization.TransactionInput.fromCore,
        ),
        [],
        0n,
        undefined,
      ),
      Serialization.TransactionWitnessSet.fromCore({ signatures: new Map() }),
    );
    this.networkMagic = networkMagic;
  }

  /**
   * Sets the change (return) address used by the balancer when creating a change output.
   *
   * @param address - Bech32 payment address for change.
   * @returns `this` for fluent chaining.
   */
  public setChangeAddress(address: Cardano.PaymentAddress): TransactionBuilder {
    this.changeAddress = address;
    return this;
  }

  /**
   * Replaces the coin selection strategy.
   *
   * @param selector - A {@link CoinSelector} implementation.
   * @returns `this` for fluent chaining.
   */
  public useCoinSelector(selector: CoinSelector): TransactionBuilder {
    this.coinSelector = selector;
    return this;
  }

  /**
   * Sets the network on the transaction body (Mainnet/Testnet) and updates internal `networkMagic`.
   *
   * @param networkMagic - Cardano network magic.
   * @returns `this` for fluent chaining.
   */
  public setNetwork(networkMagic: Cardano.NetworkMagics): TransactionBuilder {
    const body = this.transaction.body();
    const networkId =
      networkMagic === Cardano.NetworkMagics.Mainnet
        ? Cardano.NetworkId.Mainnet
        : Cardano.NetworkId.Testnet;
    body.setNetworkId(networkId);

    this.networkMagic = networkMagic;
    this.transaction.setBody(body);

    return this;
  }

  /**
   * Provides the set of UTxOs that are available for selection during balancing.
   *
   * @param utxos - Available unspent transaction outputs.
   * @returns `this` for fluent chaining.
   */
  public setUnspentOutputs(utxos: Cardano.Utxo[]): TransactionBuilder {
    this.availableUtxos = utxos;
    return this;
  }

  /**
   * Adds a specific input (preselected UTxO) to the transaction.
   *
   * The input is also recorded as "preselected" so the balancer will ensure it remains included.
   *
   * @throws If the same input (same txId and index) is added more than once.
   *
   * @param utxo - The UTxO to add as an input.
   * @returns `this` for fluent chaining.
   */
  public addInput(utxo: Cardano.Utxo): TransactionBuilder {
    const body = this.transaction.body();
    const inputs = body.inputs();
    const values = [...inputs.values()];
    if (
      values.find(
        value =>
          Number(value.index()) == utxo[0].index &&
          value.transactionId() == utxo[0].txId,
      )
    ) {
      throw new Error('Cannot add duplicate input to the transaction');
    }
    values.push(Serialization.TransactionInput.fromCore(utxo[0]));
    inputs.setValues(values);

    body.setInputs(inputs);
    this.transaction.setBody(body);
    this.preSelectedUtxos.push(utxo);

    return this;
  }

  /**
   * Appends a new output to the transaction body.
   *
   * @param output - Core output containing destination address and `Value` (ADA and/or assets).
   * @returns `this` for fluent chaining.
   */
  public addOutput(output: Cardano.TxOut): TransactionBuilder {
    const body = this.transaction.body();

    const outputs = body.outputs();
    outputs.push(Serialization.TransactionOutput.fromCore(output));
    body.setOutputs(outputs);
    this.transaction.setBody(body);

    return this;
  }

  /**
   * Sets the transaction to be valid for a specific duration from now.
   *
   * This is a convenience method that calculates a future expiration date and sets it.
   * The transaction will be marked as invalid if it is not included in a block
   * within the specified duration.
   *
   * @param {number} seconds - The number of seconds from now that the transaction should remain valid.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public expiresIn(seconds: number): TransactionBuilder {
    const body = this.transaction.body();

    const now = Date.now() / 1000;
    const unixTime = Math.floor(now + seconds) * 1000;
    const slot = resolveSlotNo(this.networkMagic, unixTime);

    body.setTtl(slot);
    this.transaction.setBody(body);

    return this;
  }

  /**
   * Adds a transaction output to send a value (lovelace and/or other assets) to an address.
   *
   * @param {string} address - The recipient's address as a bech32 string.
   * @param {Value} value - The value object, containing the coins and/or other assets to send.
   * @returns {TransactionBuilder} The builder instance for chaining.
   */
  public transferValue(
    address: Cardano.PaymentAddress,
    value: Cardano.Value,
  ): TransactionBuilder {
    return this.addOutput({
      address,
      value,
    });
  }

  /**
   * Attaches a memo/message as auxiliary data using label `674` with the `msg` field (CIP-20 style).
   *
   * @param memo - Human-readable memo text.
   * @returns `this` for fluent chaining.
   */
  public setMemo(memo: string): TransactionBuilder {
    const metadata = {
      blob: new Map([[674n, new Map([['msg', [memo]]])]]),
    };
    this.transaction.setAuxiliaryData(
      Serialization.AuxiliaryData.fromCore(metadata),
    );

    return this;
  }

  /**
   * Adds a stake delegation certificate to delegate stake to a pool.
   *
   * @param poolId - The ID of the stake pool to delegate to.
   * @param stakeCredential - The stake credential (key hash or script hash) being delegated.
   * @returns `this` for fluent chaining.
   */
  public addStakeDelegationCertificate(
    poolId: Cardano.PoolId,
    stakeCredential: Cardano.Credential,
  ): TransactionBuilder {
    const certificate: Cardano.StakeDelegationCertificate = {
      __typename: Cardano.CertificateType.StakeDelegation,
      poolId,
      stakeCredential,
    };
    this.certificates.push(certificate);
    return this;
  }

  /**
   * Adds a Conway-era combined stake registration + delegation certificate.
   * This registers the stake key and delegates to a pool in a single certificate.
   *
   * @param poolId - The pool to delegate to.
   * @param stakeCredential - The stake credential to register and delegate.
   * @param deposit - The deposit amount in lovelace.
   * @returns `this` for fluent chaining.
   */
  public addStakeRegistrationDelegationCertificate(
    poolId: Cardano.PoolId,
    stakeCredential: Cardano.Credential,
    deposit: bigint,
  ): TransactionBuilder {
    const certificate: Cardano.StakeRegistrationDelegationCertificate = {
      __typename: Cardano.CertificateType.StakeRegistrationDelegation,
      poolId,
      stakeCredential,
      deposit,
    };
    this.certificates.push(certificate);
    return this;
  }

  /**
   * Adds stake registration certificate.
   * This registers the stake key.
   *
   * @param stakeCredential - The stake credential to register and delegate.
   * @param deposit - The deposit amount in lovelace.
   * @returns `this` for fluent chaining.
   */
  public addNewStakeAddressCertificate(
    stakeCredential: Cardano.Credential,
    deposit: bigint,
  ): TransactionBuilder {
    const certificate: Cardano.NewStakeAddressCertificate = {
      __typename: Cardano.CertificateType.Registration,
      stakeCredential,
      deposit,
    };
    this.certificates.push(certificate);
    return this;
  }

  /**
   * Adds a Conway-era stake unregistration certificate.
   * This de-registers the stake key and returns the deposit.
   *
   * @param stakeCredential - The stake credential to deregister.
   * @param deposit - The deposit amount in lovelace to be returned.
   * @returns `this` for fluent chaining.
   */
  public addStakeDeregistrationCertificate(
    stakeCredential: Cardano.Credential,
    deposit: bigint,
  ): TransactionBuilder {
    const certificate: Cardano.NewStakeAddressCertificate = {
      __typename: Cardano.CertificateType.Unregistration,
      stakeCredential,
      deposit,
    };
    this.certificates.push(certificate);
    return this;
  }

  /**
   * @param rewardAccount - stake address to withdraw rewards from
   * @param amount - amount to withdraw (must match the available amount exactly - either withdraw all or nothing)
   * @returns `this` for fluent chaining.
   */
  public addRewardsWithdrawal(
    rewardAccount: Cardano.RewardAccount,
    amount: Cardano.Lovelace,
  ): TransactionBuilder {
    this.withdrawals.set(rewardAccount, amount);
    return this;
  }

  /**
   * Finalizes and balances the transaction.
   *
   * Steps:
   * 1. Validates that `availableUtxos` and `changeAddress` are set.
   * 2. If auxiliary data is present, computes and sets the `auxiliaryDataHash`.
   * 3. Calls {@link balanceTransaction} to:
   *    - Select inputs (using the configured {@link CoinSelector}, honoring preselected inputs),
   *    - Compute min fee and Min-ADA,
   *    - Create a change output if needed,
   *    - Iterate until the transaction is balanced.
   *
   * @throws Error If no available UTxOs are provided.
   * @throws Error If a change address has not been set.
   * @throws Error If the transaction cannot be balanced by the configured selector.
   *
   * @returns A `Serialization.Transaction` ready for signing.
   */
  public build(): Serialization.Transaction {
    if (
      this.availableUtxos.length === 0 &&
      this.preSelectedUtxos.length === 0
    ) {
      throw new Error('No available UTXOs to select from');
    }

    if (!this.changeAddress) {
      throw new Error('Change address is not set');
    }

    const auxDataHash = Cardano.computeAuxiliaryDataHash(
      this.transaction.auxiliaryData()?.toCore(),
    );
    if (auxDataHash) {
      const body = this.transaction.body();
      body.setAuxiliaryDataHash(auxDataHash);
      this.transaction.setBody(body);
    }
    if (this.withdrawals.size > 0) {
      const body = this.transaction.body();
      body.setWithdrawals(this.withdrawals);
      this.transaction.setBody(body);
    }

    const unbalancedTx = this.transaction.toCore();

    if (this.certificates.length > 0) {
      unbalancedTx.body.certificates = this.certificates;
    }

    const balancedTx = balanceTransaction({
      unbalancedTx,
      availableUtxo: this.availableUtxos,
      protocolParameters: this.params,
      preSelectedUtxo: this.preSelectedUtxos,
      coinSelector: this.coinSelector,
      changeAddress: this.changeAddress,
    });

    return Serialization.Transaction.fromCore(balancedTx);
  }
}
