/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';

export const sendingAddress = {
  address: Wallet.Cardano.PaymentAddress(
    'addr_test1qq585l3hyxgj3nas2v3xymd23vvartfhceme6gv98aaeg9muzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q2g7k3g'
  )
} as Wallet.KeyManagement.GroupedAddress;

export const receivingAddress = Wallet.Cardano.PaymentAddress(
  'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz'
);

export const buildMockTx = (
  args: {
    inputs?: Wallet.Cardano.HydratedTxIn[];
    outputs?: Wallet.Cardano.TxOut[];
    certificates?: Wallet.Cardano.Certificate[];
    withdrawals?: Wallet.Cardano.Withdrawal[];
    votingProcedures?: Wallet.Cardano.VotingProcedures;
    proposalProcedures?: Wallet.Cardano.ProposalProcedure[];
  } = {}
): Wallet.Cardano.HydratedTx =>
  ({
    auxiliaryData: {
      blob: new Map([[BigInt(1), 'metadataMock']])
    },
    blockHeader: {
      blockNo: Wallet.Cardano.BlockNo(200),
      hash: Wallet.Cardano.BlockId('0dbe461fb5f981c0d01615332b8666340eb1a692b3034f46bcb5f5ea4172b2ed'),
      slot: Wallet.Cardano.Slot(1000)
    },
    body: {
      certificates: args.certificates,
      fee: BigInt(170_000),
      mint: new Map([
        [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'), BigInt(3)]
      ]),
      proposalProcedures: args.proposalProcedures || undefined,
      votingProcedures: args.votingProcedures || undefined,
      inputs: args.inputs ?? [
        {
          address: sendingAddress.address,
          index: 0,
          txId: Wallet.Cardano.TransactionId('bb217abaca60fc0ca68c1555eca6a96d2478547818ae76ce6836133f3cc546e0')
        }
      ],
      outputs: args.outputs ?? [
        {
          address: receivingAddress,
          value: { coins: BigInt(5_000_000) }
        },
        {
          address: receivingAddress,
          value: {
            assets: new Map([
              [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'), BigInt(3)],
              [Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'), BigInt(4)]
            ]),
            coins: BigInt(2_000_000)
          }
        },
        {
          address: receivingAddress,
          value: {
            assets: new Map([
              [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'), BigInt(6)]
            ]),
            coins: BigInt(2_000_000)
          }
        },
        {
          address: sendingAddress.address,
          value: {
            assets: new Map([
              [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'), BigInt(1)]
            ]),
            coins: BigInt(2_000_000)
          }
        }
      ],
      validityInterval: {},
      withdrawals: args.withdrawals
    },
    id: Wallet.Cardano.TransactionId('e3a443363eb6ee3d67c5e75ec10b931603787581a948d68fa3b2cd3ff2e0d2ad'),
    index: 0
  } as Wallet.Cardano.HydratedTx);
