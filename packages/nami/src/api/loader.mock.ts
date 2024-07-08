/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable functional/immutable-data */

import { currentAccount } from '../mocks/account.mock';

/* eslint-disable @typescript-eslint/explicit-function-return-type */
export const Loader = (): any => void 0;
Loader.load = async () => await Promise.resolve(true);
Loader.Cardano = {
  TransactionOutput: {
    new: () => ({
      add: () => void 0,
    }),
  },
  TransactionOutputs: {
    new: () => ({
      add: () => void 0,
    }),
  },
  Transaction: {
    from_bytes: () => ({
      body: () => ({
        fee: () => ({ to_str: () => '214341' }),
        outputs: () => ({
          len: () => 1,
          get: () => ({
            datum: () => void 0,
            amount: () => void 0,
            address: () => ({
              to_bytes: () => [
                0, 232, 252, 40, 72, 12, 115, 72, 109, 40, 128, 116, 197, 172,
                118, 96, 173, 6, 17, 174, 92, 229, 5, 222, 25, 67, 83, 70, 105,
                97, 234, 112, 175, 29, 231, 23, 149, 223, 82, 230, 45, 28, 15,
                44, 136, 23, 241, 59, 92, 212, 180, 14, 4, 202, 181, 173, 106,
              ],
              to_bech32: () => currentAccount.paymentKeyHashBech32,
            }),
          }),
        }),
        collateral: () => ({ len: () => 0 }),
        certs: () => ({ len: () => 0 }),
        withdrawals: () => ({ keys: () => ({ len: () => 0 }) }),
        required_signers: () => ({ len: () => 0 }),
        mint: () => ({ len: () => 0 }),
        script_data_hash: () => ({ len: () => 0 }),
      }),
      witness_set: () => ({
        native_scripts: () => ({ len: () => 0 }),
      }),
      auxiliary_data: () => ({
        metadata: () => ({
          get: () => void 0,
          keys: () => ({ len: () => 1, get: () => ({ to_str: () => '674' }) }),
        }),
      }),
    }),
  },
  AuxiliaryData: {
    new: () => ({
      set_metadata: () => void 0,
      metadata: () => void 0,
    }),
  },
  GeneralTransactionMetadata: {
    new: () => ({
      insert: () => void 0,
      len: () => void 0,
    }),
  },
  Address: {
    from_bech32: () => void 0,
    from_bytes: () => void 0,
  },
  TransactionUnspentOutput: {
    from_bytes: () => void 0,
  },
  BigNum: {
    from_str: () => void 0,
  },
  Value: {
    zero: () => void 0,
    new: () => ({
      checked_add: () => void 0,
    }),
  },
  encode_json_str_to_metadatum: () => void 0,
  decode_metadatum_to_json_str: () => '{"msg":["Swap request"]}',
};

Loader.Message = {};
