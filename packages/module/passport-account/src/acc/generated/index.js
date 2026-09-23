import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.18.0-rc.1');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

const _descriptor_1 = new __compactRuntime.CompactTypeBytes(32);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_2 = new _ContractAddress_0();

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_4 = __compactRuntime.CompactTypeSecp256k1Point;

const _descriptor_5 = __compactRuntime.CompactTypeSecp256k1Scalar;

class _Secp256k1EcdsaSignature_0 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_5.alignment());
  }
  fromValue(value_0) {
    return {
      r: _descriptor_5.fromValue(value_0),
      s: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0.r).concat(_descriptor_5.toValue(value_0.s));
  }
}

const _descriptor_6 = new _Secp256k1EcdsaSignature_0();

const _descriptor_7 = __compactRuntime.CompactTypeJubjubPoint;

const _descriptor_8 = __compactRuntime.CompactTypeField;

const _descriptor_9 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ShieldedCoinInfo_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_9.alignment()));
  }
  fromValue(value_0) {
    return {
      nonce: _descriptor_1.fromValue(value_0),
      color: _descriptor_1.fromValue(value_0),
      value: _descriptor_9.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.nonce).concat(_descriptor_1.toValue(value_0.color).concat(_descriptor_9.toValue(value_0.value)));
  }
}

const _descriptor_10 = new _ShieldedCoinInfo_0();

const _descriptor_11 = __compactRuntime.CompactTypeBoolean;

class _Maybe_0 {
  alignment() {
    return _descriptor_11.alignment().concat(_descriptor_10.alignment());
  }
  fromValue(value_0) {
    return {
      is_some: _descriptor_11.fromValue(value_0),
      value: _descriptor_10.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_11.toValue(value_0.is_some).concat(_descriptor_10.toValue(value_0.value));
  }
}

const _descriptor_12 = new _Maybe_0();

class _tuple_0 {
  alignment() {
    return _descriptor_10.alignment().concat(_descriptor_12.alignment());
  }
  fromValue(value_0) {
    return [
      _descriptor_10.fromValue(value_0),
      _descriptor_12.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_10.toValue(value_0[0]).concat(_descriptor_12.toValue(value_0[1]));
  }
}

const _descriptor_13 = new _tuple_0();

class _ZswapCoinPublicKey_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_14 = new _ZswapCoinPublicKey_0();

const _descriptor_15 = new __compactRuntime.CompactTypeBytes(192);

class _UserAddress_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_16 = new _UserAddress_0();

const _descriptor_17 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

class _QualifiedShieldedCoinInfo_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_9.alignment().concat(_descriptor_3.alignment())));
  }
  fromValue(value_0) {
    return {
      nonce: _descriptor_1.fromValue(value_0),
      color: _descriptor_1.fromValue(value_0),
      value: _descriptor_9.fromValue(value_0),
      mt_index: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.nonce).concat(_descriptor_1.toValue(value_0.color).concat(_descriptor_9.toValue(value_0.value).concat(_descriptor_3.toValue(value_0.mt_index))));
  }
}

const _descriptor_18 = new _QualifiedShieldedCoinInfo_0();

const _descriptor_19 = __compactRuntime.CompactTypeSecp256k1Base;

class _Either_0 {
  alignment() {
    return _descriptor_11.alignment().concat(_descriptor_14.alignment().concat(_descriptor_2.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_11.fromValue(value_0),
      left: _descriptor_14.fromValue(value_0),
      right: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_11.toValue(value_0.is_left).concat(_descriptor_14.toValue(value_0.left).concat(_descriptor_2.toValue(value_0.right)));
  }
}

const _descriptor_20 = new _Either_0();

const _descriptor_21 = __compactRuntime.CompactTypeField;

class _tuple_1 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_3.alignment())))));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_3.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]).concat(_descriptor_1.toValue(value_0[2]).concat(_descriptor_1.toValue(value_0[3]).concat(_descriptor_1.toValue(value_0[4]).concat(_descriptor_3.toValue(value_0[5]))))));
  }
}

const _descriptor_22 = new _tuple_1();

const _descriptor_23 = new __compactRuntime.CompactTypeBytes(21);

class _CoinPreimage_0 {
  alignment() {
    return _descriptor_23.alignment().concat(_descriptor_10.alignment().concat(_descriptor_11.alignment().concat(_descriptor_1.alignment())));
  }
  fromValue(value_0) {
    return {
      domain_sep: _descriptor_23.fromValue(value_0),
      info: _descriptor_10.fromValue(value_0),
      dataType: _descriptor_11.fromValue(value_0),
      data: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_23.toValue(value_0.domain_sep).concat(_descriptor_10.toValue(value_0.info).concat(_descriptor_11.toValue(value_0.dataType).concat(_descriptor_1.toValue(value_0.data))));
  }
}

const _descriptor_24 = new _CoinPreimage_0();

class _tuple_2 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_15.alignment().concat(_descriptor_3.alignment())))));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_15.fromValue(value_0),
      _descriptor_3.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]).concat(_descriptor_1.toValue(value_0[2]).concat(_descriptor_1.toValue(value_0[3]).concat(_descriptor_15.toValue(value_0[4]).concat(_descriptor_3.toValue(value_0[5]))))));
  }
}

const _descriptor_25 = new _tuple_2();

const _descriptor_26 = new __compactRuntime.CompactTypeBytes(64);

class _tuple_3 {
  alignment() {
    return _descriptor_26.alignment();
  }
  fromValue(value_0) {
    return [
      _descriptor_26.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_26.toValue(value_0[0]);
  }
}

const _descriptor_27 = new _tuple_3();

class _tuple_4 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_14.alignment().concat(_descriptor_1.alignment().concat(_descriptor_9.alignment().concat(_descriptor_18.alignment().concat(_descriptor_3.alignment()))))))));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_14.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_9.fromValue(value_0),
      _descriptor_18.fromValue(value_0),
      _descriptor_3.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]).concat(_descriptor_1.toValue(value_0[2]).concat(_descriptor_1.toValue(value_0[3]).concat(_descriptor_14.toValue(value_0[4]).concat(_descriptor_1.toValue(value_0[5]).concat(_descriptor_9.toValue(value_0[6]).concat(_descriptor_18.toValue(value_0[7]).concat(_descriptor_3.toValue(value_0[8])))))))));
  }
}

const _descriptor_28 = new _tuple_4();

class _tuple_5 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_9.alignment().concat(_descriptor_18.alignment().concat(_descriptor_3.alignment()))))))));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_9.fromValue(value_0),
      _descriptor_18.fromValue(value_0),
      _descriptor_3.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]).concat(_descriptor_1.toValue(value_0[2]).concat(_descriptor_1.toValue(value_0[3]).concat(_descriptor_2.toValue(value_0[4]).concat(_descriptor_1.toValue(value_0[5]).concat(_descriptor_9.toValue(value_0[6]).concat(_descriptor_18.toValue(value_0[7]).concat(_descriptor_3.toValue(value_0[8])))))))));
  }
}

const _descriptor_29 = new _tuple_5();

class _tuple_6 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_7.alignment().concat(_descriptor_7.alignment().concat(_descriptor_1.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment()))))));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_7.fromValue(value_0),
      _descriptor_7.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_3.fromValue(value_0),
      _descriptor_3.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]).concat(_descriptor_7.toValue(value_0[2]).concat(_descriptor_7.toValue(value_0[3]).concat(_descriptor_1.toValue(value_0[4]).concat(_descriptor_3.toValue(value_0[5]).concat(_descriptor_3.toValue(value_0[6])))))));
  }
}

const _descriptor_30 = new _tuple_6();

class _tuple_7 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_9.alignment().concat(_descriptor_16.alignment().concat(_descriptor_3.alignment())))))));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_9.fromValue(value_0),
      _descriptor_16.fromValue(value_0),
      _descriptor_3.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]).concat(_descriptor_1.toValue(value_0[2]).concat(_descriptor_1.toValue(value_0[3]).concat(_descriptor_1.toValue(value_0[4]).concat(_descriptor_9.toValue(value_0[5]).concat(_descriptor_16.toValue(value_0[6]).concat(_descriptor_3.toValue(value_0[7]))))))));
  }
}

const _descriptor_31 = new _tuple_7();

class _tuple_8 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_7.alignment().concat(_descriptor_7.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_9.alignment().concat(_descriptor_18.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment())))))))));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_7.fromValue(value_0),
      _descriptor_7.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_9.fromValue(value_0),
      _descriptor_18.fromValue(value_0),
      _descriptor_3.fromValue(value_0),
      _descriptor_3.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]).concat(_descriptor_7.toValue(value_0[2]).concat(_descriptor_7.toValue(value_0[3]).concat(_descriptor_2.toValue(value_0[4]).concat(_descriptor_1.toValue(value_0[5]).concat(_descriptor_9.toValue(value_0[6]).concat(_descriptor_18.toValue(value_0[7]).concat(_descriptor_3.toValue(value_0[8]).concat(_descriptor_3.toValue(value_0[9]))))))))));
  }
}

const _descriptor_32 = new _tuple_8();

class _tuple_9 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_7.alignment().concat(_descriptor_7.alignment().concat(_descriptor_15.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment()))))));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_7.fromValue(value_0),
      _descriptor_7.fromValue(value_0),
      _descriptor_15.fromValue(value_0),
      _descriptor_3.fromValue(value_0),
      _descriptor_3.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]).concat(_descriptor_7.toValue(value_0[2]).concat(_descriptor_7.toValue(value_0[3]).concat(_descriptor_15.toValue(value_0[4]).concat(_descriptor_3.toValue(value_0[5]).concat(_descriptor_3.toValue(value_0[6])))))));
  }
}

const _descriptor_33 = new _tuple_9();

class _tuple_10 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_7.alignment().concat(_descriptor_7.alignment().concat(_descriptor_1.alignment().concat(_descriptor_9.alignment().concat(_descriptor_16.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment()))))))));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_7.fromValue(value_0),
      _descriptor_7.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_9.fromValue(value_0),
      _descriptor_16.fromValue(value_0),
      _descriptor_3.fromValue(value_0),
      _descriptor_3.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]).concat(_descriptor_7.toValue(value_0[2]).concat(_descriptor_7.toValue(value_0[3]).concat(_descriptor_1.toValue(value_0[4]).concat(_descriptor_9.toValue(value_0[5]).concat(_descriptor_16.toValue(value_0[6]).concat(_descriptor_3.toValue(value_0[7]).concat(_descriptor_3.toValue(value_0[8])))))))));
  }
}

const _descriptor_34 = new _tuple_10();

class _tuple_11 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_7.alignment().concat(_descriptor_7.alignment().concat(_descriptor_14.alignment().concat(_descriptor_1.alignment().concat(_descriptor_9.alignment().concat(_descriptor_18.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment())))))))));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_7.fromValue(value_0),
      _descriptor_7.fromValue(value_0),
      _descriptor_14.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_9.fromValue(value_0),
      _descriptor_18.fromValue(value_0),
      _descriptor_3.fromValue(value_0),
      _descriptor_3.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]).concat(_descriptor_7.toValue(value_0[2]).concat(_descriptor_7.toValue(value_0[3]).concat(_descriptor_14.toValue(value_0[4]).concat(_descriptor_1.toValue(value_0[5]).concat(_descriptor_9.toValue(value_0[6]).concat(_descriptor_18.toValue(value_0[7]).concat(_descriptor_3.toValue(value_0[8]).concat(_descriptor_3.toValue(value_0[9]))))))))));
  }
}

const _descriptor_35 = new _tuple_11();

class _tuple_12 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_7.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment()))));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_7.fromValue(value_0),
      _descriptor_0.fromValue(value_0),
      _descriptor_3.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]).concat(_descriptor_7.toValue(value_0[2]).concat(_descriptor_0.toValue(value_0[3]).concat(_descriptor_3.toValue(value_0[4])))));
  }
}

const _descriptor_36 = new _tuple_12();

class _tuple_13 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment())))));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_2.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_0.fromValue(value_0),
      _descriptor_3.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_2.toValue(value_0[1]).concat(_descriptor_1.toValue(value_0[2]).concat(_descriptor_1.toValue(value_0[3]).concat(_descriptor_0.toValue(value_0[4]).concat(_descriptor_3.toValue(value_0[5]))))));
  }
}

const _descriptor_37 = new _tuple_13();

class _tuple_14 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_7.alignment()));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_7.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_1.toValue(value_0[1]).concat(_descriptor_7.toValue(value_0[2])));
  }
}

const _descriptor_38 = new _tuple_14();

class _tuple_15 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment())));
  }
  fromValue(value_0) {
    return [
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0),
      _descriptor_1.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0[0]).concat(_descriptor_1.toValue(value_0[1]).concat(_descriptor_1.toValue(value_0[2]).concat(_descriptor_1.toValue(value_0[3]))));
  }
}

const _descriptor_39 = new _tuple_15();

const _descriptor_40 = new __compactRuntime.CompactTypeVector(2, _descriptor_8);

class _Either_1 {
  alignment() {
    return _descriptor_11.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_11.fromValue(value_0),
      left: _descriptor_1.fromValue(value_0),
      right: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_11.toValue(value_0.is_left).concat(_descriptor_1.toValue(value_0.left).concat(_descriptor_1.toValue(value_0.right)));
  }
}

const _descriptor_41 = new _Either_1();

