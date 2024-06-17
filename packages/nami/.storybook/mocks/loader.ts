export const Loader = {
  load() {},

  get Cardano() {
    return {
      BigNum: {
        from_str: () => {},
      },
      Address: {
        from_bech32: () => {},
      },
      Value: {
        new: () => {},
      },
      TransactionOutputs: {
        new: () => ({
          add: () => {},
        }),
      },
      TransactionOutput: {
        new: () => ({
          add: () => {},
        }),
      },
    };
  },

  get Message() {
    return {};
  },
};
