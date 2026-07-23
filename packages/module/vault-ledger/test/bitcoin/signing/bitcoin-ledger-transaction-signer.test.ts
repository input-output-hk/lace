import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { WalletId } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-lib/util';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinLedgerTransactionSigner } from '../../../src/bitcoin/signing/bitcoin-ledger-transaction-signer';

import type { BitcoinLedgerTransactionSignerProps } from '../../../src/bitcoin/signing/bitcoin-ledger-transaction-signer';
import type {
  LedgerBitcoinInputSignature,
  LedgerBitcoinTransport,
} from '../../../src/ledger-bitcoin-transport';
import type { BitcoinSignRequest } from '@lace-contract/bitcoin-context';

const PSBT_B64 = 'cHNidC1iYXNlNjQ=';
const SIGNED_TX_HEX = '0200000001signed';

interface Bip32Derivation {
  masterFingerprint: Buffer;
  pubkey: Buffer;
  path: string;
}
interface PartialSig {
  pubkey: Buffer;
  signature: Buffer;
}
interface InputUpdate {
  bip32Derivation?: Bip32Derivation[];
  partialSig?: PartialSig[];
}

const updateInput = vi.hoisted(() =>
  vi.fn<(index: number, update: unknown) => void>(),
);
const finalizeAllInputs = vi.hoisted(() => vi.fn());
const validateSignaturesOfAllInputs = vi.hoisted(() => vi.fn(() => true));
const extractTransaction = vi.hoisted(() =>
  vi.fn(() => ({ toHex: () => SIGNED_TX_HEX })),
);
const psbtFromHex = vi.hoisted(() => vi.fn());

vi.mock('bitcoinjs-lib', () => ({
  Psbt: { fromHex: psbtFromHex },
}));

const signers = [
  {
    publicKeyHex: '02'.padEnd(66, '0'),
    addressType: 'NativeSegWit',
    account: 0,
    chain: 'external',
    index: 0,
    network: 'mainnet',
  },
  {
    publicKeyHex: '03'.padEnd(66, '0'),
    addressType: 'NativeSegWit',
    account: 0,
    chain: 'internal',
    index: 5,
    network: 'mainnet',
  },
];

const deviceSignatures: LedgerBitcoinInputSignature[] = [
  {
    inputIndex: 0,
    pubkey: Buffer.from(signers[0].publicKeyHex, 'hex'),
    signature: Buffer.from('aa01', 'hex'),
  },
  {
    inputIndex: 1,
    pubkey: Buffer.from(signers[1].publicKeyHex, 'hex'),
    signature: Buffer.from('bb01', 'hex'),
  },
];

const stampedDerivation = (call: number): Bip32Derivation =>
  (updateInput.mock.calls[call][1] as InputUpdate).bip32Derivation![0];

const partialSigCalls = (): Array<[number, InputUpdate]> =>
  updateInput.mock.calls
    .filter(([, update]) => (update as InputUpdate).partialSig !== undefined)
    .map(([index, update]) => [index, update as InputUpdate]);

const request = (
  overrides: Partial<{ signers: unknown[]; network: string }> = {},
): BitcoinSignRequest => ({
  serializedTx: HexBytes.fromUTF8(
    JSON.stringify({
      context: 'psbt-hex',
      network: overrides.network ?? 'mainnet',
      signers: overrides.signers ?? signers,
    }),
  ),
});

const makeTransport = (): LedgerBitcoinTransport => ({
  getMasterFingerprint: vi.fn(),
  getExtendedPubkey: vi.fn(),
  signPsbt: vi.fn().mockResolvedValue(deviceSignatures),
});

const makeSigner = (
  transport: LedgerBitcoinTransport,
  overrides: Partial<BitcoinLedgerTransactionSignerProps> = {},
) =>
  new BitcoinLedgerTransactionSigner(
    {
      masterFingerprint: 'deadbeef',
      accountIndex: 0,
      extendedPublicKey: 'xpub-native',
      network: BitcoinNetwork.Mainnet,
      walletId: WalletId('usb-hw-11415-4117-abc123'),
      ...overrides,
    },
    { transport },
  );

