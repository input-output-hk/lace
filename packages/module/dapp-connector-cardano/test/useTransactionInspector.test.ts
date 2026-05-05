import { describe, expect, it } from 'vitest';

import {
  formatLovelaceToAda,
  inspectTransaction,
} from '../src/common/utils/transaction-inspector';

// Sample valid transaction CBOR for testing
// This is a real Cardano transaction with multiple outputs and assets
const VALID_TX_CBOR =
  '84a60081825820260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f01018383581d70b429738bd6cc58b5c7932d001aa2bd05cfea47020a556c8c753d44361a004c4b40582007845f8f3841996e3d8157954e2f5e2fb90465f27112fc5fe9056d916fae245b82583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba1a0463676982583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba821a00177a6ea2581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a5447742544319271044774554481a0031f9194577444f47451a0056898d4577555344431a000fc589467753484942411a000103c2581c659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a7a14a57696e675269646572731a02269552021a0002e665031a01353f84081a013531740b58204107eada931c72a600a6e3305bd22c7aeb9ada7c3f6823b155f4db85de36a69aa20081825820e686ade5bc97372f271fd2abc06cfd96c24b3d9170f9459de1d8e3dd8fd385575840653324a9dddad004f05a8ac99fa2d1811af5f00543591407fb5206cfe9ac91bb1412404323fa517e0e189684cd3592e7f74862e3f16afbc262519abec958180c0481d8799fd8799fd8799fd8799f581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68ffd8799fd8799fd8799f581c042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339baffffffff581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c681b000001863784a12ed8799fd8799f4040ffd8799f581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff1984577444f4745ffffffd8799fd87980190c8efffff5f6';

// Simple valid transaction CBOR (balanced transaction with one asset)
const SIMPLE_TX_CBOR =
  '84a300d9010282825820027b68d4c11e97d7e065cc2702912cb1a21b6d0e56c6a74dd605889a5561138500825820d3c887d17486d483a2b46b58b01cb9344745f15fdd8f8e70a57f854cdd88a633010182a2005839005cf6c91279a859a072601779fb33bb07c34e1d641d45df51ff63b967f15db05f56035465bf8900a09bdaa16c3d8b8244fea686524408dd8001821a00e4e1c0a1581c0b0d621b5c26d0a1fd0893a4b04c19d860296a69ede1fbcfc5179882a1474e46542d30303101a200583900dc435fc2638f6684bd1f9f6f917d80c92ae642a4a33a412e516479e64245236ab8056760efceebbff57e8cab220182be3e36439e520a6454011a0d294e28021a00029eb9a0f5f6';

describe('inspectTransaction', () => {
  describe('with valid transaction', () => {
    it('parses transaction and returns basic info', async () => {
      const result = await inspectTransaction(VALID_TX_CBOR);

      expect(result.error).toBeNull();
      expect(result.isLoading).toBe(false);
      expect(result.transactionInfo).not.toBeNull();

      const info = result.transactionInfo!;
      expect(info.inputsCount).toBe(1);
      expect(info.outputsCount).toBe(3);
      expect(info.fee).toBe(190053n);
    });

    it('extracts transaction outputs', async () => {
      const result = await inspectTransaction(VALID_TX_CBOR);
      const info = result.transactionInfo!;

      expect(info.outputs).toHaveLength(3);

      // First output
      expect(info.outputs[0].address).toContain('addr');
      expect(info.outputs[0].value).toBe(5000000n);

      // Third output has assets
      expect(info.outputs[2].assets.length).toBeGreaterThan(0);
    });

    it('detects metadata presence', async () => {
      const result = await inspectTransaction(VALID_TX_CBOR);
      const info = result.transactionInfo!;

      // This transaction does not have auxiliary data (metadata)
      expect(info.hasMetadata).toBe(false);
    });

    it('detects TTL/validity interval', async () => {
      const result = await inspectTransaction(VALID_TX_CBOR);
      const info = result.transactionInfo!;

      // Cardano.Slot is a number type, not bigint
      expect(info.ttl).toBe(20266884);
      expect(info.validityIntervalStart).toBe(20263284);
    });
  });

  describe('with simple transaction', () => {
    it('parses simple transaction', async () => {
      const result = await inspectTransaction(SIMPLE_TX_CBOR);

      expect(result.error).toBeNull();
      expect(result.transactionInfo).not.toBeNull();

      const info = result.transactionInfo!;
      // SIMPLE_TX_CBOR has 2 inputs and 2 outputs
      expect(info.inputsCount).toBe(2);
      expect(info.outputsCount).toBe(2);
    });

    it('reports no collateral, certificates, or withdrawals', async () => {
      const result = await inspectTransaction(SIMPLE_TX_CBOR);
      const info = result.transactionInfo!;

      expect(info.hasCollateral).toBe(false);
      expect(info.collateralInputsCount).toBe(0);
      expect(info.hasCertificates).toBe(false);
      expect(info.certificatesCount).toBe(0);
      expect(info.hasWithdrawals).toBe(false);
      expect(info.hasMint).toBe(false);
    });
  });

  describe('with invalid input', () => {
    it('returns error for empty string', async () => {
      const result = await inspectTransaction('');

      expect(result.transactionInfo).toBeNull();
      expect(result.error).toBe('No transaction data provided');
      expect(result.isLoading).toBe(false);
    });

    it('returns error for invalid CBOR', async () => {
      const result = await inspectTransaction('not-valid-cbor');

      expect(result.transactionInfo).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.isLoading).toBe(false);
    });

    it('returns error for malformed hex', async () => {
      const result = await inspectTransaction('84a4zzzz');

      expect(result.transactionInfo).toBeNull();
      expect(result.error).not.toBeNull();
    });
  });
});

describe('formatLovelaceToAda', () => {
  it('converts lovelace to ADA', () => {
    expect(formatLovelaceToAda(1_000_000n)).toBe('1.00');
    expect(formatLovelaceToAda(2_500_000n)).toBe('2.50');
    expect(formatLovelaceToAda(190053n)).toBe('0.190053');
  });

  it('handles large values', () => {
    expect(formatLovelaceToAda(45_000_000_000_000n)).toBe('45,000,000.00');
  });

  it('handles zero', () => {
    expect(formatLovelaceToAda(0n)).toBe('0.00');
  });

  it('handles small fractions', () => {
    expect(formatLovelaceToAda(1n)).toBe('0.000001');
  });
});
