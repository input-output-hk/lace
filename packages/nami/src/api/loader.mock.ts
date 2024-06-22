/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable functional/immutable-data */
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
    new: () => void 0,
  },
  encode_json_str_to_metadatum: () => void 0,
};

Loader.Message = {};