describe('BitcoinLedgerTransactionSigner', () => {
  beforeEach(() => {
    updateInput.mockReset();
    finalizeAllInputs.mockReset();
    validateSignaturesOfAllInputs.mockReset().mockReturnValue(true);
    extractTransaction
      .mockReset()
      .mockReturnValue({ toHex: () => SIGNED_TX_HEX });
    psbtFromHex.mockReset().mockReturnValue({
      updateInput,
      toBase64: () => PSBT_B64,
      validateSignaturesOfAllInputs,
      finalizeAllInputs,
      extractTransaction,
    });
  });

  it('signs the stamped PSBT on the device and returns the extracted transaction', async () => {
    const transport = makeTransport();

    const result = await firstValueFrom(makeSigner(transport).sign(request()));

    expect(finalizeAllInputs).toHaveBeenCalledTimes(1);
    expect(JSON.parse(HexBytes.toUTF8(result.serializedTx))).toEqual({
      network: 'mainnet',
      hex: SIGNED_TX_HEX,
    });
  });

  it('sends the PSBT and the wallet policy key origin to the transport', async () => {
    const transport = makeTransport();

    await firstValueFrom(makeSigner(transport).sign(request()));

    expect(transport.signPsbt).toHaveBeenCalledWith(
      {
        kind: 'usb',
        vendorId: 11415,
        productId: 4117,
        serialNumber: 'abc123',
      },
      {
        psbtBase64: PSBT_B64,
        masterFingerprint: 'deadbeef',
        accountPath: "m/84'/0'/0'",
        extendedPublicKey: 'xpub-native',
      },
    );
  });

  it('uses the testnet coin type in the wallet policy account path', async () => {
    const transport = makeTransport();

    await firstValueFrom(
      makeSigner(transport, { network: BitcoinNetwork.Testnet }).sign(
        request(),
      ),
    );

    expect(transport.signPsbt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ accountPath: "m/84'/1'/0'" }),
    );
  });

  it('stamps each input key-origin with the device xfp and native-segwit path', async () => {
    await firstValueFrom(makeSigner(makeTransport()).sign(request()));

    const first = stampedDerivation(0);
    expect(updateInput.mock.calls[0][0]).toBe(0);
    expect(first.path).toBe("m/84'/0'/0'/0/0");
    expect(first.masterFingerprint).toEqual(Buffer.from('deadbeef', 'hex'));
    expect(first.pubkey).toEqual(Buffer.from(signers[0].publicKeyHex, 'hex'));

    expect(updateInput.mock.calls[1][0]).toBe(1);
    expect(stampedDerivation(1).path).toBe("m/84'/0'/0'/1/5");
  });

  it('uses the testnet coin type in the key-origin path for testnet inputs', async () => {
    await firstValueFrom(
      makeSigner(makeTransport(), { network: BitcoinNetwork.Testnet }).sign(
        request({
          network: 'testnet4',
          signers: [{ ...signers[0], network: 'testnet4' }],
        }),
      ),
    );

    expect(stampedDerivation(0).path).toBe("m/84'/1'/0'/0/0");
  });

  it('applies each device signature as a partialSig before finalizing', async () => {
    await firstValueFrom(makeSigner(makeTransport()).sign(request()));

    const applied = partialSigCalls();
    expect(applied).toHaveLength(2);
    expect(applied[0][0]).toBe(0);
    expect(applied[0][1].partialSig![0]).toEqual({
      pubkey: Buffer.from(signers[0].publicKeyHex, 'hex'),
      signature: Buffer.from('aa01', 'hex'),
    });
    expect(applied[1][0]).toBe(1);

    const lastPartialSigCall = updateInput.mock.invocationCallOrder.at(-1)!;
    expect(lastPartialSigCall).toBeLessThan(
      finalizeAllInputs.mock.invocationCallOrder[0],
    );
    expect(finalizeAllInputs.mock.invocationCallOrder[0]).toBeLessThan(
      extractTransaction.mock.invocationCallOrder[0],
    );
  });

  it('performs no device I/O before subscription', () => {
    const transport = makeTransport();

    makeSigner(transport).sign(request());

    expect(transport.signPsbt).not.toHaveBeenCalled();
    expect(psbtFromHex).not.toHaveBeenCalled();
  });

  it('throws when the device returns no signatures', async () => {
    const transport = makeTransport();
    vi.mocked(transport.signPsbt).mockResolvedValue([]);

    await expect(
      firstValueFrom(makeSigner(transport).sign(request())),
    ).rejects.toThrow('Ledger returned no signatures');
    expect(finalizeAllInputs).not.toHaveBeenCalled();
  });

  it('throws without finalizing when a device signature fails validation', async () => {
    const transport = makeTransport();
    validateSignaturesOfAllInputs.mockReturnValue(false);

    await expect(
      firstValueFrom(makeSigner(transport).sign(request())),
    ).rejects.toThrow('Ledger returned an invalid signature');
    expect(finalizeAllInputs).not.toHaveBeenCalled();
  });

  it('propagates a transport failure', async () => {
    const transport = makeTransport();
    vi.mocked(transport.signPsbt).mockRejectedValue(
      new Error('Ledger device disconnected'),
    );

    await expect(
      firstValueFrom(makeSigner(transport).sign(request())),
    ).rejects.toThrow('Ledger device disconnected');
  });
});