class _Either_2 {
  alignment() {
    return _descriptor_11.alignment().concat(_descriptor_2.alignment().concat(_descriptor_16.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_11.fromValue(value_0),
      left: _descriptor_2.fromValue(value_0),
      right: _descriptor_16.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_11.toValue(value_0.is_left).concat(_descriptor_2.toValue(value_0.left).concat(_descriptor_16.toValue(value_0.right)));
  }
}

const _descriptor_42 = new _Either_2();

class _ShieldedSendResult_0 {
  alignment() {
    return _descriptor_12.alignment().concat(_descriptor_10.alignment());
  }
  fromValue(value_0) {
    return {
      change: _descriptor_12.fromValue(value_0),
      sent: _descriptor_10.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_12.toValue(value_0.change).concat(_descriptor_10.toValue(value_0.sent));
  }
}

const _descriptor_43 = new _ShieldedSendResult_0();

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.held_coin) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named held_coin');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      activate_initial_device_with_jubjub: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`activate_initial_device_with_jubjub: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const pk_0 = args_1[1];
        const salt_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('activate_initial_device_with_jubjub',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 246 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(salt_0.buffer instanceof ArrayBuffer && salt_0.BYTES_PER_ELEMENT === 1 && salt_0.length === 32)) {
          __compactRuntime.typeError('activate_initial_device_with_jubjub',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'account.compact line 246 char 1',
                                     'Bytes<32>',
                                     salt_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_7.toValue(pk_0).concat(_descriptor_1.toValue(salt_0)),
            alignment: _descriptor_7.alignment().concat(_descriptor_1.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._activate_initial_device_with_jubjub_0(context,
                                                                           partialProofData,
                                                                           pk_0,
                                                                           salt_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      activate_initial_device_with_k256: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`activate_initial_device_with_k256: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const pk_0 = args_1[1];
        const salt_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('activate_initial_device_with_k256',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 256 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(salt_0.buffer instanceof ArrayBuffer && salt_0.BYTES_PER_ELEMENT === 1 && salt_0.length === 32)) {
          __compactRuntime.typeError('activate_initial_device_with_k256',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'account.compact line 256 char 1',
                                     'Bytes<32>',
                                     salt_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_4.toValue(pk_0).concat(_descriptor_1.toValue(salt_0)),
            alignment: _descriptor_4.alignment().concat(_descriptor_1.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._activate_initial_device_with_k256_0(context,
                                                                         partialProofData,
                                                                         pk_0,
                                                                         salt_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      async derive_boot_commitment_with_jubjub(context, ...args_1) {
        return { result: pureCircuits.derive_boot_commitment_with_jubjub(...args_1), context };
      },
      async derive_boot_commitment_with_k256(context, ...args_1) {
        return { result: pureCircuits.derive_boot_commitment_with_k256(...args_1), context };
      },
      async derive_device_entry_with_jubjub(context, ...args_1) {
        return { result: pureCircuits.derive_device_entry_with_jubjub(...args_1), context };
      },
      async derive_device_entry_with_k256(context, ...args_1) {
        return { result: pureCircuits.derive_device_entry_with_k256(...args_1), context };
      },
      async compute_public_point_with_jubjub(context, ...args_1) {
        return { result: pureCircuits.compute_public_point_with_jubjub(...args_1), context };
      },
      async compute_public_point_with_k256(context, ...args_1) {
        return { result: pureCircuits.compute_public_point_with_k256(...args_1), context };
      },
      async challenge_withdraw_unshielded_with_jubjub(context, ...args_1) {
        return { result: pureCircuits.challenge_withdraw_unshielded_with_jubjub(...args_1), context };
      },
      async challenge_withdraw_shielded_with_jubjub(context, ...args_1) {
        return { result: pureCircuits.challenge_withdraw_shielded_with_jubjub(...args_1), context };
      },
      async challenge_withdraw_shielded_to_contract_with_jubjub(context, ...args_1) {
        return { result: pureCircuits.challenge_withdraw_shielded_to_contract_with_jubjub(...args_1), context };
      },
      async challenge_append_inbox_with_jubjub(context, ...args_1) {
        return { result: pureCircuits.challenge_append_inbox_with_jubjub(...args_1), context };
      },
      async challenge_rotate_enc_key_with_jubjub(context, ...args_1) {
        return { result: pureCircuits.challenge_rotate_enc_key_with_jubjub(...args_1), context };
      },
      async challenge_add_device_with_jubjub(context, ...args_1) {
        return { result: pureCircuits.challenge_add_device_with_jubjub(...args_1), context };
      },
      async challenge_remove_device_with_jubjub(context, ...args_1) {
        return { result: pureCircuits.challenge_remove_device_with_jubjub(...args_1), context };
      },
      async challenge_withdraw_unshielded_with_k256(context, ...args_1) {
        return { result: pureCircuits.challenge_withdraw_unshielded_with_k256(...args_1), context };
      },
      async challenge_withdraw_shielded_with_k256(context, ...args_1) {
        return { result: pureCircuits.challenge_withdraw_shielded_with_k256(...args_1), context };
      },
      async challenge_withdraw_shielded_to_contract_with_k256(context, ...args_1) {
        return { result: pureCircuits.challenge_withdraw_shielded_to_contract_with_k256(...args_1), context };
      },
      async challenge_append_inbox_with_k256(context, ...args_1) {
        return { result: pureCircuits.challenge_append_inbox_with_k256(...args_1), context };
      },
      async challenge_rotate_enc_key_with_k256(context, ...args_1) {
        return { result: pureCircuits.challenge_rotate_enc_key_with_k256(...args_1), context };
      },
      async challenge_add_device_with_k256(context, ...args_1) {
        return { result: pureCircuits.challenge_add_device_with_k256(...args_1), context };
      },
      async challenge_remove_device_with_k256(context, ...args_1) {
        return { result: pureCircuits.challenge_remove_device_with_k256(...args_1), context };
      },
      deposit_unshielded: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`deposit_unshielded: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const color_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('deposit_unshielded',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 839 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('deposit_unshielded',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 839 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('deposit_unshielded',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'account.compact line 839 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(color_0).concat(_descriptor_9.toValue(amount_0)),
            alignment: _descriptor_1.alignment().concat(_descriptor_9.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._deposit_unshielded_0(context,
                                                          partialProofData,
                                                          color_0,
                                                          amount_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      withdraw_unshielded_with_jubjub: async (...args_1) => {
        if (args_1.length !== 9) {
          throw new __compactRuntime.CompactError(`withdraw_unshielded_with_jubjub: expected 9 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const color_0 = args_1[1];
        const amount_0 = args_1[2];
        const recipient_0 = args_1[3];
        const pk_0 = args_1[4];
        const use_counter_0 = args_1[5];
        const sig_r_0 = args_1[6];
        const sig_s_0 = args_1[7];
        const grind_nonce_0 = args_1[8];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('withdraw_unshielded_with_jubjub',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 849 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('withdraw_unshielded_with_jubjub',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 849 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('withdraw_unshielded_with_jubjub',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'account.compact line 849 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
          __compactRuntime.typeError('withdraw_unshielded_with_jubjub',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 849 char 1',
                                     'struct UserAddress<bytes: Bytes<32>>',
                                     recipient_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('withdraw_unshielded_with_jubjub',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'account.compact line 849 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_s_0) === 'bigint' && sig_s_0 >= 0 && sig_s_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('withdraw_unshielded_with_jubjub',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'account.compact line 849 char 1',
                                     'Field',
                                     sig_s_0)
        }
        if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('withdraw_unshielded_with_jubjub',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'account.compact line 849 char 1',
                                     'Uint<0..18446744073709551616>',
                                     grind_nonce_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(color_0).concat(_descriptor_9.toValue(amount_0).concat(_descriptor_16.toValue(recipient_0).concat(_descriptor_7.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_7.toValue(sig_r_0).concat(_descriptor_8.toValue(sig_s_0).concat(_descriptor_3.toValue(grind_nonce_0)))))))),
            alignment: _descriptor_1.alignment().concat(_descriptor_9.alignment().concat(_descriptor_16.alignment().concat(_descriptor_7.alignment().concat(_descriptor_3.alignment().concat(_descriptor_7.alignment().concat(_descriptor_8.alignment().concat(_descriptor_3.alignment())))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._withdraw_unshielded_with_jubjub_0(context,
                                                                       partialProofData,
                                                                       color_0,
                                                                       amount_0,
                                                                       recipient_0,
                                                                       pk_0,
                                                                       use_counter_0,
                                                                       sig_r_0,
                                                                       sig_s_0,
                                                                       grind_nonce_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      withdraw_unshielded_with_k256: async (...args_1) => {
        if (args_1.length !== 7) {
          throw new __compactRuntime.CompactError(`withdraw_unshielded_with_k256: expected 7 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const color_0 = args_1[1];
        const amount_0 = args_1[2];
        const recipient_0 = args_1[3];
        const pk_0 = args_1[4];
        const use_counter_0 = args_1[5];
        const sig_0 = args_1[6];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('withdraw_unshielded_with_k256',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 866 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('withdraw_unshielded_with_k256',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 866 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('withdraw_unshielded_with_k256',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'account.compact line 866 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
          __compactRuntime.typeError('withdraw_unshielded_with_k256',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 866 char 1',
                                     'struct UserAddress<bytes: Bytes<32>>',
                                     recipient_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('withdraw_unshielded_with_k256',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'account.compact line 866 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_0) === 'object' && typeof(sig_0.r) === 'bigint' && sig_0.r >= 0 && sig_0.r <= __compactRuntime.MAX_SECP256K1_SCALAR && typeof(sig_0.s) === 'bigint' && sig_0.s >= 0 && sig_0.s <= __compactRuntime.MAX_SECP256K1_SCALAR)) {
          __compactRuntime.typeError('withdraw_unshielded_with_k256',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'account.compact line 866 char 1',
                                     'struct Secp256k1EcdsaSignature<r: Secp256k1Scalar, s: Secp256k1Scalar>',
                                     sig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(color_0).concat(_descriptor_9.toValue(amount_0).concat(_descriptor_16.toValue(recipient_0).concat(_descriptor_4.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_6.toValue(sig_0)))))),
            alignment: _descriptor_1.alignment().concat(_descriptor_9.alignment().concat(_descriptor_16.alignment().concat(_descriptor_4.alignment().concat(_descriptor_3.alignment().concat(_descriptor_6.alignment())))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._withdraw_unshielded_with_k256_0(context,
                                                                     partialProofData,
                                                                     color_0,
                                                                     amount_0,
                                                                     recipient_0,
                                                                     pk_0,
                                                                     use_counter_0,
                                                                     sig_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      deposit_shielded: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`deposit_shielded: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const coin_0 = args_1[1];
        const entry_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('deposit_shielded',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 887 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('deposit_shielded',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 887 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     coin_0)
        }
        if (!(entry_0.buffer instanceof ArrayBuffer && entry_0.BYTES_PER_ELEMENT === 1 && entry_0.length === 192)) {
          __compactRuntime.typeError('deposit_shielded',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'account.compact line 887 char 1',
                                     'Bytes<192>',
                                     entry_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_10.toValue(coin_0).concat(_descriptor_15.toValue(entry_0)),
            alignment: _descriptor_10.alignment().concat(_descriptor_15.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._deposit_shielded_0(context,
                                                        partialProofData,
                                                        coin_0,
                                                        entry_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      append_inbox_with_jubjub: async (...args_1) => {
        if (args_1.length !== 7) {
          throw new __compactRuntime.CompactError(`append_inbox_with_jubjub: expected 7 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const entry_0 = args_1[1];
        const pk_0 = args_1[2];
        const use_counter_0 = args_1[3];
        const sig_r_0 = args_1[4];
        const sig_s_0 = args_1[5];
        const grind_nonce_0 = args_1[6];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('append_inbox_with_jubjub',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 898 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(entry_0.buffer instanceof ArrayBuffer && entry_0.BYTES_PER_ELEMENT === 1 && entry_0.length === 192)) {
          __compactRuntime.typeError('append_inbox_with_jubjub',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 898 char 1',
                                     'Bytes<192>',
                                     entry_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('append_inbox_with_jubjub',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 898 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_s_0) === 'bigint' && sig_s_0 >= 0 && sig_s_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('append_inbox_with_jubjub',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'account.compact line 898 char 1',
                                     'Field',
                                     sig_s_0)
        }
        if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('append_inbox_with_jubjub',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'account.compact line 898 char 1',
                                     'Uint<0..18446744073709551616>',
                                     grind_nonce_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_15.toValue(entry_0).concat(_descriptor_7.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_7.toValue(sig_r_0).concat(_descriptor_8.toValue(sig_s_0).concat(_descriptor_3.toValue(grind_nonce_0)))))),
            alignment: _descriptor_15.alignment().concat(_descriptor_7.alignment().concat(_descriptor_3.alignment().concat(_descriptor_7.alignment().concat(_descriptor_8.alignment().concat(_descriptor_3.alignment())))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._append_inbox_with_jubjub_0(context,
                                                                partialProofData,
                                                                entry_0,
                                                                pk_0,
                                                                use_counter_0,
                                                                sig_r_0,
                                                                sig_s_0,
                                                                grind_nonce_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      append_inbox_with_k256: async (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`append_inbox_with_k256: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const entry_0 = args_1[1];
        const pk_0 = args_1[2];
        const use_counter_0 = args_1[3];
        const sig_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('append_inbox_with_k256',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 913 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(entry_0.buffer instanceof ArrayBuffer && entry_0.BYTES_PER_ELEMENT === 1 && entry_0.length === 192)) {
          __compactRuntime.typeError('append_inbox_with_k256',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 913 char 1',
                                     'Bytes<192>',
                                     entry_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('append_inbox_with_k256',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 913 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_0) === 'object' && typeof(sig_0.r) === 'bigint' && sig_0.r >= 0 && sig_0.r <= __compactRuntime.MAX_SECP256K1_SCALAR && typeof(sig_0.s) === 'bigint' && sig_0.s >= 0 && sig_0.s <= __compactRuntime.MAX_SECP256K1_SCALAR)) {
          __compactRuntime.typeError('append_inbox_with_k256',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'account.compact line 913 char 1',
                                     'struct Secp256k1EcdsaSignature<r: Secp256k1Scalar, s: Secp256k1Scalar>',
                                     sig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_15.toValue(entry_0).concat(_descriptor_4.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_6.toValue(sig_0)))),
            alignment: _descriptor_15.alignment().concat(_descriptor_4.alignment().concat(_descriptor_3.alignment().concat(_descriptor_6.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._append_inbox_with_k256_0(context,
                                                              partialProofData,
                                                              entry_0,
                                                              pk_0,
                                                              use_counter_0,
                                                              sig_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      withdraw_shielded_with_jubjub: async (...args_1) => {
        if (args_1.length !== 9) {
          throw new __compactRuntime.CompactError(`withdraw_shielded_with_jubjub: expected 9 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const recipient_0 = args_1[1];
        const color_0 = args_1[2];
        const amount_0 = args_1[3];
        const pk_0 = args_1[4];
        const use_counter_0 = args_1[5];
        const sig_r_0 = args_1[6];
        const sig_s_0 = args_1[7];
        const grind_nonce_0 = args_1[8];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('withdraw_shielded_with_jubjub',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 932 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
          __compactRuntime.typeError('withdraw_shielded_with_jubjub',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 932 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     recipient_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('withdraw_shielded_with_jubjub',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'account.compact line 932 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('withdraw_shielded_with_jubjub',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 932 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('withdraw_shielded_with_jubjub',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'account.compact line 932 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_s_0) === 'bigint' && sig_s_0 >= 0 && sig_s_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('withdraw_shielded_with_jubjub',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'account.compact line 932 char 1',
                                     'Field',
                                     sig_s_0)
        }
        if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('withdraw_shielded_with_jubjub',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'account.compact line 932 char 1',
                                     'Uint<0..18446744073709551616>',
                                     grind_nonce_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_14.toValue(recipient_0).concat(_descriptor_1.toValue(color_0).concat(_descriptor_9.toValue(amount_0).concat(_descriptor_7.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_7.toValue(sig_r_0).concat(_descriptor_8.toValue(sig_s_0).concat(_descriptor_3.toValue(grind_nonce_0)))))))),
            alignment: _descriptor_14.alignment().concat(_descriptor_1.alignment().concat(_descriptor_9.alignment().concat(_descriptor_7.alignment().concat(_descriptor_3.alignment().concat(_descriptor_7.alignment().concat(_descriptor_8.alignment().concat(_descriptor_3.alignment())))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._withdraw_shielded_with_jubjub_0(context,
                                                                     partialProofData,
                                                                     recipient_0,
                                                                     color_0,
                                                                     amount_0,
                                                                     pk_0,
                                                                     use_counter_0,
                                                                     sig_r_0,
                                                                     sig_s_0,
                                                                     grind_nonce_0);
        partialProofData.output = { value: _descriptor_12.toValue(result_0), alignment: _descriptor_12.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      withdraw_shielded_with_k256: async (...args_1) => {
        if (args_1.length !== 7) {
          throw new __compactRuntime.CompactError(`withdraw_shielded_with_k256: expected 7 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const recipient_0 = args_1[1];
        const color_0 = args_1[2];
        const amount_0 = args_1[3];
        const pk_0 = args_1[4];
        const use_counter_0 = args_1[5];
        const sig_0 = args_1[6];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('withdraw_shielded_with_k256',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 950 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
          __compactRuntime.typeError('withdraw_shielded_with_k256',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 950 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     recipient_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('withdraw_shielded_with_k256',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'account.compact line 950 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('withdraw_shielded_with_k256',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 950 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('withdraw_shielded_with_k256',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'account.compact line 950 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_0) === 'object' && typeof(sig_0.r) === 'bigint' && sig_0.r >= 0 && sig_0.r <= __compactRuntime.MAX_SECP256K1_SCALAR && typeof(sig_0.s) === 'bigint' && sig_0.s >= 0 && sig_0.s <= __compactRuntime.MAX_SECP256K1_SCALAR)) {
          __compactRuntime.typeError('withdraw_shielded_with_k256',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'account.compact line 950 char 1',
                                     'struct Secp256k1EcdsaSignature<r: Secp256k1Scalar, s: Secp256k1Scalar>',
                                     sig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_14.toValue(recipient_0).concat(_descriptor_1.toValue(color_0).concat(_descriptor_9.toValue(amount_0).concat(_descriptor_4.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_6.toValue(sig_0)))))),
            alignment: _descriptor_14.alignment().concat(_descriptor_1.alignment().concat(_descriptor_9.alignment().concat(_descriptor_4.alignment().concat(_descriptor_3.alignment().concat(_descriptor_6.alignment())))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._withdraw_shielded_with_k256_0(context,
                                                                   partialProofData,
                                                                   recipient_0,
                                                                   color_0,
                                                                   amount_0,
                                                                   pk_0,
                                                                   use_counter_0,
                                                                   sig_0);
        partialProofData.output = { value: _descriptor_12.toValue(result_0), alignment: _descriptor_12.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      withdraw_shielded_to_contract_with_jubjub: async (...args_1) => {
        if (args_1.length !== 9) {
          throw new __compactRuntime.CompactError(`withdraw_shielded_to_contract_with_jubjub: expected 9 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const recipient_0 = args_1[1];
        const color_0 = args_1[2];
        const amount_0 = args_1[3];
        const pk_0 = args_1[4];
        const use_counter_0 = args_1[5];
        const sig_r_0 = args_1[6];
        const sig_s_0 = args_1[7];
        const grind_nonce_0 = args_1[8];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('withdraw_shielded_to_contract_with_jubjub',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 980 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
          __compactRuntime.typeError('withdraw_shielded_to_contract_with_jubjub',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 980 char 1',
                                     'struct ContractAddress<bytes: Bytes<32>>',
                                     recipient_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('withdraw_shielded_to_contract_with_jubjub',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'account.compact line 980 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('withdraw_shielded_to_contract_with_jubjub',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 980 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('withdraw_shielded_to_contract_with_jubjub',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'account.compact line 980 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_s_0) === 'bigint' && sig_s_0 >= 0 && sig_s_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('withdraw_shielded_to_contract_with_jubjub',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'account.compact line 980 char 1',
                                     'Field',
                                     sig_s_0)
        }
        if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('withdraw_shielded_to_contract_with_jubjub',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'account.compact line 980 char 1',
                                     'Uint<0..18446744073709551616>',
                                     grind_nonce_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(recipient_0).concat(_descriptor_1.toValue(color_0).concat(_descriptor_9.toValue(amount_0).concat(_descriptor_7.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_7.toValue(sig_r_0).concat(_descriptor_8.toValue(sig_s_0).concat(_descriptor_3.toValue(grind_nonce_0)))))))),
            alignment: _descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_9.alignment().concat(_descriptor_7.alignment().concat(_descriptor_3.alignment().concat(_descriptor_7.alignment().concat(_descriptor_8.alignment().concat(_descriptor_3.alignment())))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._withdraw_shielded_to_contract_with_jubjub_0(context,
                                                                                 partialProofData,
                                                                                 recipient_0,
                                                                                 color_0,
                                                                                 amount_0,
                                                                                 pk_0,
                                                                                 use_counter_0,
                                                                                 sig_r_0,
                                                                                 sig_s_0,
                                                                                 grind_nonce_0);
        partialProofData.output = { value: _descriptor_13.toValue(result_0), alignment: _descriptor_13.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      withdraw_shielded_to_contract_with_k256: async (...args_1) => {
        if (args_1.length !== 7) {
          throw new __compactRuntime.CompactError(`withdraw_shielded_to_contract_with_k256: expected 7 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const recipient_0 = args_1[1];
        const color_0 = args_1[2];
        const amount_0 = args_1[3];
        const pk_0 = args_1[4];
        const use_counter_0 = args_1[5];
        const sig_0 = args_1[6];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('withdraw_shielded_to_contract_with_k256',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 998 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
          __compactRuntime.typeError('withdraw_shielded_to_contract_with_k256',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 998 char 1',
                                     'struct ContractAddress<bytes: Bytes<32>>',
                                     recipient_0)
        }
        if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
          __compactRuntime.typeError('withdraw_shielded_to_contract_with_k256',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'account.compact line 998 char 1',
                                     'Bytes<32>',
                                     color_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('withdraw_shielded_to_contract_with_k256',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 998 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('withdraw_shielded_to_contract_with_k256',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'account.compact line 998 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_0) === 'object' && typeof(sig_0.r) === 'bigint' && sig_0.r >= 0 && sig_0.r <= __compactRuntime.MAX_SECP256K1_SCALAR && typeof(sig_0.s) === 'bigint' && sig_0.s >= 0 && sig_0.s <= __compactRuntime.MAX_SECP256K1_SCALAR)) {
          __compactRuntime.typeError('withdraw_shielded_to_contract_with_k256',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'account.compact line 998 char 1',
                                     'struct Secp256k1EcdsaSignature<r: Secp256k1Scalar, s: Secp256k1Scalar>',
                                     sig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(recipient_0).concat(_descriptor_1.toValue(color_0).concat(_descriptor_9.toValue(amount_0).concat(_descriptor_4.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_6.toValue(sig_0)))))),
            alignment: _descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_9.alignment().concat(_descriptor_4.alignment().concat(_descriptor_3.alignment().concat(_descriptor_6.alignment())))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._withdraw_shielded_to_contract_with_k256_0(context,
                                                                               partialProofData,
                                                                               recipient_0,
                                                                               color_0,
                                                                               amount_0,
                                                                               pk_0,
                                                                               use_counter_0,
                                                                               sig_0);
        partialProofData.output = { value: _descriptor_13.toValue(result_0), alignment: _descriptor_13.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      rotate_enc_key_with_jubjub: async (...args_1) => {
        if (args_1.length !== 7) {
          throw new __compactRuntime.CompactError(`rotate_enc_key_with_jubjub: expected 7 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const new_key_0 = args_1[1];
        const pk_0 = args_1[2];
        const use_counter_0 = args_1[3];
        const sig_r_0 = args_1[4];
        const sig_s_0 = args_1[5];
        const grind_nonce_0 = args_1[6];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('rotate_enc_key_with_jubjub',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 1020 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(new_key_0.buffer instanceof ArrayBuffer && new_key_0.BYTES_PER_ELEMENT === 1 && new_key_0.length === 32)) {
          __compactRuntime.typeError('rotate_enc_key_with_jubjub',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 1020 char 1',
                                     'Bytes<32>',
                                     new_key_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('rotate_enc_key_with_jubjub',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 1020 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_s_0) === 'bigint' && sig_s_0 >= 0 && sig_s_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('rotate_enc_key_with_jubjub',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'account.compact line 1020 char 1',
                                     'Field',
                                     sig_s_0)
        }
        if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('rotate_enc_key_with_jubjub',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'account.compact line 1020 char 1',
                                     'Uint<0..18446744073709551616>',
                                     grind_nonce_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(new_key_0).concat(_descriptor_7.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_7.toValue(sig_r_0).concat(_descriptor_8.toValue(sig_s_0).concat(_descriptor_3.toValue(grind_nonce_0)))))),
            alignment: _descriptor_1.alignment().concat(_descriptor_7.alignment().concat(_descriptor_3.alignment().concat(_descriptor_7.alignment().concat(_descriptor_8.alignment().concat(_descriptor_3.alignment())))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._rotate_enc_key_with_jubjub_0(context,
                                                                  partialProofData,
                                                                  new_key_0,
                                                                  pk_0,
                                                                  use_counter_0,
                                                                  sig_r_0,
                                                                  sig_s_0,
                                                                  grind_nonce_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      rotate_enc_key_with_k256: async (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`rotate_enc_key_with_k256: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const new_key_0 = args_1[1];
        const pk_0 = args_1[2];
        const use_counter_0 = args_1[3];
        const sig_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('rotate_enc_key_with_k256',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 1035 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(new_key_0.buffer instanceof ArrayBuffer && new_key_0.BYTES_PER_ELEMENT === 1 && new_key_0.length === 32)) {
          __compactRuntime.typeError('rotate_enc_key_with_k256',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 1035 char 1',
                                     'Bytes<32>',
                                     new_key_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('rotate_enc_key_with_k256',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 1035 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_0) === 'object' && typeof(sig_0.r) === 'bigint' && sig_0.r >= 0 && sig_0.r <= __compactRuntime.MAX_SECP256K1_SCALAR && typeof(sig_0.s) === 'bigint' && sig_0.s >= 0 && sig_0.s <= __compactRuntime.MAX_SECP256K1_SCALAR)) {
          __compactRuntime.typeError('rotate_enc_key_with_k256',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'account.compact line 1035 char 1',
                                     'struct Secp256k1EcdsaSignature<r: Secp256k1Scalar, s: Secp256k1Scalar>',
                                     sig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(new_key_0).concat(_descriptor_4.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_6.toValue(sig_0)))),
            alignment: _descriptor_1.alignment().concat(_descriptor_4.alignment().concat(_descriptor_3.alignment().concat(_descriptor_6.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._rotate_enc_key_with_k256_0(context,
                                                                partialProofData,
                                                                new_key_0,
                                                                pk_0,
                                                                use_counter_0,
                                                                sig_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      add_device_with_jubjub: async (...args_1) => {
        if (args_1.length !== 7) {
          throw new __compactRuntime.CompactError(`add_device_with_jubjub: expected 7 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const new_entry_0 = args_1[1];
        const pk_0 = args_1[2];
        const use_counter_0 = args_1[3];
        const sig_r_0 = args_1[4];
        const sig_s_0 = args_1[5];
        const grind_nonce_0 = args_1[6];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('add_device_with_jubjub',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 1114 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(new_entry_0.buffer instanceof ArrayBuffer && new_entry_0.BYTES_PER_ELEMENT === 1 && new_entry_0.length === 32)) {
          __compactRuntime.typeError('add_device_with_jubjub',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 1114 char 1',
                                     'Bytes<32>',
                                     new_entry_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('add_device_with_jubjub',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 1114 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_s_0) === 'bigint' && sig_s_0 >= 0 && sig_s_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('add_device_with_jubjub',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'account.compact line 1114 char 1',
                                     'Field',
                                     sig_s_0)
        }
        if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('add_device_with_jubjub',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'account.compact line 1114 char 1',
                                     'Uint<0..18446744073709551616>',
                                     grind_nonce_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(new_entry_0).concat(_descriptor_7.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_7.toValue(sig_r_0).concat(_descriptor_8.toValue(sig_s_0).concat(_descriptor_3.toValue(grind_nonce_0)))))),
            alignment: _descriptor_1.alignment().concat(_descriptor_7.alignment().concat(_descriptor_3.alignment().concat(_descriptor_7.alignment().concat(_descriptor_8.alignment().concat(_descriptor_3.alignment())))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._add_device_with_jubjub_0(context,
                                                              partialProofData,
                                                              new_entry_0,
                                                              pk_0,
                                                              use_counter_0,
                                                              sig_r_0,
                                                              sig_s_0,
                                                              grind_nonce_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      add_device_with_k256: async (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`add_device_with_k256: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const new_entry_0 = args_1[1];
        const pk_0 = args_1[2];
        const use_counter_0 = args_1[3];
        const sig_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('add_device_with_k256',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 1129 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(new_entry_0.buffer instanceof ArrayBuffer && new_entry_0.BYTES_PER_ELEMENT === 1 && new_entry_0.length === 32)) {
          __compactRuntime.typeError('add_device_with_k256',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 1129 char 1',
                                     'Bytes<32>',
                                     new_entry_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('add_device_with_k256',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 1129 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_0) === 'object' && typeof(sig_0.r) === 'bigint' && sig_0.r >= 0 && sig_0.r <= __compactRuntime.MAX_SECP256K1_SCALAR && typeof(sig_0.s) === 'bigint' && sig_0.s >= 0 && sig_0.s <= __compactRuntime.MAX_SECP256K1_SCALAR)) {
          __compactRuntime.typeError('add_device_with_k256',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'account.compact line 1129 char 1',
                                     'struct Secp256k1EcdsaSignature<r: Secp256k1Scalar, s: Secp256k1Scalar>',
                                     sig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(new_entry_0).concat(_descriptor_4.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_6.toValue(sig_0)))),
            alignment: _descriptor_1.alignment().concat(_descriptor_4.alignment().concat(_descriptor_3.alignment().concat(_descriptor_6.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._add_device_with_k256_0(context,
                                                            partialProofData,
                                                            new_entry_0,
                                                            pk_0,
                                                            use_counter_0,
                                                            sig_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      remove_device_with_jubjub: async (...args_1) => {
        if (args_1.length !== 7) {
          throw new __compactRuntime.CompactError(`remove_device_with_jubjub: expected 7 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const entry_0 = args_1[1];
        const pk_0 = args_1[2];
        const use_counter_0 = args_1[3];
        const sig_r_0 = args_1[4];
        const sig_s_0 = args_1[5];
        const grind_nonce_0 = args_1[6];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('remove_device_with_jubjub',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 1148 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(entry_0.buffer instanceof ArrayBuffer && entry_0.BYTES_PER_ELEMENT === 1 && entry_0.length === 32)) {
          __compactRuntime.typeError('remove_device_with_jubjub',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 1148 char 1',
                                     'Bytes<32>',
                                     entry_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('remove_device_with_jubjub',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 1148 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_s_0) === 'bigint' && sig_s_0 >= 0 && sig_s_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('remove_device_with_jubjub',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'account.compact line 1148 char 1',
                                     'Field',
                                     sig_s_0)
        }
        if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('remove_device_with_jubjub',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'account.compact line 1148 char 1',
                                     'Uint<0..18446744073709551616>',
                                     grind_nonce_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(entry_0).concat(_descriptor_7.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_7.toValue(sig_r_0).concat(_descriptor_8.toValue(sig_s_0).concat(_descriptor_3.toValue(grind_nonce_0)))))),
            alignment: _descriptor_1.alignment().concat(_descriptor_7.alignment().concat(_descriptor_3.alignment().concat(_descriptor_7.alignment().concat(_descriptor_8.alignment().concat(_descriptor_3.alignment())))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._remove_device_with_jubjub_0(context,
                                                                 partialProofData,
                                                                 entry_0,
                                                                 pk_0,
                                                                 use_counter_0,
                                                                 sig_r_0,
                                                                 sig_s_0,
                                                                 grind_nonce_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      remove_device_with_k256: async (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`remove_device_with_k256: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const entry_0 = args_1[1];
        const pk_0 = args_1[2];
        const use_counter_0 = args_1[3];
        const sig_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('remove_device_with_k256',
                                     'argument 1 (as invoked from Typescript)',
                                     'account.compact line 1167 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(entry_0.buffer instanceof ArrayBuffer && entry_0.BYTES_PER_ELEMENT === 1 && entry_0.length === 32)) {
          __compactRuntime.typeError('remove_device_with_k256',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'account.compact line 1167 char 1',
                                     'Bytes<32>',
                                     entry_0)
        }
        if (!(typeof(use_counter_0) === 'bigint' && use_counter_0 >= 0n && use_counter_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('remove_device_with_k256',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'account.compact line 1167 char 1',
                                     'Uint<0..18446744073709551616>',
                                     use_counter_0)
        }
        if (!(typeof(sig_0) === 'object' && typeof(sig_0.r) === 'bigint' && sig_0.r >= 0 && sig_0.r <= __compactRuntime.MAX_SECP256K1_SCALAR && typeof(sig_0.s) === 'bigint' && sig_0.s >= 0 && sig_0.s <= __compactRuntime.MAX_SECP256K1_SCALAR)) {
          __compactRuntime.typeError('remove_device_with_k256',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'account.compact line 1167 char 1',
                                     'struct Secp256k1EcdsaSignature<r: Secp256k1Scalar, s: Secp256k1Scalar>',
                                     sig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(entry_0).concat(_descriptor_4.toValue(pk_0).concat(_descriptor_3.toValue(use_counter_0).concat(_descriptor_6.toValue(sig_0)))),
            alignment: _descriptor_1.alignment().concat(_descriptor_4.alignment().concat(_descriptor_3.alignment().concat(_descriptor_6.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._remove_device_with_k256_0(context,
                                                               partialProofData,
                                                               entry_0,
                                                               pk_0,
                                                               use_counter_0,
                                                               sig_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      }
    };
    this.impureCircuits = {
      activate_initial_device_with_jubjub: this.circuits.activate_initial_device_with_jubjub,
      activate_initial_device_with_k256: this.circuits.activate_initial_device_with_k256,
      deposit_unshielded: this.circuits.deposit_unshielded,
      withdraw_unshielded_with_jubjub: this.circuits.withdraw_unshielded_with_jubjub,
      withdraw_unshielded_with_k256: this.circuits.withdraw_unshielded_with_k256,
      deposit_shielded: this.circuits.deposit_shielded,
      append_inbox_with_jubjub: this.circuits.append_inbox_with_jubjub,
      append_inbox_with_k256: this.circuits.append_inbox_with_k256,
      withdraw_shielded_with_jubjub: this.circuits.withdraw_shielded_with_jubjub,
      withdraw_shielded_with_k256: this.circuits.withdraw_shielded_with_k256,
      withdraw_shielded_to_contract_with_jubjub: this.circuits.withdraw_shielded_to_contract_with_jubjub,
      withdraw_shielded_to_contract_with_k256: this.circuits.withdraw_shielded_to_contract_with_k256,
      rotate_enc_key_with_jubjub: this.circuits.rotate_enc_key_with_jubjub,
      rotate_enc_key_with_k256: this.circuits.rotate_enc_key_with_k256,
      add_device_with_jubjub: this.circuits.add_device_with_jubjub,
      add_device_with_k256: this.circuits.add_device_with_k256,
      remove_device_with_jubjub: this.circuits.remove_device_with_jubjub,
      remove_device_with_k256: this.circuits.remove_device_with_k256
    };
    this.provableCircuits = {
      activate_initial_device_with_jubjub: this.circuits.activate_initial_device_with_jubjub,
      activate_initial_device_with_k256: this.circuits.activate_initial_device_with_k256,
      deposit_unshielded: this.circuits.deposit_unshielded,
      withdraw_unshielded_with_jubjub: this.circuits.withdraw_unshielded_with_jubjub,
      withdraw_unshielded_with_k256: this.circuits.withdraw_unshielded_with_k256,
      deposit_shielded: this.circuits.deposit_shielded,
      append_inbox_with_jubjub: this.circuits.append_inbox_with_jubjub,
      append_inbox_with_k256: this.circuits.append_inbox_with_k256,
      withdraw_shielded_with_jubjub: this.circuits.withdraw_shielded_with_jubjub,
      withdraw_shielded_with_k256: this.circuits.withdraw_shielded_with_k256,
      withdraw_shielded_to_contract_with_jubjub: this.circuits.withdraw_shielded_to_contract_with_jubjub,
      withdraw_shielded_to_contract_with_k256: this.circuits.withdraw_shielded_to_contract_with_k256,
      rotate_enc_key_with_jubjub: this.circuits.rotate_enc_key_with_jubjub,
      rotate_enc_key_with_k256: this.circuits.rotate_enc_key_with_k256,
      add_device_with_jubjub: this.circuits.add_device_with_jubjub,
      add_device_with_k256: this.circuits.add_device_with_k256,
      remove_device_with_jubjub: this.circuits.remove_device_with_jubjub,
      remove_device_with_k256: this.circuits.remove_device_with_k256
    };
  }
  async initialState(...args_0) {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const initial_device_boot_0 = args_0[1];
    const encryption_key_0 = args_0[2];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!(initial_device_boot_0.buffer instanceof ArrayBuffer && initial_device_boot_0.BYTES_PER_ELEMENT === 1 && initial_device_boot_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'account.compact line 217 char 1',
                                 'Bytes<32>',
                                 initial_device_boot_0)
    }
    if (!(encryption_key_0.buffer instanceof ArrayBuffer && encryption_key_0.BYTES_PER_ELEMENT === 1 && encryption_key_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 2 (argument 3 as invoked from Typescript)',
                                 'account.compact line 217 char 1',
                                 'Bytes<32>',
                                 encryption_key_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('activate_initial_device_with_jubjub', new __compactRuntime.ContractOperation());
    state_0.setOperation('activate_initial_device_with_k256', new __compactRuntime.ContractOperation());
    state_0.setOperation('deposit_unshielded', new __compactRuntime.ContractOperation());
    state_0.setOperation('withdraw_unshielded_with_jubjub', new __compactRuntime.ContractOperation());
    state_0.setOperation('withdraw_unshielded_with_k256', new __compactRuntime.ContractOperation());
    state_0.setOperation('deposit_shielded', new __compactRuntime.ContractOperation());
    state_0.setOperation('append_inbox_with_jubjub', new __compactRuntime.ContractOperation());
    state_0.setOperation('append_inbox_with_k256', new __compactRuntime.ContractOperation());
    state_0.setOperation('withdraw_shielded_with_jubjub', new __compactRuntime.ContractOperation());
    state_0.setOperation('withdraw_shielded_with_k256', new __compactRuntime.ContractOperation());
    state_0.setOperation('withdraw_shielded_to_contract_with_jubjub', new __compactRuntime.ContractOperation());
    state_0.setOperation('withdraw_shielded_to_contract_with_k256', new __compactRuntime.ContractOperation());
    state_0.setOperation('rotate_enc_key_with_jubjub', new __compactRuntime.ContractOperation());
    state_0.setOperation('rotate_enc_key_with_k256', new __compactRuntime.ContractOperation());
    state_0.setOperation('add_device_with_jubjub', new __compactRuntime.ContractOperation());
    state_0.setOperation('add_device_with_k256', new __compactRuntime.ContractOperation());
    state_0.setOperation('remove_device_with_jubjub', new __compactRuntime.ContractOperation());
    state_0.setOperation('remove_device_with_k256', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext('constructor', __compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(0n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(1n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(2n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(3n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(4n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(5n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(6n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(7n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(8n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(0n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(9n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(10n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(11n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(false),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_0 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(0n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(1n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(encryption_key_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(3n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_1),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_2 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(5n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_2),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(10n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(initial_device_boot_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(11n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(false),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_3 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(7n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_3),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_4 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(8n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(tmp_4),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_5 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(9n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_5),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.callContext.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.callContext.currentPrivateState,
      currentZswapLocalState: context.callContext.currentZswapLocalState
    }
  }
  _some_0(value_0) { return { is_some: true, value: value_0 }; }
  _none_0() {
    return { is_some: false,
             value:
               { nonce: new Uint8Array(32), color: new Uint8Array(32), value: 0n } };
  }
  _left_0(value_0) {
    return { is_left: true, left: value_0, right: new Uint8Array(32) };
  }
  _left_1(value_0) {
    return { is_left: true, left: value_0, right: { bytes: new Uint8Array(32) } };
  }
  _right_0(value_0) {
    return { is_left: false, left: { bytes: new Uint8Array(32) }, right: value_0 };
  }
  _right_1(value_0) {
    return { is_left: false, left: { bytes: new Uint8Array(32) }, right: value_0 };
  }
  async _receiveShielded_0(context, partialProofData, coin_0) {
    const recipient_0 = this._right_1(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                partialProofData,
                                                                                                [
                                                                                                 { dup: { n: 2 } },
                                                                                                 { idx: { cached: true,
                                                                                                          pushPath: false,
                                                                                                          path: [
                                                                                                                 { tag: 'value',
                                                                                                                   value: { value: _descriptor_17.toValue(0n),
                                                                                                                            alignment: _descriptor_17.alignment() } }] } },
                                                                                                 { popeq: { cached: true,
                                                                                                            result: undefined } }]).value));
    this._createZswapOutput_0(context, partialProofData, coin_0, recipient_0);
    const tmp_0 = this._coinCommitment_0(coin_0, recipient_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(1n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    return [];
  }
  async _sendShielded_0(context, partialProofData, input_0, recipient_0, value_0)
  {
    const selfAddr_0 = _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 2 } },
                                                                                  { idx: { cached: true,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_17.toValue(0n),
                                                                                                             alignment: _descriptor_17.alignment() } }] } },
                                                                                  { popeq: { cached: true,
                                                                                             result: undefined } }]).value);
    this._createZswapInput_0(context, partialProofData, input_0);
    const tmp_0 = this._coinNullifier_0(this._downcastQualifiedCoin_0(input_0),
                                        selfAddr_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(0n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    let t_0;
    const change_0 = (t_0 = input_0.value,
                      (__compactRuntime.assert(t_0 >= value_0,
                                               'result of subtraction would be negative'),
                       t_0 - value_0));
    const output_0 = { nonce:
                         this._upgradeFromTransient_0(this._transientHash_0([__compactRuntime.convertBytesToUint(52435875175126190479447740508185965837690552500527637822603658699938581184512n,
                                                                                                                 28,
                                                                                                                 new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 107, 101, 114, 110, 101, 108, 58, 110, 111, 110, 99, 101, 95, 101, 118, 111, 108, 118, 101]),
                                                                                                                 'Field',
                                                                                                                 '<standard library>'),
                                                                             this._degradeToTransient_0(input_0.nonce)])),
                       color: input_0.color,
                       value: value_0 };
    this._createZswapOutput_0(context, partialProofData, output_0, recipient_0);
    const tmp_1 = this._coinCommitment_0(output_0, recipient_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(2n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_1),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    if (!recipient_0.is_left
        &&
        this._equal_0(recipient_0.right.bytes, selfAddr_0.bytes))
    {
      const tmp_2 = this._coinCommitment_0(output_0, recipient_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_17.toValue(1n),
                                                                    alignment: _descriptor_17.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_2),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
    }
    if (change_0 === 0n) {
      return { change: this._none_0(), sent: output_0 };
    } else {
      const changeCoin_0 = { nonce:
                               this._upgradeFromTransient_0(this._transientHash_0([__compactRuntime.convertBytesToUint(52435875175126190479447740508185965837690552500527637822603658699938581184512n,
                                                                                                                       30,
                                                                                                                       new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 107, 101, 114, 110, 101, 108, 58, 110, 111, 110, 99, 101, 95, 101, 118, 111, 108, 118, 101, 47, 50]),
                                                                                                                       'Field',
                                                                                                                       '<standard library>'),
                                                                                   this._degradeToTransient_0(input_0.nonce)])),
                             color: input_0.color,
                             value: change_0 };
      this._createZswapOutput_0(context,
                                partialProofData,
                                changeCoin_0,
                                this._right_1(selfAddr_0));
      const cm_0 = this._coinCommitment_0(changeCoin_0,
                                          this._right_1(selfAddr_0));
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_17.toValue(2n),
                                                                    alignment: _descriptor_17.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(cm_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_17.toValue(1n),
                                                                    alignment: _descriptor_17.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(cm_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
      return { change: this._some_0(changeCoin_0), sent: output_0 };
    }
  }
  _downcastQualifiedCoin_0(coin_0) {
    return { nonce: coin_0.nonce, color: coin_0.color, value: coin_0.value };
  }
  _coinCommitment_0(coin_0, recipient_0) {
    return this._persistentHash_15({ domain_sep:
                                       new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 122, 115, 119, 97, 112, 45, 99, 99, 91, 118, 49, 93]),
                                     info: coin_0,
                                     dataType: recipient_0.is_left,
                                     data:
                                       recipient_0.is_left ?
                                       recipient_0.left.bytes :
                                       recipient_0.right.bytes });
  }
  _coinNullifier_0(coin_0, addr_0) {
    return this._persistentHash_15({ domain_sep:
                                       new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 122, 115, 119, 97, 112, 45, 99, 110, 91, 118, 49, 93]),
                                     info: coin_0,
                                     dataType: false,
                                     data: addr_0.bytes });
  }
  async _sendUnshielded_0(context,
                          partialProofData,
                          color_0,
                          amount_0,
                          recipient_0)
  {
    const tmp_0 = this._left_0(color_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(7n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_41.toValue(tmp_0),
                                                                                              alignment: _descriptor_41.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_9.toValue(amount_0),
                                                                                              alignment: _descriptor_9.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    const tmp_1 = this._left_0(color_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(8n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.alignedConcat(
                                                                                              { value: _descriptor_41.toValue(tmp_1),
                                                                                                alignment: _descriptor_41.alignment() },
                                                                                              { value: _descriptor_42.toValue(recipient_0),
                                                                                                alignment: _descriptor_42.alignment() }
                                                                                            )).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_9.toValue(amount_0),
                                                                                              alignment: _descriptor_9.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    if (recipient_0.is_left
        &&
        this._equal_1(recipient_0.left.bytes,
                      _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 2 } },
                                                                                 { idx: { cached: true,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_17.toValue(0n),
                                                                                                            alignment: _descriptor_17.alignment() } }] } },
                                                                                 { popeq: { cached: true,
                                                                                            result: undefined } }]).value).bytes))
    {
      const tmp_2 = this._left_0(color_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_17.toValue(6n),
                                                                    alignment: _descriptor_17.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_41.toValue(tmp_2),
                                                                                                alignment: _descriptor_41.alignment() }).encode() } },
                                         { dup: { n: 1 } },
                                         { dup: { n: 1 } },
                                         'member',
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_9.toValue(amount_0),
                                                                                                alignment: _descriptor_9.alignment() }).encode() } },
                                         { swap: { n: 0 } },
                                         'neg',
                                         { branch: { skip: 4 } },
                                         { dup: { n: 2 } },
                                         { dup: { n: 2 } },
                                         { idx: { cached: true,
                                                  pushPath: false,
                                                  path: [ { tag: 'stack' }] } },
                                         'add',
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
    }
    return [];
  }
  async _receiveUnshielded_0(context, partialProofData, color_0, amount_0) {
    const tmp_0 = this._left_0(color_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(6n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_41.toValue(tmp_0),
                                                                                              alignment: _descriptor_41.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_9.toValue(amount_0),
                                                                                              alignment: _descriptor_9.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    return [];
  }
  _hashToSecp256k1Scalar_0(digest_0) {
    const v_0 = Array.from(digest_0, BigInt);
    const beReversed_0 = Uint8Array.from([v_0[31],
                                          v_0[30],
                                          v_0[29],
                                          v_0[28],
                                          v_0[27],
                                          v_0[26],
                                          v_0[25],
                                          v_0[24],
                                          v_0[23],
                                          v_0[22],
                                          v_0[21],
                                          v_0[20],
                                          v_0[19],
                                          v_0[18],
                                          v_0[17],
                                          v_0[16],
                                          v_0[15],
                                          v_0[14],
                                          v_0[13],
                                          v_0[12],
                                          v_0[11],
                                          v_0[10],
                                          v_0[9],
                                          v_0[8],
                                          v_0[7],
                                          v_0[6],
                                          v_0[5],
                                          v_0[4],
                                          v_0[3],
                                          v_0[2],
                                          v_0[1],
                                          v_0[0]],
                                         Number);
    return __compactRuntime.convertBytesToField(115792089237316195423570985008687907852837564279074904382605163141518161494336n,
                                                32,
                                                beReversed_0,
                                                'Secp256k1Scalar',
                                                '<standard library>');
  }
  _secp256k1EcdsaVerify_0(msgHash_0, sig_0, pk_0) {
    const z_0 = this._hashToSecp256k1Scalar_0(msgHash_0);
    const __compact_pattern_tmp1_0 = sig_0;
    const r_0 = __compact_pattern_tmp1_0.r;
    const s_0 = __compact_pattern_tmp1_0.s;
    const w_0 = this._inv_0(s_0);
    const u1_0 = this._mul_0(z_0, w_0);
    const u2_0 = this._mul_0(r_0, w_0);
    const point_0 = this._ecAdd_1(this._ecMulGenerator_1(u1_0),
                                  this._ecMul_1(pk_0, u2_0));
    return __compactRuntime.convertBytesToField(115792089237316195423570985008687907852837564279074904382605163141518161494336n,
                                                32,
                                                __compactRuntime.convertBigintToBytes(32,
                                                                                      this._secp256k1PointX_0(point_0),
                                                                                      '<standard library>'),
                                                'Secp256k1Scalar',
                                                '<standard library>')
           ===
           r_0;
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_40, value_0);
    return result_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_38, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_39, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_36, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_37, value_0);
    return result_0;
  }
  _persistentHash_4(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_34, value_0);
    return result_0;
  }
  _persistentHash_5(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_35, value_0);
    return result_0;
  }
  _persistentHash_6(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_32, value_0);
    return result_0;
  }
  _persistentHash_7(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_33, value_0);
    return result_0;
  }
  _persistentHash_8(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_30, value_0);
    return result_0;
  }
  _persistentHash_9(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_31, value_0);
    return result_0;
  }
  _persistentHash_10(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_28, value_0);
    return result_0;
  }
  _persistentHash_11(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_29, value_0);
    return result_0;
  }
  _persistentHash_12(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_25, value_0);
    return result_0;
  }
  _persistentHash_13(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_27, value_0);
    return result_0;
  }
  _persistentHash_14(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_22, value_0);
    return result_0;
  }
  _persistentHash_15(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_24, value_0);
    return result_0;
  }
  _degradeToTransient_0(x_0) {
    const result_0 = __compactRuntime.degradeToTransient(x_0);
    return result_0;
  }
  _upgradeFromTransient_0(x_0) {
    const result_0 = __compactRuntime.upgradeFromTransient(x_0);
    return result_0;
  }
  _ecAdd_0(a_0, b_0) {
    const result_0 = __compactRuntime.ecAdd(a_0, b_0);
    return result_0;
  }
  _ecMul_0(a_0, b_0) {
    const result_0 = __compactRuntime.ecMul(a_0, b_0);
    return result_0;
  }
  _ecMulGenerator_0(b_0) {
    const result_0 = __compactRuntime.ecMulGenerator(b_0);
    return result_0;
  }
  _createZswapInput_0(context, partialProofData, coin_0) {
    const result_0 = __compactRuntime.createZswapInput(context, coin_0);
    partialProofData.privateTranscriptOutputs.push({
      value: [],
      alignment: []
    });
    return result_0;
  }
  _createZswapOutput_0(context, partialProofData, coin_0, recipient_0) {
    const result_0 = __compactRuntime.createZswapOutput(context,
                                                        coin_0,
                                                        recipient_0);
    partialProofData.privateTranscriptOutputs.push({
      value: [],
      alignment: []
    });
    return result_0;
  }
  _mul_0(x_0, y_0) {
    const result_0 = __compactRuntime.secp256k1ScalarMul(x_0, y_0);
    return result_0;
  }
  _inv_0(s_0) {
    const result_0 = __compactRuntime.secp256k1ScalarInv(s_0);
    return result_0;
  }
  _secp256k1PointX_0(pt_0) {
    const result_0 = __compactRuntime.secp256k1PointX(pt_0);
    return result_0;
  }
  _secp256k1PointY_0(pt_0) {
    const result_0 = __compactRuntime.secp256k1PointY(pt_0);
    return result_0;
  }
  _ecAdd_1(a_0, b_0) {
    const result_0 = __compactRuntime.secp256k1Add(a_0, b_0);
    return result_0;
  }
  _ecMul_1(a_0, b_0) {
    const result_0 = __compactRuntime.secp256k1Mul(a_0, b_0);
    return result_0;
  }
  _ecMulGenerator_1(b_0) {
    const result_0 = __compactRuntime.secp256k1MulGenerator(b_0);
    return result_0;
  }
  _held_coin_0(context, partialProofData, color_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.callContext.currentQueryContext.state), context.callContext.currentPrivateState, context.callContext.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.held_coin(witnessContext_0,
                                                                    color_0);
    context.callContext.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && result_0.nonce.buffer instanceof ArrayBuffer && result_0.nonce.BYTES_PER_ELEMENT === 1 && result_0.nonce.length === 32 && result_0.color.buffer instanceof ArrayBuffer && result_0.color.BYTES_PER_ELEMENT === 1 && result_0.color.length === 32 && typeof(result_0.value) === 'bigint' && result_0.value >= 0n && result_0.value <= 340282366920938463463374607431768211455n && typeof(result_0.mt_index) === 'bigint' && result_0.mt_index >= 0n && result_0.mt_index <= 18446744073709551615n)) {
      __compactRuntime.typeError('held_coin',
                                 'return value',
                                 'account.compact line 142 char 1',
                                 'struct QualifiedShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>, mt_index: Uint<0..18446744073709551616>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_18.toValue(result_0),
      alignment: _descriptor_18.alignment()
    });
    return result_0;
  }
  async _do_activate_initial_device_0(context, partialProofData, entry_0) {
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(6n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(entry_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(8n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(tmp_0),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(11n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(true),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(10n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    await this._bump_round_0(context, partialProofData);
    return [];
  }
  async _activate_initial_device_with_jubjub_0(context,
                                               partialProofData,
                                               pk_0,
                                               salt_0)
  {
    __compactRuntime.assert(!_descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_17.toValue(11n),
                                                                                                                    alignment: _descriptor_17.alignment() } }] } },
                                                                                         { popeq: { cached: false,
                                                                                                    result: undefined } }]).value),
                            'already activated');
    __compactRuntime.assert(!this._equal_2(this._ecMul_0(pk_0,
                                                         __compactRuntime.convertNumericToJubjubScalar(8n)),
                                           this._ecMulGenerator_0(__compactRuntime.convertNumericToJubjubScalar(0n))),
                            'device key has small order');
    __compactRuntime.assert(this._equal_3(this._derive_boot_commitment_with_jubjub_0(salt_0,
                                                                                     pk_0),
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_17.toValue(10n),
                                                                                                                                alignment: _descriptor_17.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'boot commitment mismatch');
    await this._do_activate_initial_device_0(context,
                                             partialProofData,
                                             this._derive_device_entry_with_jubjub_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                               partialProofData,
                                                                                                                                               [
                                                                                                                                                { dup: { n: 2 } },
                                                                                                                                                { idx: { cached: true,
                                                                                                                                                         pushPath: false,
                                                                                                                                                         path: [
                                                                                                                                                                { tag: 'value',
                                                                                                                                                                  value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                                           alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                                { popeq: { cached: true,
                                                                                                                                                           result: undefined } }]).value),
                                                                                     pk_0,
                                                                                     _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                               partialProofData,
                                                                                                                                               [
                                                                                                                                                { dup: { n: 0 } },
                                                                                                                                                { idx: { cached: false,
                                                                                                                                                         pushPath: false,
                                                                                                                                                         path: [
                                                                                                                                                                { tag: 'value',
                                                                                                                                                                  value: { value: _descriptor_17.toValue(7n),
                                                                                                                                                                           alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                                { popeq: { cached: false,
                                                                                                                                                           result: undefined } }]).value),
                                                                                     0n));
    return [];
  }
  async _activate_initial_device_with_k256_0(context,
                                             partialProofData,
                                             pk_0,
                                             salt_0)
  {
    __compactRuntime.assert(!_descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_17.toValue(11n),
                                                                                                                    alignment: _descriptor_17.alignment() } }] } },
                                                                                         { popeq: { cached: false,
                                                                                                    result: undefined } }]).value),
                            'already activated');
    this._require_live_k256_key_0(pk_0);
    __compactRuntime.assert(this._equal_4(this._derive_boot_commitment_with_k256_0(salt_0,
                                                                                   pk_0),
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_17.toValue(10n),
                                                                                                                                alignment: _descriptor_17.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'boot commitment mismatch');
    await this._do_activate_initial_device_0(context,
                                             partialProofData,
                                             this._derive_device_entry_with_k256_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                             partialProofData,
                                                                                                                                             [
                                                                                                                                              { dup: { n: 2 } },
                                                                                                                                              { idx: { cached: true,
                                                                                                                                                       pushPath: false,
                                                                                                                                                       path: [
                                                                                                                                                              { tag: 'value',
                                                                                                                                                                value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                                         alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                              { popeq: { cached: true,
                                                                                                                                                         result: undefined } }]).value),
                                                                                   pk_0,
                                                                                   _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                             partialProofData,
                                                                                                                                             [
                                                                                                                                              { dup: { n: 0 } },
                                                                                                                                              { idx: { cached: false,
                                                                                                                                                       pushPath: false,
                                                                                                                                                       path: [
                                                                                                                                                              { tag: 'value',
                                                                                                                                                                value: { value: _descriptor_17.toValue(7n),
                                                                                                                                                                         alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                              { popeq: { cached: false,
                                                                                                                                                         result: undefined } }]).value),
                                                                                   0n));
    return [];
  }
  _derive_boot_commitment_with_jubjub_0(salt_0, pk_0) {
    return this._persistentHash_0([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 98, 111, 111, 116, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   salt_0,
                                   pk_0]);
  }
  _derive_boot_commitment_with_k256_0(salt_0, pk_0) {
    return this._persistentHash_1([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 98, 111, 111, 116, 58, 107, 49, 58, 118, 49, 0, 0, 0, 0, 0]),
                                   salt_0,
                                   __compactRuntime.convertBigintToBytes(32,
                                                                         this._secp256k1PointX_0(pk_0),
                                                                         'account.compact line 281 char 6'),
                                   __compactRuntime.convertBigintToBytes(32,
                                                                         this._secp256k1PointY_0(pk_0),
                                                                         'account.compact line 281 char 40')]);
  }
  _derive_device_entry_with_jubjub_0(self_addr_0, pk_0, epoch_0, counter_0) {
    return this._persistentHash_2([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 100, 101, 118, 105, 99, 101, 58, 118, 49, 0, 0, 0, 0, 0, 0]),
                                   self_addr_0,
                                   pk_0,
                                   epoch_0,
                                   counter_0]);
  }
  _derive_device_entry_with_k256_0(self_addr_0, pk_0, epoch_0, counter_0) {
    return this._persistentHash_3([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 100, 101, 118, 105, 99, 101, 58, 107, 49, 58, 118, 49, 0, 0, 0]),
                                   self_addr_0,
                                   __compactRuntime.convertBigintToBytes(32,
                                                                         this._secp256k1PointX_0(pk_0),
                                                                         'account.compact line 325 char 6'),
                                   __compactRuntime.convertBigintToBytes(32,
                                                                         this._secp256k1PointY_0(pk_0),
                                                                         'account.compact line 325 char 40'),
                                   epoch_0,
                                   counter_0]);
  }
  _require_live_k256_key_0(pk_0) {
    __compactRuntime.assert(!(this._equal_5(__compactRuntime.convertBigintToBytes(32,
                                                                                  this._secp256k1PointX_0(pk_0),
                                                                                  'account.compact line 348 char 8'),
                                            new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
                              &&
                              this._equal_6(__compactRuntime.convertBigintToBytes(32,
                                                                                  this._secp256k1PointY_0(pk_0),
                                                                                  'account.compact line 349 char 11'),
                                            new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))),
                            'device key is the point at infinity');
    return [];
  }
  _compute_public_point_with_jubjub_0(scalar_0) {
    return this._ecMulGenerator_0(__compactRuntime.convertNumericToJubjubScalar(scalar_0));
  }
  _compute_public_point_with_k256_0(scalar_0) {
    return this._ecMulGenerator_1(scalar_0);
  }
  _challenge_withdraw_unshielded_with_jubjub_0(self_addr_0,
                                               sig_r_0,
                                               pk_0,
                                               color_0,
                                               amount_0,
                                               recipient_0,
                                               nonce_value_0,
                                               grind_nonce_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 118, 49, 58, 119, 105, 116, 104, 100, 114, 97, 119, 95, 117, 110, 115, 104, 105, 101, 108, 100, 101, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_4([dst_0,
                                   self_addr_0,
                                   sig_r_0,
                                   pk_0,
                                   color_0,
                                   amount_0,
                                   recipient_0,
                                   nonce_value_0,
                                   grind_nonce_0]);
  }
  _challenge_withdraw_shielded_with_jubjub_0(self_addr_0,
                                             sig_r_0,
                                             pk_0,
                                             recipient_0,
                                             color_0,
                                             amount_0,
                                             coin_0,
                                             nonce_value_0,
                                             grind_nonce_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 118, 49, 58, 119, 105, 116, 104, 100, 114, 97, 119, 95, 115, 104, 105, 101, 108, 100, 101, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_5([dst_0,
                                   self_addr_0,
                                   sig_r_0,
                                   pk_0,
                                   recipient_0,
                                   color_0,
                                   amount_0,
                                   coin_0,
                                   nonce_value_0,
                                   grind_nonce_0]);
  }
  _challenge_withdraw_shielded_to_contract_with_jubjub_0(self_addr_0,
                                                         sig_r_0,
                                                         pk_0,
                                                         recipient_0,
                                                         color_0,
                                                         amount_0,
                                                         coin_0,
                                                         nonce_value_0,
                                                         grind_nonce_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 118, 49, 58, 119, 105, 116, 104, 100, 114, 97, 119, 95, 115, 104, 105, 101, 108, 100, 101, 100, 95, 116, 111, 95, 99, 111, 110, 116, 114, 97, 99, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_6([dst_0,
                                   self_addr_0,
                                   sig_r_0,
                                   pk_0,
                                   recipient_0,
                                   color_0,
                                   amount_0,
                                   coin_0,
                                   nonce_value_0,
                                   grind_nonce_0]);
  }
  _challenge_append_inbox_with_jubjub_0(self_addr_0,
                                        sig_r_0,
                                        pk_0,
                                        entry_0,
                                        nonce_value_0,
                                        grind_nonce_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 118, 49, 58, 97, 112, 112, 101, 110, 100, 95, 105, 110, 98, 111, 120, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_7([dst_0,
                                   self_addr_0,
                                   sig_r_0,
                                   pk_0,
                                   entry_0,
                                   nonce_value_0,
                                   grind_nonce_0]);
  }
  _challenge_rotate_enc_key_with_jubjub_0(self_addr_0,
                                          sig_r_0,
                                          pk_0,
                                          new_key_0,
                                          nonce_value_0,
                                          grind_nonce_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 118, 49, 58, 114, 111, 116, 97, 116, 101, 95, 101, 110, 99, 95, 107, 101, 121, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_8([dst_0,
                                   self_addr_0,
                                   sig_r_0,
                                   pk_0,
                                   new_key_0,
                                   nonce_value_0,
                                   grind_nonce_0]);
  }
  _challenge_add_device_with_jubjub_0(self_addr_0,
                                      sig_r_0,
                                      pk_0,
                                      new_entry_0,
                                      nonce_value_0,
                                      grind_nonce_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 118, 49, 58, 97, 100, 100, 95, 100, 101, 118, 105, 99, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_8([dst_0,
                                   self_addr_0,
                                   sig_r_0,
                                   pk_0,
                                   new_entry_0,
                                   nonce_value_0,
                                   grind_nonce_0]);
  }
  _challenge_remove_device_with_jubjub_0(self_addr_0,
                                         sig_r_0,
                                         pk_0,
                                         entry_0,
                                         nonce_value_0,
                                         grind_nonce_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 118, 49, 58, 114, 101, 109, 111, 118, 101, 95, 100, 101, 118, 105, 99, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_8([dst_0,
                                   self_addr_0,
                                   sig_r_0,
                                   pk_0,
                                   entry_0,
                                   nonce_value_0,
                                   grind_nonce_0]);
  }
  _challenge_withdraw_unshielded_with_k256_0(self_addr_0,
                                             pk_0,
                                             color_0,
                                             amount_0,
                                             recipient_0,
                                             nonce_value_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 107, 49, 58, 118, 49, 58, 119, 105, 116, 104, 100, 114, 97, 119, 95, 117, 110, 115, 104, 105, 101, 108, 100, 101, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_9([dst_0,
                                   self_addr_0,
                                   __compactRuntime.convertBigintToBytes(32,
                                                                         this._secp256k1PointX_0(pk_0),
                                                                         'account.compact line 529 char 6'),
                                   __compactRuntime.convertBigintToBytes(32,
                                                                         this._secp256k1PointY_0(pk_0),
                                                                         'account.compact line 529 char 40'),
                                   color_0,
                                   amount_0,
                                   recipient_0,
                                   nonce_value_0]);
  }
  _challenge_withdraw_shielded_with_k256_0(self_addr_0,
                                           pk_0,
                                           recipient_0,
                                           color_0,
                                           amount_0,
                                           coin_0,
                                           nonce_value_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 107, 49, 58, 118, 49, 58, 119, 105, 116, 104, 100, 114, 97, 119, 95, 115, 104, 105, 101, 108, 100, 101, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_10([dst_0,
                                    self_addr_0,
                                    __compactRuntime.convertBigintToBytes(32,
                                                                          this._secp256k1PointX_0(pk_0),
                                                                          'account.compact line 548 char 6'),
                                    __compactRuntime.convertBigintToBytes(32,
                                                                          this._secp256k1PointY_0(pk_0),
                                                                          'account.compact line 548 char 40'),
                                    recipient_0,
                                    color_0,
                                    amount_0,
                                    coin_0,
                                    nonce_value_0]);
  }
  _challenge_withdraw_shielded_to_contract_with_k256_0(self_addr_0,
                                                       pk_0,
                                                       recipient_0,
                                                       color_0,
                                                       amount_0,
                                                       coin_0,
                                                       nonce_value_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 107, 49, 58, 118, 49, 58, 119, 105, 116, 104, 100, 114, 97, 119, 95, 115, 104, 105, 101, 108, 100, 101, 100, 95, 116, 111, 95, 99, 111, 110, 116, 114, 97, 99, 116, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_11([dst_0,
                                    self_addr_0,
                                    __compactRuntime.convertBigintToBytes(32,
                                                                          this._secp256k1PointX_0(pk_0),
                                                                          'account.compact line 567 char 6'),
                                    __compactRuntime.convertBigintToBytes(32,
                                                                          this._secp256k1PointY_0(pk_0),
                                                                          'account.compact line 567 char 40'),
                                    recipient_0,
                                    color_0,
                                    amount_0,
                                    coin_0,
                                    nonce_value_0]);
  }
  _challenge_append_inbox_with_k256_0(self_addr_0, pk_0, entry_0, nonce_value_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 107, 49, 58, 118, 49, 58, 97, 112, 112, 101, 110, 100, 95, 105, 110, 98, 111, 120, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_12([dst_0,
                                    self_addr_0,
                                    __compactRuntime.convertBigintToBytes(32,
                                                                          this._secp256k1PointX_0(pk_0),
                                                                          'account.compact line 583 char 6'),
                                    __compactRuntime.convertBigintToBytes(32,
                                                                          this._secp256k1PointY_0(pk_0),
                                                                          'account.compact line 583 char 40'),
                                    entry_0,
                                    nonce_value_0]);
  }
  _challenge_rotate_enc_key_with_k256_0(self_addr_0,
                                        pk_0,
                                        new_key_0,
                                        nonce_value_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 107, 49, 58, 118, 49, 58, 114, 111, 116, 97, 116, 101, 95, 101, 110, 99, 95, 107, 101, 121, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_14([dst_0,
                                    self_addr_0,
                                    __compactRuntime.convertBigintToBytes(32,
                                                                          this._secp256k1PointX_0(pk_0),
                                                                          'account.compact line 599 char 6'),
                                    __compactRuntime.convertBigintToBytes(32,
                                                                          this._secp256k1PointY_0(pk_0),
                                                                          'account.compact line 599 char 40'),
                                    new_key_0,
                                    nonce_value_0]);
  }
  _challenge_add_device_with_k256_0(self_addr_0,
                                    pk_0,
                                    new_entry_0,
                                    nonce_value_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 107, 49, 58, 118, 49, 58, 97, 100, 100, 95, 100, 101, 118, 105, 99, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_14([dst_0,
                                    self_addr_0,
                                    __compactRuntime.convertBigintToBytes(32,
                                                                          this._secp256k1PointX_0(pk_0),
                                                                          'account.compact line 615 char 6'),
                                    __compactRuntime.convertBigintToBytes(32,
                                                                          this._secp256k1PointY_0(pk_0),
                                                                          'account.compact line 615 char 40'),
                                    new_entry_0,
                                    nonce_value_0]);
  }
  _challenge_remove_device_with_k256_0(self_addr_0, pk_0, entry_0, nonce_value_0)
  {
    const dst_0 = this._persistentHash_13([new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 97, 99, 99, 111, 117, 110, 116, 58, 97, 117, 116, 104, 58, 107, 49, 58, 118, 49, 58, 114, 101, 109, 111, 118, 101, 95, 100, 101, 118, 105, 99, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    return this._persistentHash_14([dst_0,
                                    self_addr_0,
                                    __compactRuntime.convertBigintToBytes(32,
                                                                          this._secp256k1PointX_0(pk_0),
                                                                          'account.compact line 631 char 6'),
                                    __compactRuntime.convertBigintToBytes(32,
                                                                          this._secp256k1PointY_0(pk_0),
                                                                          'account.compact line 631 char 40'),
                                    entry_0,
                                    nonce_value_0]);
  }
  async _require_authorised_with_jubjub_0(context,
                                          partialProofData,
                                          pk_0,
                                          use_counter_0,
                                          sig_r_0,
                                          sig_s_0,
                                          challenge_0)
  {
    __compactRuntime.assert(!this._equal_7(this._ecMul_0(pk_0,
                                                         __compactRuntime.convertNumericToJubjubScalar(8n)),
                                           this._ecMulGenerator_0(__compactRuntime.convertNumericToJubjubScalar(0n))),
                            'device key has small order');
    const entry_0 = this._derive_device_entry_with_jubjub_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                      partialProofData,
                                                                                                                      [
                                                                                                                       { dup: { n: 2 } },
                                                                                                                       { idx: { cached: true,
                                                                                                                                pushPath: false,
                                                                                                                                path: [
                                                                                                                                       { tag: 'value',
                                                                                                                                         value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                  alignment: _descriptor_17.alignment() } }] } },
                                                                                                                       { popeq: { cached: true,
                                                                                                                                  result: undefined } }]).value),
                                                            pk_0,
                                                            _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                      partialProofData,
                                                                                                                      [
                                                                                                                       { dup: { n: 0 } },
                                                                                                                       { idx: { cached: false,
                                                                                                                                pushPath: false,
                                                                                                                                path: [
                                                                                                                                       { tag: 'value',
                                                                                                                                         value: { value: _descriptor_17.toValue(7n),
                                                                                                                                                  alignment: _descriptor_17.alignment() } }] } },
                                                                                                                       { popeq: { cached: false,
                                                                                                                                  result: undefined } }]).value),
                                                            use_counter_0);
    __compactRuntime.assert(_descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_17.toValue(6n),
                                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(entry_0),
                                                                                                                                               alignment: _descriptor_1.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'unknown device entry');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(6n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(entry_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { rem: { cached: false } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = this._derive_device_entry_with_jubjub_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                    partialProofData,
                                                                                                                    [
                                                                                                                     { dup: { n: 2 } },
                                                                                                                     { idx: { cached: true,
                                                                                                                              pushPath: false,
                                                                                                                              path: [
                                                                                                                                     { tag: 'value',
                                                                                                                                       value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                alignment: _descriptor_17.alignment() } }] } },
                                                                                                                     { popeq: { cached: true,
                                                                                                                                result: undefined } }]).value),
                                                          pk_0,
                                                          _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                    partialProofData,
                                                                                                                    [
                                                                                                                     { dup: { n: 0 } },
                                                                                                                     { idx: { cached: false,
                                                                                                                              pushPath: false,
                                                                                                                              path: [
                                                                                                                                     { tag: 'value',
                                                                                                                                       value: { value: _descriptor_17.toValue(7n),
                                                                                                                                                alignment: _descriptor_17.alignment() } }] } },
                                                                                                                     { popeq: { cached: false,
                                                                                                                                result: undefined } }]).value),
                                                          ((t1) => {
                                                            if (t1 > 18446744073709551615n) {
                                                              throw new __compactRuntime.CompactError('account.compact line 671 char 39: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                                            }
                                                            return t1;
                                                          })(use_counter_0 + 1n));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(6n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const c_0 = __compactRuntime.convertBytesToUint(52435875175126190479447740508185965837690552500527637822603658699938581184512n,
                                                    32,
                                                    challenge_0,
                                                    'Field',
                                                    'account.compact line 676 char 13');
    __compactRuntime.assert(this._equal_8(this._ecMulGenerator_0(__compactRuntime.convertNumericToJubjubScalar(sig_s_0)),
                                          this._ecAdd_0(sig_r_0,
                                                        this._ecMul_0(pk_0,
                                                                      __compactRuntime.convertNumericToJubjubScalar(c_0)))),
                            'invalid signature');
    const tmp_1 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('account.compact line 681 char 17: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_17.toValue(9n),
                                                                                                           alignment: _descriptor_17.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(9n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_1),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    await this._bump_round_0(context, partialProofData);
    return [];
  }
  async _require_authorised_with_k256_0(context,
                                        partialProofData,
                                        pk_0,
                                        use_counter_0,
                                        sig_0,
                                        challenge_0)
  {
    this._require_live_k256_key_0(pk_0);
    const entry_0 = this._derive_device_entry_with_k256_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                    partialProofData,
                                                                                                                    [
                                                                                                                     { dup: { n: 2 } },
                                                                                                                     { idx: { cached: true,
                                                                                                                              pushPath: false,
                                                                                                                              path: [
                                                                                                                                     { tag: 'value',
                                                                                                                                       value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                alignment: _descriptor_17.alignment() } }] } },
                                                                                                                     { popeq: { cached: true,
                                                                                                                                result: undefined } }]).value),
                                                          pk_0,
                                                          _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                    partialProofData,
                                                                                                                    [
                                                                                                                     { dup: { n: 0 } },
                                                                                                                     { idx: { cached: false,
                                                                                                                              pushPath: false,
                                                                                                                              path: [
                                                                                                                                     { tag: 'value',
                                                                                                                                       value: { value: _descriptor_17.toValue(7n),
                                                                                                                                                alignment: _descriptor_17.alignment() } }] } },
                                                                                                                     { popeq: { cached: false,
                                                                                                                                result: undefined } }]).value),
                                                          use_counter_0);
    __compactRuntime.assert(_descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_17.toValue(6n),
                                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(entry_0),
                                                                                                                                               alignment: _descriptor_1.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'unknown device entry');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(6n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(entry_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { rem: { cached: false } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = this._derive_device_entry_with_k256_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                  partialProofData,
                                                                                                                  [
                                                                                                                   { dup: { n: 2 } },
                                                                                                                   { idx: { cached: true,
                                                                                                                            pushPath: false,
                                                                                                                            path: [
                                                                                                                                   { tag: 'value',
                                                                                                                                     value: { value: _descriptor_17.toValue(0n),
                                                                                                                                              alignment: _descriptor_17.alignment() } }] } },
                                                                                                                   { popeq: { cached: true,
                                                                                                                              result: undefined } }]).value),
                                                        pk_0,
                                                        _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                  partialProofData,
                                                                                                                  [
                                                                                                                   { dup: { n: 0 } },
                                                                                                                   { idx: { cached: false,
                                                                                                                            pushPath: false,
                                                                                                                            path: [
                                                                                                                                   { tag: 'value',
                                                                                                                                     value: { value: _descriptor_17.toValue(7n),
                                                                                                                                              alignment: _descriptor_17.alignment() } }] } },
                                                                                                                   { popeq: { cached: false,
                                                                                                                              result: undefined } }]).value),
                                                        ((t1) => {
                                                          if (t1 > 18446744073709551615n) {
                                                            throw new __compactRuntime.CompactError('account.compact line 696 char 39: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                                          }
                                                          return t1;
                                                        })(use_counter_0 + 1n));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(6n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.assert(this._secp256k1EcdsaVerify_0(challenge_0,
                                                         sig_0,
                                                         pk_0),
                            'invalid signature');
    const tmp_1 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('account.compact line 705 char 17: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_17.toValue(9n),
                                                                                                           alignment: _descriptor_17.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(9n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_1),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    await this._bump_round_0(context, partialProofData);
    return [];
  }
  async _bump_round_0(context, partialProofData) {
    const tmp_0 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('account.compact line 710 char 12: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_17.toValue(0n),
                                                                                                           alignment: _descriptor_17.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(0n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  async _credit_unshielded_0(context, partialProofData, color_0, amount_0) {
    if (_descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_17.toValue(4n),
                                                                                               alignment: _descriptor_17.alignment() } }] } },
                                                                    { push: { storage: false,
                                                                              value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(color_0),
                                                                                                                           alignment: _descriptor_1.alignment() }).encode() } },
                                                                    'member',
                                                                    { popeq: { cached: true,
                                                                               result: undefined } }]).value))
    {
      const tmp_0 = ((t1) => {
                      if (t1 > 340282366920938463463374607431768211455n) {
                        throw new __compactRuntime.CompactError('account.compact line 719 char 8: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                      }
                      return t1;
                    })(_descriptor_9.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_17.toValue(4n),
                                                                                                             alignment: _descriptor_17.alignment() } }] } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_1.toValue(color_0),
                                                                                                             alignment: _descriptor_1.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value)
                       +
                       amount_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_17.toValue(4n),
                                                                    alignment: _descriptor_17.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(color_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_9.toValue(tmp_0),
                                                                                                alignment: _descriptor_9.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    } else {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_17.toValue(4n),
                                                                    alignment: _descriptor_17.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(color_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_9.toValue(amount_0),
                                                                                                alignment: _descriptor_9.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    return [];
  }
  async _debit_unshielded_0(context, partialProofData, color_0, amount_0) {
    __compactRuntime.assert(_descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_17.toValue(4n),
                                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(color_0),
                                                                                                                                               alignment: _descriptor_1.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'no balance for color');
    const bal_0 = _descriptor_9.fromValue(__compactRuntime.queryLedgerState(context,
                                                                            partialProofData,
                                                                            [
                                                                             { dup: { n: 0 } },
                                                                             { idx: { cached: false,
                                                                                      pushPath: false,
                                                                                      path: [
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_17.toValue(4n),
                                                                                                        alignment: _descriptor_17.alignment() } }] } },
                                                                             { idx: { cached: false,
                                                                                      pushPath: false,
                                                                                      path: [
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_1.toValue(color_0),
                                                                                                        alignment: _descriptor_1.alignment() } }] } },
                                                                             { popeq: { cached: false,
                                                                                        result: undefined } }]).value);
    __compactRuntime.assert(bal_0 >= amount_0, 'insufficient balance');
    const tmp_0 = (__compactRuntime.assert(bal_0 >= amount_0,
                                           'result of subtraction would be negative'),
                   bal_0 - amount_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(4n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(color_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_9.toValue(tmp_0),
                                                                                              alignment: _descriptor_9.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  async _do_withdraw_unshielded_0(context,
                                  partialProofData,
                                  color_0,
                                  amount_0,
                                  recipient_0)
  {
    const c_0 = color_0;
    const a_0 = amount_0;
    await this._debit_unshielded_0(context, partialProofData, c_0, a_0);
    await this._sendUnshielded_0(context,
                                 partialProofData,
                                 c_0,
                                 a_0,
                                 this._right_0(recipient_0));
    return [];
  }
  async _do_append_inbox_0(context, partialProofData, entry_0) {
    const tmp_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                            partialProofData,
                                                                            [
                                                                             { dup: { n: 0 } },
                                                                             { idx: { cached: false,
                                                                                      pushPath: false,
                                                                                      path: [
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_17.toValue(3n),
                                                                                                        alignment: _descriptor_17.alignment() } }] } },
                                                                             { popeq: { cached: false,
                                                                                        result: undefined } }]).value);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(2n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(entry_0),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_1 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('account.compact line 754 char 18: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_17.toValue(3n),
                                                                                                           alignment: _descriptor_17.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(3n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_1),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  async _do_withdraw_shielded_0(context,
                                partialProofData,
                                recipient_0,
                                amount_0,
                                coin_0)
  {
    const result_0 = await this._sendShielded_0(context,
                                                partialProofData,
                                                coin_0,
                                                this._left_1(recipient_0),
                                                amount_0);
    if (result_0.change.is_some) {
      return this._some_0(result_0.change.value);
    } else {
      return this._none_0();
    }
  }
  async _do_withdraw_shielded_to_contract_0(context,
                                            partialProofData,
                                            recipient_0,
                                            amount_0,
                                            coin_0)
  {
    const result_0 = await this._sendShielded_0(context,
                                                partialProofData,
                                                coin_0,
                                                this._right_1(recipient_0),
                                                amount_0);
    if (result_0.change.is_some) {
      return [result_0.sent, this._some_0(result_0.change.value)];
    } else {
      return [result_0.sent, this._none_0()];
    }
  }
  async _do_rotate_enc_key_0(context, partialProofData, new_key_0) {
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(1n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new_key_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  async _do_add_device_0(context, partialProofData, new_entry_0) {
    const e_0 = new_entry_0;
    __compactRuntime.assert(!_descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_17.toValue(6n),
                                                                                                                    alignment: _descriptor_17.alignment() } }] } },
                                                                                         { push: { storage: false,
                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(e_0),
                                                                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                                                                         'member',
                                                                                         { popeq: { cached: true,
                                                                                                    result: undefined } }]).value),
                            'device entry already present');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(6n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(e_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = ((t1) => {
                    if (t1 > 255n) {
                      throw new __compactRuntime.CompactError('account.compact line 808 char 19: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                    }
                    return t1;
                  })(_descriptor_17.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 0 } },
                                                                                 { idx: { cached: false,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_17.toValue(8n),
                                                                                                            alignment: _descriptor_17.alignment() } }] } },
                                                                                 { popeq: { cached: false,
                                                                                            result: undefined } }]).value)
                     +
                     1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(8n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(tmp_0),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  async _do_remove_device_0(context, partialProofData, entry_0, caller_entry_0)
  {
    const e_0 = entry_0;
    let t_0;
    __compactRuntime.assert((t_0 = _descriptor_17.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                              partialProofData,
                                                                                              [
                                                                                               { dup: { n: 0 } },
                                                                                               { idx: { cached: false,
                                                                                                        pushPath: false,
                                                                                                        path: [
                                                                                                               { tag: 'value',
                                                                                                                 value: { value: _descriptor_17.toValue(8n),
                                                                                                                          alignment: _descriptor_17.alignment() } }] } },
                                                                                               { popeq: { cached: false,
                                                                                                          result: undefined } }]).value),
                             t_0 > 1n),
                            'cannot remove last device');
    __compactRuntime.assert(!this._equal_9(e_0, caller_entry_0),
                            'cannot remove the authorising device');
    __compactRuntime.assert(_descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_17.toValue(6n),
                                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(e_0),
                                                                                                                                               alignment: _descriptor_1.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'unknown device entry');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(6n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(e_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { rem: { cached: false } },
                                       { ins: { cached: true, n: 1 } }]);
    let t_1, t_2;
    const tmp_0 = (t_1 = _descriptor_17.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                    partialProofData,
                                                                                    [
                                                                                     { dup: { n: 0 } },
                                                                                     { idx: { cached: false,
                                                                                              pushPath: false,
                                                                                              path: [
                                                                                                     { tag: 'value',
                                                                                                       value: { value: _descriptor_17.toValue(8n),
                                                                                                                alignment: _descriptor_17.alignment() } }] } },
                                                                                     { popeq: { cached: false,
                                                                                                result: undefined } }]).value),
                   (t_2 = 1n,
                    (__compactRuntime.assert(t_1 >= t_2,
                                             'result of subtraction would be negative'),
                     t_1 - t_2)));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(8n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(tmp_0),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  async _deposit_unshielded_0(context, partialProofData, color_0, amount_0) {
    const c_0 = color_0;
    const a_0 = amount_0;
    await this._receiveUnshielded_0(context, partialProofData, c_0, a_0);
    await this._credit_unshielded_0(context, partialProofData, c_0, a_0);
    await this._bump_round_0(context, partialProofData);
    return [];
  }
  async _withdraw_unshielded_with_jubjub_0(context,
                                           partialProofData,
                                           color_0,
                                           amount_0,
                                           recipient_0,
                                           pk_0,
                                           use_counter_0,
                                           sig_r_0,
                                           sig_s_0,
                                           grind_nonce_0)
  {
    const challenge_0 = this._challenge_withdraw_unshielded_with_jubjub_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                    partialProofData,
                                                                                                                                    [
                                                                                                                                     { dup: { n: 2 } },
                                                                                                                                     { idx: { cached: true,
                                                                                                                                              pushPath: false,
                                                                                                                                              path: [
                                                                                                                                                     { tag: 'value',
                                                                                                                                                       value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                                alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                     { popeq: { cached: true,
                                                                                                                                                result: undefined } }]).value),
                                                                          sig_r_0,
                                                                          pk_0,
                                                                          color_0,
                                                                          amount_0,
                                                                          recipient_0,
                                                                          _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                    partialProofData,
                                                                                                                                    [
                                                                                                                                     { dup: { n: 0 } },
                                                                                                                                     { idx: { cached: false,
                                                                                                                                              pushPath: false,
                                                                                                                                              path: [
                                                                                                                                                     { tag: 'value',
                                                                                                                                                       value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                                alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                     { popeq: { cached: false,
                                                                                                                                                result: undefined } }]).value),
                                                                          grind_nonce_0);
    await this._require_authorised_with_jubjub_0(context,
                                                 partialProofData,
                                                 pk_0,
                                                 use_counter_0,
                                                 sig_r_0,
                                                 sig_s_0,
                                                 challenge_0);
    await this._do_withdraw_unshielded_0(context,
                                         partialProofData,
                                         color_0,
                                         amount_0,
                                         recipient_0);
    return [];
  }
  async _withdraw_unshielded_with_k256_0(context,
                                         partialProofData,
                                         color_0,
                                         amount_0,
                                         recipient_0,
                                         pk_0,
                                         use_counter_0,
                                         sig_0)
  {
    const challenge_0 = this._challenge_withdraw_unshielded_with_k256_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                  partialProofData,
                                                                                                                                  [
                                                                                                                                   { dup: { n: 2 } },
                                                                                                                                   { idx: { cached: true,
                                                                                                                                            pushPath: false,
                                                                                                                                            path: [
                                                                                                                                                   { tag: 'value',
                                                                                                                                                     value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                              alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                   { popeq: { cached: true,
                                                                                                                                              result: undefined } }]).value),
                                                                        pk_0,
                                                                        color_0,
                                                                        amount_0,
                                                                        recipient_0,
                                                                        _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                  partialProofData,
                                                                                                                                  [
                                                                                                                                   { dup: { n: 0 } },
                                                                                                                                   { idx: { cached: false,
                                                                                                                                            pushPath: false,
                                                                                                                                            path: [
                                                                                                                                                   { tag: 'value',
                                                                                                                                                     value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                              alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                   { popeq: { cached: false,
                                                                                                                                              result: undefined } }]).value));
    await this._require_authorised_with_k256_0(context,
                                               partialProofData,
                                               pk_0,
                                               use_counter_0,
                                               sig_0,
                                               challenge_0);
    await this._do_withdraw_unshielded_0(context,
                                         partialProofData,
                                         color_0,
                                         amount_0,
                                         recipient_0);
    return [];
  }
  async _deposit_shielded_0(context, partialProofData, coin_0, entry_0) {
    await this._receiveShielded_0(context, partialProofData, coin_0);
    const tmp_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                            partialProofData,
                                                                            [
                                                                             { dup: { n: 0 } },
                                                                             { idx: { cached: false,
                                                                                      pushPath: false,
                                                                                      path: [
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_17.toValue(3n),
                                                                                                        alignment: _descriptor_17.alignment() } }] } },
                                                                             { popeq: { cached: false,
                                                                                        result: undefined } }]).value);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(2n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(entry_0),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_1 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('account.compact line 890 char 18: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_17.toValue(3n),
                                                                                                           alignment: _descriptor_17.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(3n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_1),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    await this._bump_round_0(context, partialProofData);
    return [];
  }
  async _append_inbox_with_jubjub_0(context,
                                    partialProofData,
                                    entry_0,
                                    pk_0,
                                    use_counter_0,
                                    sig_r_0,
                                    sig_s_0,
                                    grind_nonce_0)
  {
    const challenge_0 = this._challenge_append_inbox_with_jubjub_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                             partialProofData,
                                                                                                                             [
                                                                                                                              { dup: { n: 2 } },
                                                                                                                              { idx: { cached: true,
                                                                                                                                       pushPath: false,
                                                                                                                                       path: [
                                                                                                                                              { tag: 'value',
                                                                                                                                                value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                         alignment: _descriptor_17.alignment() } }] } },
                                                                                                                              { popeq: { cached: true,
                                                                                                                                         result: undefined } }]).value),
                                                                   sig_r_0,
                                                                   pk_0,
                                                                   entry_0,
                                                                   _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                             partialProofData,
                                                                                                                             [
                                                                                                                              { dup: { n: 0 } },
                                                                                                                              { idx: { cached: false,
                                                                                                                                       pushPath: false,
                                                                                                                                       path: [
                                                                                                                                              { tag: 'value',
                                                                                                                                                value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                         alignment: _descriptor_17.alignment() } }] } },
                                                                                                                              { popeq: { cached: false,
                                                                                                                                         result: undefined } }]).value),
                                                                   grind_nonce_0);
    await this._require_authorised_with_jubjub_0(context,
                                                 partialProofData,
                                                 pk_0,
                                                 use_counter_0,
                                                 sig_r_0,
                                                 sig_s_0,
                                                 challenge_0);
    await this._do_append_inbox_0(context, partialProofData, entry_0);
    return [];
  }
  async _append_inbox_with_k256_0(context,
                                  partialProofData,
                                  entry_0,
                                  pk_0,
                                  use_counter_0,
                                  sig_0)
  {
    const challenge_0 = this._challenge_append_inbox_with_k256_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                           partialProofData,
                                                                                                                           [
                                                                                                                            { dup: { n: 2 } },
                                                                                                                            { idx: { cached: true,
                                                                                                                                     pushPath: false,
                                                                                                                                     path: [
                                                                                                                                            { tag: 'value',
                                                                                                                                              value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                       alignment: _descriptor_17.alignment() } }] } },
                                                                                                                            { popeq: { cached: true,
                                                                                                                                       result: undefined } }]).value),
                                                                 pk_0,
                                                                 entry_0,
                                                                 _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                           partialProofData,
                                                                                                                           [
                                                                                                                            { dup: { n: 0 } },
                                                                                                                            { idx: { cached: false,
                                                                                                                                     pushPath: false,
                                                                                                                                     path: [
                                                                                                                                            { tag: 'value',
                                                                                                                                              value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                       alignment: _descriptor_17.alignment() } }] } },
                                                                                                                            { popeq: { cached: false,
                                                                                                                                       result: undefined } }]).value));
    await this._require_authorised_with_k256_0(context,
                                               partialProofData,
                                               pk_0,
                                               use_counter_0,
                                               sig_0,
                                               challenge_0);
    await this._do_append_inbox_0(context, partialProofData, entry_0);
    return [];
  }
  async _withdraw_shielded_with_jubjub_0(context,
                                         partialProofData,
                                         recipient_0,
                                         color_0,
                                         amount_0,
                                         pk_0,
                                         use_counter_0,
                                         sig_r_0,
                                         sig_s_0,
                                         grind_nonce_0)
  {
    const coin_0 = this._held_coin_0(context, partialProofData, color_0);
    const challenge_0 = this._challenge_withdraw_shielded_with_jubjub_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                  partialProofData,
                                                                                                                                  [
                                                                                                                                   { dup: { n: 2 } },
                                                                                                                                   { idx: { cached: true,
                                                                                                                                            pushPath: false,
                                                                                                                                            path: [
                                                                                                                                                   { tag: 'value',
                                                                                                                                                     value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                              alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                   { popeq: { cached: true,
                                                                                                                                              result: undefined } }]).value),
                                                                        sig_r_0,
                                                                        pk_0,
                                                                        recipient_0,
                                                                        color_0,
                                                                        amount_0,
                                                                        coin_0,
                                                                        _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                  partialProofData,
                                                                                                                                  [
                                                                                                                                   { dup: { n: 0 } },
                                                                                                                                   { idx: { cached: false,
                                                                                                                                            pushPath: false,
                                                                                                                                            path: [
                                                                                                                                                   { tag: 'value',
                                                                                                                                                     value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                              alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                   { popeq: { cached: false,
                                                                                                                                              result: undefined } }]).value),
                                                                        grind_nonce_0);
    await this._require_authorised_with_jubjub_0(context,
                                                 partialProofData,
                                                 pk_0,
                                                 use_counter_0,
                                                 sig_r_0,
                                                 sig_s_0,
                                                 challenge_0);
    return await this._do_withdraw_shielded_0(context,
                                              partialProofData,
                                              recipient_0,
                                              amount_0,
                                              coin_0);
  }
  async _withdraw_shielded_with_k256_0(context,
                                       partialProofData,
                                       recipient_0,
                                       color_0,
                                       amount_0,
                                       pk_0,
                                       use_counter_0,
                                       sig_0)
  {
    const coin_0 = this._held_coin_0(context, partialProofData, color_0);
    const challenge_0 = this._challenge_withdraw_shielded_with_k256_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                partialProofData,
                                                                                                                                [
                                                                                                                                 { dup: { n: 2 } },
                                                                                                                                 { idx: { cached: true,
                                                                                                                                          pushPath: false,
                                                                                                                                          path: [
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                            alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                 { popeq: { cached: true,
                                                                                                                                            result: undefined } }]).value),
                                                                      pk_0,
                                                                      recipient_0,
                                                                      color_0,
                                                                      amount_0,
                                                                      coin_0,
                                                                      _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                partialProofData,
                                                                                                                                [
                                                                                                                                 { dup: { n: 0 } },
                                                                                                                                 { idx: { cached: false,
                                                                                                                                          pushPath: false,
                                                                                                                                          path: [
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                            alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                 { popeq: { cached: false,
                                                                                                                                            result: undefined } }]).value));
    await this._require_authorised_with_k256_0(context,
                                               partialProofData,
                                               pk_0,
                                               use_counter_0,
                                               sig_0,
                                               challenge_0);
    return await this._do_withdraw_shielded_0(context,
                                              partialProofData,
                                              recipient_0,
                                              amount_0,
                                              coin_0);
  }
  async _withdraw_shielded_to_contract_with_jubjub_0(context,
                                                     partialProofData,
                                                     recipient_0,
                                                     color_0,
                                                     amount_0,
                                                     pk_0,
                                                     use_counter_0,
                                                     sig_r_0,
                                                     sig_s_0,
                                                     grind_nonce_0)
  {
    const coin_0 = this._held_coin_0(context, partialProofData, color_0);
    const challenge_0 = this._challenge_withdraw_shielded_to_contract_with_jubjub_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                              partialProofData,
                                                                                                                                              [
                                                                                                                                               { dup: { n: 2 } },
                                                                                                                                               { idx: { cached: true,
                                                                                                                                                        pushPath: false,
                                                                                                                                                        path: [
                                                                                                                                                               { tag: 'value',
                                                                                                                                                                 value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                                          alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                               { popeq: { cached: true,
                                                                                                                                                          result: undefined } }]).value),
                                                                                    sig_r_0,
                                                                                    pk_0,
                                                                                    recipient_0,
                                                                                    color_0,
                                                                                    amount_0,
                                                                                    coin_0,
                                                                                    _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                              partialProofData,
                                                                                                                                              [
                                                                                                                                               { dup: { n: 0 } },
                                                                                                                                               { idx: { cached: false,
                                                                                                                                                        pushPath: false,
                                                                                                                                                        path: [
                                                                                                                                                               { tag: 'value',
                                                                                                                                                                 value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                                          alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                               { popeq: { cached: false,
                                                                                                                                                          result: undefined } }]).value),
                                                                                    grind_nonce_0);
    await this._require_authorised_with_jubjub_0(context,
                                                 partialProofData,
                                                 pk_0,
                                                 use_counter_0,
                                                 sig_r_0,
                                                 sig_s_0,
                                                 challenge_0);
    return await this._do_withdraw_shielded_to_contract_0(context,
                                                          partialProofData,
                                                          recipient_0,
                                                          amount_0,
                                                          coin_0);
  }
  async _withdraw_shielded_to_contract_with_k256_0(context,
                                                   partialProofData,
                                                   recipient_0,
                                                   color_0,
                                                   amount_0,
                                                   pk_0,
                                                   use_counter_0,
                                                   sig_0)
  {
    const coin_0 = this._held_coin_0(context, partialProofData, color_0);
    const challenge_0 = this._challenge_withdraw_shielded_to_contract_with_k256_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                            partialProofData,
                                                                                                                                            [
                                                                                                                                             { dup: { n: 2 } },
                                                                                                                                             { idx: { cached: true,
                                                                                                                                                      pushPath: false,
                                                                                                                                                      path: [
                                                                                                                                                             { tag: 'value',
                                                                                                                                                               value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                                        alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                             { popeq: { cached: true,
                                                                                                                                                        result: undefined } }]).value),
                                                                                  pk_0,
                                                                                  recipient_0,
                                                                                  color_0,
                                                                                  amount_0,
                                                                                  coin_0,
                                                                                  _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                            partialProofData,
                                                                                                                                            [
                                                                                                                                             { dup: { n: 0 } },
                                                                                                                                             { idx: { cached: false,
                                                                                                                                                      pushPath: false,
                                                                                                                                                      path: [
                                                                                                                                                             { tag: 'value',
                                                                                                                                                               value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                                        alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                             { popeq: { cached: false,
                                                                                                                                                        result: undefined } }]).value));
    await this._require_authorised_with_k256_0(context,
                                               partialProofData,
                                               pk_0,
                                               use_counter_0,
                                               sig_0,
                                               challenge_0);
    return await this._do_withdraw_shielded_to_contract_0(context,
                                                          partialProofData,
                                                          recipient_0,
                                                          amount_0,
                                                          coin_0);
  }
  async _rotate_enc_key_with_jubjub_0(context,
                                      partialProofData,
                                      new_key_0,
                                      pk_0,
                                      use_counter_0,
                                      sig_r_0,
                                      sig_s_0,
                                      grind_nonce_0)
  {
    const challenge_0 = this._challenge_rotate_enc_key_with_jubjub_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                               partialProofData,
                                                                                                                               [
                                                                                                                                { dup: { n: 2 } },
                                                                                                                                { idx: { cached: true,
                                                                                                                                         pushPath: false,
                                                                                                                                         path: [
                                                                                                                                                { tag: 'value',
                                                                                                                                                  value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                           alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                { popeq: { cached: true,
                                                                                                                                           result: undefined } }]).value),
                                                                     sig_r_0,
                                                                     pk_0,
                                                                     new_key_0,
                                                                     _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                               partialProofData,
                                                                                                                               [
                                                                                                                                { dup: { n: 0 } },
                                                                                                                                { idx: { cached: false,
                                                                                                                                         pushPath: false,
                                                                                                                                         path: [
                                                                                                                                                { tag: 'value',
                                                                                                                                                  value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                           alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                { popeq: { cached: false,
                                                                                                                                           result: undefined } }]).value),
                                                                     grind_nonce_0);
    await this._require_authorised_with_jubjub_0(context,
                                                 partialProofData,
                                                 pk_0,
                                                 use_counter_0,
                                                 sig_r_0,
                                                 sig_s_0,
                                                 challenge_0);
    await this._do_rotate_enc_key_0(context, partialProofData, new_key_0);
    return [];
  }
  async _rotate_enc_key_with_k256_0(context,
                                    partialProofData,
                                    new_key_0,
                                    pk_0,
                                    use_counter_0,
                                    sig_0)
  {
    const challenge_0 = this._challenge_rotate_enc_key_with_k256_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                             partialProofData,
                                                                                                                             [
                                                                                                                              { dup: { n: 2 } },
                                                                                                                              { idx: { cached: true,
                                                                                                                                       pushPath: false,
                                                                                                                                       path: [
                                                                                                                                              { tag: 'value',
                                                                                                                                                value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                         alignment: _descriptor_17.alignment() } }] } },
                                                                                                                              { popeq: { cached: true,
                                                                                                                                         result: undefined } }]).value),
                                                                   pk_0,
                                                                   new_key_0,
                                                                   _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                             partialProofData,
                                                                                                                             [
                                                                                                                              { dup: { n: 0 } },
                                                                                                                              { idx: { cached: false,
                                                                                                                                       pushPath: false,
                                                                                                                                       path: [
                                                                                                                                              { tag: 'value',
                                                                                                                                                value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                         alignment: _descriptor_17.alignment() } }] } },
                                                                                                                              { popeq: { cached: false,
                                                                                                                                         result: undefined } }]).value));
    await this._require_authorised_with_k256_0(context,
                                               partialProofData,
                                               pk_0,
                                               use_counter_0,
                                               sig_0,
                                               challenge_0);
    await this._do_rotate_enc_key_0(context, partialProofData, new_key_0);
    return [];
  }
  async _add_device_with_jubjub_0(context,
                                  partialProofData,
                                  new_entry_0,
                                  pk_0,
                                  use_counter_0,
                                  sig_r_0,
                                  sig_s_0,
                                  grind_nonce_0)
  {
    const challenge_0 = this._challenge_add_device_with_jubjub_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                           partialProofData,
                                                                                                                           [
                                                                                                                            { dup: { n: 2 } },
                                                                                                                            { idx: { cached: true,
                                                                                                                                     pushPath: false,
                                                                                                                                     path: [
                                                                                                                                            { tag: 'value',
                                                                                                                                              value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                       alignment: _descriptor_17.alignment() } }] } },
                                                                                                                            { popeq: { cached: true,
                                                                                                                                       result: undefined } }]).value),
                                                                 sig_r_0,
                                                                 pk_0,
                                                                 new_entry_0,
                                                                 _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                           partialProofData,
                                                                                                                           [
                                                                                                                            { dup: { n: 0 } },
                                                                                                                            { idx: { cached: false,
                                                                                                                                     pushPath: false,
                                                                                                                                     path: [
                                                                                                                                            { tag: 'value',
                                                                                                                                              value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                       alignment: _descriptor_17.alignment() } }] } },
                                                                                                                            { popeq: { cached: false,
                                                                                                                                       result: undefined } }]).value),
                                                                 grind_nonce_0);
    await this._require_authorised_with_jubjub_0(context,
                                                 partialProofData,
                                                 pk_0,
                                                 use_counter_0,
                                                 sig_r_0,
                                                 sig_s_0,
                                                 challenge_0);
    await this._do_add_device_0(context, partialProofData, new_entry_0);
    return [];
  }
  async _add_device_with_k256_0(context,
                                partialProofData,
                                new_entry_0,
                                pk_0,
                                use_counter_0,
                                sig_0)
  {
    const challenge_0 = this._challenge_add_device_with_k256_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                         partialProofData,
                                                                                                                         [
                                                                                                                          { dup: { n: 2 } },
                                                                                                                          { idx: { cached: true,
                                                                                                                                   pushPath: false,
                                                                                                                                   path: [
                                                                                                                                          { tag: 'value',
                                                                                                                                            value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                                                                          { popeq: { cached: true,
                                                                                                                                     result: undefined } }]).value),
                                                               pk_0,
                                                               new_entry_0,
                                                               _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                         partialProofData,
                                                                                                                         [
                                                                                                                          { dup: { n: 0 } },
                                                                                                                          { idx: { cached: false,
                                                                                                                                   pushPath: false,
                                                                                                                                   path: [
                                                                                                                                          { tag: 'value',
                                                                                                                                            value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                                                                          { popeq: { cached: false,
                                                                                                                                     result: undefined } }]).value));
    await this._require_authorised_with_k256_0(context,
                                               partialProofData,
                                               pk_0,
                                               use_counter_0,
                                               sig_0,
                                               challenge_0);
    await this._do_add_device_0(context, partialProofData, new_entry_0);
    return [];
  }
  async _remove_device_with_jubjub_0(context,
                                     partialProofData,
                                     entry_0,
                                     pk_0,
                                     use_counter_0,
                                     sig_r_0,
                                     sig_s_0,
                                     grind_nonce_0)
  {
    const challenge_0 = this._challenge_remove_device_with_jubjub_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                              partialProofData,
                                                                                                                              [
                                                                                                                               { dup: { n: 2 } },
                                                                                                                               { idx: { cached: true,
                                                                                                                                        pushPath: false,
                                                                                                                                        path: [
                                                                                                                                               { tag: 'value',
                                                                                                                                                 value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                          alignment: _descriptor_17.alignment() } }] } },
                                                                                                                               { popeq: { cached: true,
                                                                                                                                          result: undefined } }]).value),
                                                                    sig_r_0,
                                                                    pk_0,
                                                                    entry_0,
                                                                    _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                              partialProofData,
                                                                                                                              [
                                                                                                                               { dup: { n: 0 } },
                                                                                                                               { idx: { cached: false,
                                                                                                                                        pushPath: false,
                                                                                                                                        path: [
                                                                                                                                               { tag: 'value',
                                                                                                                                                 value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                          alignment: _descriptor_17.alignment() } }] } },
                                                                                                                               { popeq: { cached: false,
                                                                                                                                          result: undefined } }]).value),
                                                                    grind_nonce_0);
    await this._require_authorised_with_jubjub_0(context,
                                                 partialProofData,
                                                 pk_0,
                                                 use_counter_0,
                                                 sig_r_0,
                                                 sig_s_0,
                                                 challenge_0);
    await this._do_remove_device_0(context,
                                   partialProofData,
                                   entry_0,
                                   this._derive_device_entry_with_jubjub_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                     partialProofData,
                                                                                                                                     [
                                                                                                                                      { dup: { n: 2 } },
                                                                                                                                      { idx: { cached: true,
                                                                                                                                               pushPath: false,
                                                                                                                                               path: [
                                                                                                                                                      { tag: 'value',
                                                                                                                                                        value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                                 alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                      { popeq: { cached: true,
                                                                                                                                                 result: undefined } }]).value),
                                                                           pk_0,
                                                                           _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                     partialProofData,
                                                                                                                                     [
                                                                                                                                      { dup: { n: 0 } },
                                                                                                                                      { idx: { cached: false,
                                                                                                                                               pushPath: false,
                                                                                                                                               path: [
                                                                                                                                                      { tag: 'value',
                                                                                                                                                        value: { value: _descriptor_17.toValue(7n),
                                                                                                                                                                 alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                      { popeq: { cached: false,
                                                                                                                                                 result: undefined } }]).value),
                                                                           ((t1) => {
                                                                             if (t1 > 18446744073709551615n) {
                                                                               throw new __compactRuntime.CompactError('account.compact line 1163 char 39: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                                                             }
                                                                             return t1;
                                                                           })(use_counter_0
                                                                              +
                                                                              1n)));
    return [];
  }
  async _remove_device_with_k256_0(context,
                                   partialProofData,
                                   entry_0,
                                   pk_0,
                                   use_counter_0,
                                   sig_0)
  {
    const challenge_0 = this._challenge_remove_device_with_k256_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                            partialProofData,
                                                                                                                            [
                                                                                                                             { dup: { n: 2 } },
                                                                                                                             { idx: { cached: true,
                                                                                                                                      pushPath: false,
                                                                                                                                      path: [
                                                                                                                                             { tag: 'value',
                                                                                                                                               value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                        alignment: _descriptor_17.alignment() } }] } },
                                                                                                                             { popeq: { cached: true,
                                                                                                                                        result: undefined } }]).value),
                                                                  pk_0,
                                                                  entry_0,
                                                                  _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                            partialProofData,
                                                                                                                            [
                                                                                                                             { dup: { n: 0 } },
                                                                                                                             { idx: { cached: false,
                                                                                                                                      pushPath: false,
                                                                                                                                      path: [
                                                                                                                                             { tag: 'value',
                                                                                                                                               value: { value: _descriptor_17.toValue(9n),
                                                                                                                                                        alignment: _descriptor_17.alignment() } }] } },
                                                                                                                             { popeq: { cached: false,
                                                                                                                                        result: undefined } }]).value));
    await this._require_authorised_with_k256_0(context,
                                               partialProofData,
                                               pk_0,
                                               use_counter_0,
                                               sig_0,
                                               challenge_0);
    await this._do_remove_device_0(context,
                                   partialProofData,
                                   entry_0,
                                   this._derive_device_entry_with_k256_0(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                   partialProofData,
                                                                                                                                   [
                                                                                                                                    { dup: { n: 2 } },
                                                                                                                                    { idx: { cached: true,
                                                                                                                                             pushPath: false,
                                                                                                                                             path: [
                                                                                                                                                    { tag: 'value',
                                                                                                                                                      value: { value: _descriptor_17.toValue(0n),
                                                                                                                                                               alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                    { popeq: { cached: true,
                                                                                                                                               result: undefined } }]).value),
                                                                         pk_0,
                                                                         _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                   partialProofData,
                                                                                                                                   [
                                                                                                                                    { dup: { n: 0 } },
                                                                                                                                    { idx: { cached: false,
                                                                                                                                             pushPath: false,
                                                                                                                                             path: [
                                                                                                                                                    { tag: 'value',
                                                                                                                                                      value: { value: _descriptor_17.toValue(7n),
                                                                                                                                                               alignment: _descriptor_17.alignment() } }] } },
                                                                                                                                    { popeq: { cached: false,
                                                                                                                                               result: undefined } }]).value),
                                                                         ((t1) => {
                                                                           if (t1 > 18446744073709551615n) {
                                                                             throw new __compactRuntime.CompactError('account.compact line 1179 char 39: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                                                           }
                                                                           return t1;
                                                                         })(use_counter_0
                                                                            +
                                                                            1n)));
    return [];
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0.x != y0.x || x0.y != y0.y) {
      return false;
    }
    return true;
  }
  _equal_3(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_5(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_6(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_7(x0, y0) {
    if (x0.x != y0.x || x0.y != y0.y) {
      return false;
    }
    return true;
  }
  _equal_8(x0, y0) {
    if (x0.x != y0.x || x0.y != y0.y) {
      return false;
    }
    return true;
  }
  _equal_9(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    callContext: { currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() },
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get round() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_17.toValue(0n),
                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get enc_key() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_17.toValue(1n),
                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    inbox: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_17.toValue(2n),
                                                                                                      alignment: _descriptor_17.alignment() } }] } },
                                                                           'size',
                                                                           { push: { storage: false,
                                                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                  alignment: _descriptor_3.alignment() }).encode() } },
                                                                           'eq',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(2n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'account.compact line 155 char 1',
                                     'Uint<0..18446744073709551616>',
                                     key_0)
        }
        return _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_17.toValue(2n),
                                                                                                      alignment: _descriptor_17.alignment() } }] } },
                                                                           { push: { storage: false,
                                                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(key_0),
                                                                                                                                  alignment: _descriptor_3.alignment() }).encode() } },
                                                                           'member',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'account.compact line 155 char 1',
                                     'Uint<0..18446744073709551616>',
                                     key_0)
        }
        return _descriptor_15.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_17.toValue(2n),
                                                                                                      alignment: _descriptor_17.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_3.toValue(key_0),
                                                                                                      alignment: _descriptor_3.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[2];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_3.fromValue(key.value),      _descriptor_15.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    get inbox_count() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_17.toValue(3n),
                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    unshielded_balances: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_17.toValue(4n),
                                                                                                      alignment: _descriptor_17.alignment() } }] } },
                                                                           'size',
                                                                           { push: { storage: false,
                                                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                  alignment: _descriptor_3.alignment() }).encode() } },
                                                                           'eq',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(4n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'account.compact line 160 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_17.toValue(4n),
                                                                                                      alignment: _descriptor_17.alignment() } }] } },
                                                                           { push: { storage: false,
                                                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(key_0),
                                                                                                                                  alignment: _descriptor_1.alignment() }).encode() } },
                                                                           'member',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'account.compact line 160 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_9.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(4n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(key_0),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[4];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_1.fromValue(key.value),      _descriptor_9.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    get spec_version() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_17.toValue(5n),
                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    devices: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_17.toValue(6n),
                                                                                                      alignment: _descriptor_17.alignment() } }] } },
                                                                           'size',
                                                                           { push: { storage: false,
                                                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                  alignment: _descriptor_3.alignment() }).encode() } },
                                                                           'eq',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(6n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'account.compact line 169 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_17.toValue(6n),
                                                                                                      alignment: _descriptor_17.alignment() } }] } },
                                                                           { push: { storage: false,
                                                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(elem_0),
                                                                                                                                  alignment: _descriptor_1.alignment() }).encode() } },
                                                                           'member',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[6];
        return self_0.asMap().keys().map((elem) => _descriptor_1.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    get device_epoch() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_17.toValue(7n),
                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get device_count() {
      return _descriptor_17.fromValue(__compactRuntime.queryLedgerState(context,
                                                                        partialProofData,
                                                                        [
                                                                         { dup: { n: 0 } },
                                                                         { idx: { cached: false,
                                                                                  pushPath: false,
                                                                                  path: [
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_17.toValue(8n),
                                                                                                    alignment: _descriptor_17.alignment() } }] } },
                                                                         { popeq: { cached: false,
                                                                                    result: undefined } }]).value);
    },
    get auth_nonce() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_17.toValue(9n),
                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get boot() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_17.toValue(10n),
                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get booted() {
      return _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                        partialProofData,
                                                                        [
                                                                         { dup: { n: 0 } },
                                                                         { idx: { cached: false,
                                                                                  pushPath: false,
                                                                                  path: [
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_17.toValue(11n),
                                                                                                    alignment: _descriptor_17.alignment() } }] } },
                                                                         { popeq: { cached: false,
                                                                                    result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  callContext: { currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() }
};
const _dummyContract = new Contract({ held_coin: (...args) => undefined });
export const pureCircuits = {
  derive_boot_commitment_with_jubjub: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`derive_boot_commitment_with_jubjub: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const salt_0 = args_0[0];
    const pk_0 = args_0[1];
    if (!(salt_0.buffer instanceof ArrayBuffer && salt_0.BYTES_PER_ELEMENT === 1 && salt_0.length === 32)) {
      __compactRuntime.typeError('derive_boot_commitment_with_jubjub',
                                 'argument 1',
                                 'account.compact line 269 char 1',
                                 'Bytes<32>',
                                 salt_0)
    }
    return _dummyContract._derive_boot_commitment_with_jubjub_0(salt_0, pk_0);
  },
  derive_boot_commitment_with_k256: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`derive_boot_commitment_with_k256: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const salt_0 = args_0[0];
    const pk_0 = args_0[1];
    if (!(salt_0.buffer instanceof ArrayBuffer && salt_0.BYTES_PER_ELEMENT === 1 && salt_0.length === 32)) {
      __compactRuntime.typeError('derive_boot_commitment_with_k256',
                                 'argument 1',
                                 'account.compact line 278 char 1',
                                 'Bytes<32>',
                                 salt_0)
    }
    return _dummyContract._derive_boot_commitment_with_k256_0(salt_0, pk_0);
  },
  derive_device_entry_with_jubjub: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`derive_device_entry_with_jubjub: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const pk_0 = args_0[1];
    const epoch_0 = args_0[2];
    const counter_0 = args_0[3];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('derive_device_entry_with_jubjub',
                                 'argument 1',
                                 'account.compact line 296 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(typeof(epoch_0) === 'bigint' && epoch_0 >= 0n && epoch_0 <= 4294967295n)) {
      __compactRuntime.typeError('derive_device_entry_with_jubjub',
                                 'argument 3',
                                 'account.compact line 296 char 1',
                                 'Uint<0..4294967296>',
                                 epoch_0)
    }
    if (!(typeof(counter_0) === 'bigint' && counter_0 >= 0n && counter_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('derive_device_entry_with_jubjub',
                                 'argument 4',
                                 'account.compact line 296 char 1',
                                 'Uint<0..18446744073709551616>',
                                 counter_0)
    }
    return _dummyContract._derive_device_entry_with_jubjub_0(self_addr_0,
                                                             pk_0,
                                                             epoch_0,
                                                             counter_0);
  },
  derive_device_entry_with_k256: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`derive_device_entry_with_k256: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const pk_0 = args_0[1];
    const epoch_0 = args_0[2];
    const counter_0 = args_0[3];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('derive_device_entry_with_k256',
                                 'argument 1',
                                 'account.compact line 317 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(typeof(epoch_0) === 'bigint' && epoch_0 >= 0n && epoch_0 <= 4294967295n)) {
      __compactRuntime.typeError('derive_device_entry_with_k256',
                                 'argument 3',
                                 'account.compact line 317 char 1',
                                 'Uint<0..4294967296>',
                                 epoch_0)
    }
    if (!(typeof(counter_0) === 'bigint' && counter_0 >= 0n && counter_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('derive_device_entry_with_k256',
                                 'argument 4',
                                 'account.compact line 317 char 1',
                                 'Uint<0..18446744073709551616>',
                                 counter_0)
    }
    return _dummyContract._derive_device_entry_with_k256_0(self_addr_0,
                                                           pk_0,
                                                           epoch_0,
                                                           counter_0);
  },
  compute_public_point_with_jubjub: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`compute_public_point_with_jubjub: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const scalar_0 = args_0[0];
    if (!(typeof(scalar_0) === 'bigint' && scalar_0 >= 0 && scalar_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('compute_public_point_with_jubjub',
                                 'argument 1',
                                 'account.compact line 358 char 1',
                                 'Field',
                                 scalar_0)
    }
    return _dummyContract._compute_public_point_with_jubjub_0(scalar_0);
  },
  compute_public_point_with_k256: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`compute_public_point_with_k256: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const scalar_0 = args_0[0];
    if (!(typeof(scalar_0) === 'bigint' && scalar_0 >= 0 && scalar_0 <= __compactRuntime.MAX_SECP256K1_SCALAR)) {
      __compactRuntime.typeError('compute_public_point_with_k256',
                                 'argument 1',
                                 'account.compact line 362 char 1',
                                 'Secp256k1Scalar',
                                 scalar_0)
    }
    return _dummyContract._compute_public_point_with_k256_0(scalar_0);
  },
  challenge_withdraw_unshielded_with_jubjub: (...args_0) => {
    if (args_0.length !== 8) {
      throw new __compactRuntime.CompactError(`challenge_withdraw_unshielded_with_jubjub: expected 8 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const sig_r_0 = args_0[1];
    const pk_0 = args_0[2];
    const color_0 = args_0[3];
    const amount_0 = args_0[4];
    const recipient_0 = args_0[5];
    const nonce_value_0 = args_0[6];
    const grind_nonce_0 = args_0[7];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_unshielded_with_jubjub',
                                 'argument 1',
                                 'account.compact line 379 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_unshielded_with_jubjub',
                                 'argument 4',
                                 'account.compact line 379 char 1',
                                 'Bytes<32>',
                                 color_0)
    }
    if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('challenge_withdraw_unshielded_with_jubjub',
                                 'argument 5',
                                 'account.compact line 379 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 amount_0)
    }
    if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_unshielded_with_jubjub',
                                 'argument 6',
                                 'account.compact line 379 char 1',
                                 'struct UserAddress<bytes: Bytes<32>>',
                                 recipient_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_withdraw_unshielded_with_jubjub',
                                 'argument 7',
                                 'account.compact line 379 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_withdraw_unshielded_with_jubjub',
                                 'argument 8',
                                 'account.compact line 379 char 1',
                                 'Uint<0..18446744073709551616>',
                                 grind_nonce_0)
    }
    return _dummyContract._challenge_withdraw_unshielded_with_jubjub_0(self_addr_0,
                                                                       sig_r_0,
                                                                       pk_0,
                                                                       color_0,
                                                                       amount_0,
                                                                       recipient_0,
                                                                       nonce_value_0,
                                                                       grind_nonce_0);
  },
  challenge_withdraw_shielded_with_jubjub: (...args_0) => {
    if (args_0.length !== 9) {
      throw new __compactRuntime.CompactError(`challenge_withdraw_shielded_with_jubjub: expected 9 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const sig_r_0 = args_0[1];
    const pk_0 = args_0[2];
    const recipient_0 = args_0[3];
    const color_0 = args_0[4];
    const amount_0 = args_0[5];
    const coin_0 = args_0[6];
    const nonce_value_0 = args_0[7];
    const grind_nonce_0 = args_0[8];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_with_jubjub',
                                 'argument 1',
                                 'account.compact line 401 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_with_jubjub',
                                 'argument 4',
                                 'account.compact line 401 char 1',
                                 'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                 recipient_0)
    }
    if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_with_jubjub',
                                 'argument 5',
                                 'account.compact line 401 char 1',
                                 'Bytes<32>',
                                 color_0)
    }
    if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_with_jubjub',
                                 'argument 6',
                                 'account.compact line 401 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 amount_0)
    }
    if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n && typeof(coin_0.mt_index) === 'bigint' && coin_0.mt_index >= 0n && coin_0.mt_index <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_with_jubjub',
                                 'argument 7',
                                 'account.compact line 401 char 1',
                                 'struct QualifiedShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>, mt_index: Uint<0..18446744073709551616>>',
                                 coin_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_with_jubjub',
                                 'argument 8',
                                 'account.compact line 401 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_with_jubjub',
                                 'argument 9',
                                 'account.compact line 401 char 1',
                                 'Uint<0..18446744073709551616>',
                                 grind_nonce_0)
    }
    return _dummyContract._challenge_withdraw_shielded_with_jubjub_0(self_addr_0,
                                                                     sig_r_0,
                                                                     pk_0,
                                                                     recipient_0,
                                                                     color_0,
                                                                     amount_0,
                                                                     coin_0,
                                                                     nonce_value_0,
                                                                     grind_nonce_0);
  },
  challenge_withdraw_shielded_to_contract_with_jubjub: (...args_0) => {
    if (args_0.length !== 9) {
      throw new __compactRuntime.CompactError(`challenge_withdraw_shielded_to_contract_with_jubjub: expected 9 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const sig_r_0 = args_0[1];
    const pk_0 = args_0[2];
    const recipient_0 = args_0[3];
    const color_0 = args_0[4];
    const amount_0 = args_0[5];
    const coin_0 = args_0[6];
    const nonce_value_0 = args_0[7];
    const grind_nonce_0 = args_0[8];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_to_contract_with_jubjub',
                                 'argument 1',
                                 'account.compact line 420 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_to_contract_with_jubjub',
                                 'argument 4',
                                 'account.compact line 420 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 recipient_0)
    }
    if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_to_contract_with_jubjub',
                                 'argument 5',
                                 'account.compact line 420 char 1',
                                 'Bytes<32>',
                                 color_0)
    }
    if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_to_contract_with_jubjub',
                                 'argument 6',
                                 'account.compact line 420 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 amount_0)
    }
    if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n && typeof(coin_0.mt_index) === 'bigint' && coin_0.mt_index >= 0n && coin_0.mt_index <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_to_contract_with_jubjub',
                                 'argument 7',
                                 'account.compact line 420 char 1',
                                 'struct QualifiedShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>, mt_index: Uint<0..18446744073709551616>>',
                                 coin_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_to_contract_with_jubjub',
                                 'argument 8',
                                 'account.compact line 420 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_to_contract_with_jubjub',
                                 'argument 9',
                                 'account.compact line 420 char 1',
                                 'Uint<0..18446744073709551616>',
                                 grind_nonce_0)
    }
    return _dummyContract._challenge_withdraw_shielded_to_contract_with_jubjub_0(self_addr_0,
                                                                                 sig_r_0,
                                                                                 pk_0,
                                                                                 recipient_0,
                                                                                 color_0,
                                                                                 amount_0,
                                                                                 coin_0,
                                                                                 nonce_value_0,
                                                                                 grind_nonce_0);
  },
  challenge_append_inbox_with_jubjub: (...args_0) => {
    if (args_0.length !== 6) {
      throw new __compactRuntime.CompactError(`challenge_append_inbox_with_jubjub: expected 6 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const sig_r_0 = args_0[1];
    const pk_0 = args_0[2];
    const entry_0 = args_0[3];
    const nonce_value_0 = args_0[4];
    const grind_nonce_0 = args_0[5];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_append_inbox_with_jubjub',
                                 'argument 1',
                                 'account.compact line 439 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(entry_0.buffer instanceof ArrayBuffer && entry_0.BYTES_PER_ELEMENT === 1 && entry_0.length === 192)) {
      __compactRuntime.typeError('challenge_append_inbox_with_jubjub',
                                 'argument 4',
                                 'account.compact line 439 char 1',
                                 'Bytes<192>',
                                 entry_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_append_inbox_with_jubjub',
                                 'argument 5',
                                 'account.compact line 439 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_append_inbox_with_jubjub',
                                 'argument 6',
                                 'account.compact line 439 char 1',
                                 'Uint<0..18446744073709551616>',
                                 grind_nonce_0)
    }
    return _dummyContract._challenge_append_inbox_with_jubjub_0(self_addr_0,
                                                                sig_r_0,
                                                                pk_0,
                                                                entry_0,
                                                                nonce_value_0,
                                                                grind_nonce_0);
  },
  challenge_rotate_enc_key_with_jubjub: (...args_0) => {
    if (args_0.length !== 6) {
      throw new __compactRuntime.CompactError(`challenge_rotate_enc_key_with_jubjub: expected 6 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const sig_r_0 = args_0[1];
    const pk_0 = args_0[2];
    const new_key_0 = args_0[3];
    const nonce_value_0 = args_0[4];
    const grind_nonce_0 = args_0[5];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_rotate_enc_key_with_jubjub',
                                 'argument 1',
                                 'account.compact line 455 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(new_key_0.buffer instanceof ArrayBuffer && new_key_0.BYTES_PER_ELEMENT === 1 && new_key_0.length === 32)) {
      __compactRuntime.typeError('challenge_rotate_enc_key_with_jubjub',
                                 'argument 4',
                                 'account.compact line 455 char 1',
                                 'Bytes<32>',
                                 new_key_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_rotate_enc_key_with_jubjub',
                                 'argument 5',
                                 'account.compact line 455 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_rotate_enc_key_with_jubjub',
                                 'argument 6',
                                 'account.compact line 455 char 1',
                                 'Uint<0..18446744073709551616>',
                                 grind_nonce_0)
    }
    return _dummyContract._challenge_rotate_enc_key_with_jubjub_0(self_addr_0,
                                                                  sig_r_0,
                                                                  pk_0,
                                                                  new_key_0,
                                                                  nonce_value_0,
                                                                  grind_nonce_0);
  },
  challenge_add_device_with_jubjub: (...args_0) => {
    if (args_0.length !== 6) {
      throw new __compactRuntime.CompactError(`challenge_add_device_with_jubjub: expected 6 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const sig_r_0 = args_0[1];
    const pk_0 = args_0[2];
    const new_entry_0 = args_0[3];
    const nonce_value_0 = args_0[4];
    const grind_nonce_0 = args_0[5];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_add_device_with_jubjub',
                                 'argument 1',
                                 'account.compact line 475 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(new_entry_0.buffer instanceof ArrayBuffer && new_entry_0.BYTES_PER_ELEMENT === 1 && new_entry_0.length === 32)) {
      __compactRuntime.typeError('challenge_add_device_with_jubjub',
                                 'argument 4',
                                 'account.compact line 475 char 1',
                                 'Bytes<32>',
                                 new_entry_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_add_device_with_jubjub',
                                 'argument 5',
                                 'account.compact line 475 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_add_device_with_jubjub',
                                 'argument 6',
                                 'account.compact line 475 char 1',
                                 'Uint<0..18446744073709551616>',
                                 grind_nonce_0)
    }
    return _dummyContract._challenge_add_device_with_jubjub_0(self_addr_0,
                                                              sig_r_0,
                                                              pk_0,
                                                              new_entry_0,
                                                              nonce_value_0,
                                                              grind_nonce_0);
  },
  challenge_remove_device_with_jubjub: (...args_0) => {
    if (args_0.length !== 6) {
      throw new __compactRuntime.CompactError(`challenge_remove_device_with_jubjub: expected 6 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const sig_r_0 = args_0[1];
    const pk_0 = args_0[2];
    const entry_0 = args_0[3];
    const nonce_value_0 = args_0[4];
    const grind_nonce_0 = args_0[5];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_remove_device_with_jubjub',
                                 'argument 1',
                                 'account.compact line 491 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(entry_0.buffer instanceof ArrayBuffer && entry_0.BYTES_PER_ELEMENT === 1 && entry_0.length === 32)) {
      __compactRuntime.typeError('challenge_remove_device_with_jubjub',
                                 'argument 4',
                                 'account.compact line 491 char 1',
                                 'Bytes<32>',
                                 entry_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_remove_device_with_jubjub',
                                 'argument 5',
                                 'account.compact line 491 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    if (!(typeof(grind_nonce_0) === 'bigint' && grind_nonce_0 >= 0n && grind_nonce_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_remove_device_with_jubjub',
                                 'argument 6',
                                 'account.compact line 491 char 1',
                                 'Uint<0..18446744073709551616>',
                                 grind_nonce_0)
    }
    return _dummyContract._challenge_remove_device_with_jubjub_0(self_addr_0,
                                                                 sig_r_0,
                                                                 pk_0,
                                                                 entry_0,
                                                                 nonce_value_0,
                                                                 grind_nonce_0);
  },
  challenge_withdraw_unshielded_with_k256: (...args_0) => {
    if (args_0.length !== 6) {
      throw new __compactRuntime.CompactError(`challenge_withdraw_unshielded_with_k256: expected 6 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const pk_0 = args_0[1];
    const color_0 = args_0[2];
    const amount_0 = args_0[3];
    const recipient_0 = args_0[4];
    const nonce_value_0 = args_0[5];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_unshielded_with_k256',
                                 'argument 1',
                                 'account.compact line 516 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_unshielded_with_k256',
                                 'argument 3',
                                 'account.compact line 516 char 1',
                                 'Bytes<32>',
                                 color_0)
    }
    if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('challenge_withdraw_unshielded_with_k256',
                                 'argument 4',
                                 'account.compact line 516 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 amount_0)
    }
    if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_unshielded_with_k256',
                                 'argument 5',
                                 'account.compact line 516 char 1',
                                 'struct UserAddress<bytes: Bytes<32>>',
                                 recipient_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_withdraw_unshielded_with_k256',
                                 'argument 6',
                                 'account.compact line 516 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    return _dummyContract._challenge_withdraw_unshielded_with_k256_0(self_addr_0,
                                                                     pk_0,
                                                                     color_0,
                                                                     amount_0,
                                                                     recipient_0,
                                                                     nonce_value_0);
  },
  challenge_withdraw_shielded_with_k256: (...args_0) => {
    if (args_0.length !== 7) {
      throw new __compactRuntime.CompactError(`challenge_withdraw_shielded_with_k256: expected 7 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const pk_0 = args_0[1];
    const recipient_0 = args_0[2];
    const color_0 = args_0[3];
    const amount_0 = args_0[4];
    const coin_0 = args_0[5];
    const nonce_value_0 = args_0[6];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_with_k256',
                                 'argument 1',
                                 'account.compact line 534 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_with_k256',
                                 'argument 3',
                                 'account.compact line 534 char 1',
                                 'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                 recipient_0)
    }
    if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_with_k256',
                                 'argument 4',
                                 'account.compact line 534 char 1',
                                 'Bytes<32>',
                                 color_0)
    }
    if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_with_k256',
                                 'argument 5',
                                 'account.compact line 534 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 amount_0)
    }
    if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n && typeof(coin_0.mt_index) === 'bigint' && coin_0.mt_index >= 0n && coin_0.mt_index <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_with_k256',
                                 'argument 6',
                                 'account.compact line 534 char 1',
                                 'struct QualifiedShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>, mt_index: Uint<0..18446744073709551616>>',
                                 coin_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_with_k256',
                                 'argument 7',
                                 'account.compact line 534 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    return _dummyContract._challenge_withdraw_shielded_with_k256_0(self_addr_0,
                                                                   pk_0,
                                                                   recipient_0,
                                                                   color_0,
                                                                   amount_0,
                                                                   coin_0,
                                                                   nonce_value_0);
  },
  challenge_withdraw_shielded_to_contract_with_k256: (...args_0) => {
    if (args_0.length !== 7) {
      throw new __compactRuntime.CompactError(`challenge_withdraw_shielded_to_contract_with_k256: expected 7 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const pk_0 = args_0[1];
    const recipient_0 = args_0[2];
    const color_0 = args_0[3];
    const amount_0 = args_0[4];
    const coin_0 = args_0[5];
    const nonce_value_0 = args_0[6];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_to_contract_with_k256',
                                 'argument 1',
                                 'account.compact line 553 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_to_contract_with_k256',
                                 'argument 3',
                                 'account.compact line 553 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 recipient_0)
    }
    if (!(color_0.buffer instanceof ArrayBuffer && color_0.BYTES_PER_ELEMENT === 1 && color_0.length === 32)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_to_contract_with_k256',
                                 'argument 4',
                                 'account.compact line 553 char 1',
                                 'Bytes<32>',
                                 color_0)
    }
    if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_to_contract_with_k256',
                                 'argument 5',
                                 'account.compact line 553 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 amount_0)
    }
    if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n && typeof(coin_0.mt_index) === 'bigint' && coin_0.mt_index >= 0n && coin_0.mt_index <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_to_contract_with_k256',
                                 'argument 6',
                                 'account.compact line 553 char 1',
                                 'struct QualifiedShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>, mt_index: Uint<0..18446744073709551616>>',
                                 coin_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_withdraw_shielded_to_contract_with_k256',
                                 'argument 7',
                                 'account.compact line 553 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    return _dummyContract._challenge_withdraw_shielded_to_contract_with_k256_0(self_addr_0,
                                                                               pk_0,
                                                                               recipient_0,
                                                                               color_0,
                                                                               amount_0,
                                                                               coin_0,
                                                                               nonce_value_0);
  },
  challenge_append_inbox_with_k256: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`challenge_append_inbox_with_k256: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const pk_0 = args_0[1];
    const entry_0 = args_0[2];
    const nonce_value_0 = args_0[3];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_append_inbox_with_k256',
                                 'argument 1',
                                 'account.compact line 572 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(entry_0.buffer instanceof ArrayBuffer && entry_0.BYTES_PER_ELEMENT === 1 && entry_0.length === 192)) {
      __compactRuntime.typeError('challenge_append_inbox_with_k256',
                                 'argument 3',
                                 'account.compact line 572 char 1',
                                 'Bytes<192>',
                                 entry_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_append_inbox_with_k256',
                                 'argument 4',
                                 'account.compact line 572 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    return _dummyContract._challenge_append_inbox_with_k256_0(self_addr_0,
                                                              pk_0,
                                                              entry_0,
                                                              nonce_value_0);
  },
  challenge_rotate_enc_key_with_k256: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`challenge_rotate_enc_key_with_k256: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const pk_0 = args_0[1];
    const new_key_0 = args_0[2];
    const nonce_value_0 = args_0[3];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_rotate_enc_key_with_k256',
                                 'argument 1',
                                 'account.compact line 588 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(new_key_0.buffer instanceof ArrayBuffer && new_key_0.BYTES_PER_ELEMENT === 1 && new_key_0.length === 32)) {
      __compactRuntime.typeError('challenge_rotate_enc_key_with_k256',
                                 'argument 3',
                                 'account.compact line 588 char 1',
                                 'Bytes<32>',
                                 new_key_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_rotate_enc_key_with_k256',
                                 'argument 4',
                                 'account.compact line 588 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    return _dummyContract._challenge_rotate_enc_key_with_k256_0(self_addr_0,
                                                                pk_0,
                                                                new_key_0,
                                                                nonce_value_0);
  },
  challenge_add_device_with_k256: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`challenge_add_device_with_k256: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const pk_0 = args_0[1];
    const new_entry_0 = args_0[2];
    const nonce_value_0 = args_0[3];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_add_device_with_k256',
                                 'argument 1',
                                 'account.compact line 604 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(new_entry_0.buffer instanceof ArrayBuffer && new_entry_0.BYTES_PER_ELEMENT === 1 && new_entry_0.length === 32)) {
      __compactRuntime.typeError('challenge_add_device_with_k256',
                                 'argument 3',
                                 'account.compact line 604 char 1',
                                 'Bytes<32>',
                                 new_entry_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_add_device_with_k256',
                                 'argument 4',
                                 'account.compact line 604 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    return _dummyContract._challenge_add_device_with_k256_0(self_addr_0,
                                                            pk_0,
                                                            new_entry_0,
                                                            nonce_value_0);
  },
  challenge_remove_device_with_k256: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`challenge_remove_device_with_k256: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const self_addr_0 = args_0[0];
    const pk_0 = args_0[1];
    const entry_0 = args_0[2];
    const nonce_value_0 = args_0[3];
    if (!(typeof(self_addr_0) === 'object' && self_addr_0.bytes.buffer instanceof ArrayBuffer && self_addr_0.bytes.BYTES_PER_ELEMENT === 1 && self_addr_0.bytes.length === 32)) {
      __compactRuntime.typeError('challenge_remove_device_with_k256',
                                 'argument 1',
                                 'account.compact line 620 char 1',
                                 'struct ContractAddress<bytes: Bytes<32>>',
                                 self_addr_0)
    }
    if (!(entry_0.buffer instanceof ArrayBuffer && entry_0.BYTES_PER_ELEMENT === 1 && entry_0.length === 32)) {
      __compactRuntime.typeError('challenge_remove_device_with_k256',
                                 'argument 3',
                                 'account.compact line 620 char 1',
                                 'Bytes<32>',
                                 entry_0)
    }
    if (!(typeof(nonce_value_0) === 'bigint' && nonce_value_0 >= 0n && nonce_value_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('challenge_remove_device_with_k256',
                                 'argument 4',
                                 'account.compact line 620 char 1',
                                 'Uint<0..18446744073709551616>',
                                 nonce_value_0)
    }
    return _dummyContract._challenge_remove_device_with_k256_0(self_addr_0,
                                                               pk_0,
                                                               entry_0,
                                                               nonce_value_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
export const expectedVk = {
  'activate_initial_device_with_jubjub': '61b72fb8e457f3fff7e1a2fb2f1e6b5a1fd25400e63f5eb7ed8f4ba1d07ee2a3',
  'activate_initial_device_with_k256': '5c88a87740763e911a0f8a9ad30b3aef8f4c8315d310fb89d28f1c69d9346f43',
  'add_device_with_jubjub': 'c8697688038a558f96bc58ca4fa22929f58a97165e8149df73d52e3b3f27d239',
  'add_device_with_k256': '6be08d9bcee0326b16ebea23e9f64b3b47d874368eeaae4a41ec6e01d55c266d',
  'append_inbox_with_jubjub': 'f5fed7673093963086cd251524bdc76474bd26e42dab481783ff8d99eb3bb913',
  'append_inbox_with_k256': '82211cca89efb3d82ba724c815a4825a7deed7825e75e8e6a86d1b67ad4e9f55',
  'deposit_shielded': '6761a2e9cb905a115e7705b63b7df57b3c14dfa39fa48411ff6f512b8ff916b3',
  'deposit_unshielded': '3deb950234a50b1515d496d687bd173118cf2e7461ab02d63270dbbd5ac5a973',
  'remove_device_with_jubjub': '9fd6161248d0f6e5b998ff0e837159f6b293cd4d000139845037a5afd208c804',
  'remove_device_with_k256': 'f1927cb965b3315f8fe10a41e87261eed3429dd3dabb921951fcc16512bd6b1a',
  'rotate_enc_key_with_jubjub': 'adba0c81b7feb8b6aaa7566033b971b6891b68332d73d6831cedfcfee5f4ca2e',
  'rotate_enc_key_with_k256': '5db50818078b8549f9ad6b50a65353a97befdc8e26255b7ee3064676a4bf4c86',
  'withdraw_shielded_to_contract_with_jubjub': '97bdf4ea1008e60dad0e380c5f38f915bf628c3657847f9160823c3cd66dfe7c',
  'withdraw_shielded_to_contract_with_k256': 'cfd8d71f4d1952c71a5a9ff5c0aef75e16f7cb6bb04ca89fc0edac302cc8f498',
  'withdraw_shielded_with_jubjub': '213cde888f27853e1426c3a89b1aa1030040caad78443442a668f0fe4495bfe9',
  'withdraw_shielded_with_k256': '8bc12ab74ed83eea2de14300724cc83c3c3c6be5cb4a9f273744b928e71d2c9a',
  'withdraw_unshielded_with_jubjub': '2e2468d7565526dcbbc0a18c6de097492d1cc5ea564c1e502a29be0d34ba7444',
  'withdraw_unshielded_with_k256': '684ff10bef68fab025c461cd3b8a003c09296e46a5589108983a94658206242d',
};

//# sourceMappingURL=index.js.map
