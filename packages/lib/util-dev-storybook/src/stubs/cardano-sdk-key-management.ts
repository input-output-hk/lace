import { wordlists } from 'bip39';

// Stub implementation of util.generateMnemonicWords for Storybook
const generateMnemonicWords = (strength: number = 256): string[] => {
  // Simple implementation that generates valid BIP39 words
  const wordList = wordlists.english;
  const wordCount = strength === 128 ? 12 : strength === 256 ? 24 : 15;

  const words: string[] = [];
  for (let index = 0; index < wordCount; index++) {
    const randomIndex = Math.floor(Math.random() * wordList.length);
    words.push(wordList[randomIndex]);
  }

  return words;
};

// Stub implementation of util.joinMnemonicWords
const joinMnemonicWords = (words: string[]): string => {
  return words.join(' ');
};

// Stub implementation of util.validateMnemonic
const validateMnemonic = (mnemonic: string): boolean => {
  // Simple validation - check if all words are in the wordlist
  const words = mnemonic.split(' ');
  const wordList = wordlists.english;
  return (
    words.every(word => wordList.includes(word)) &&
    (words.length === 12 || words.length === 15 || words.length === 24)
  );
};

const deriveAccountPrivateKey = async () =>
  // Returning a real AccPrivKey of a test wallet
  '580f9538907e87e1d39d9a65c972827be595c7354ba521a729da7d0572ad9848806a76de480d2f36b6ab4ff5da9e3a1ae48b1889209a202b3f9f1e36b9458721b952fa075a2f0d3cf68b50f10453f363d5c6364fb19de8934d33b6491b2c8a1d';

// Export the util object with stubbed functions
export const util = {
  generateMnemonicWords,
  joinMnemonicWords,
  validateMnemonic,
  deriveAccountPrivateKey,
};

// Export emip3encrypt and emip3decrypt as stub functions
export const emip3encrypt = async (
  data: Uint8Array,
  password: Uint8Array,
): Promise<Uint8Array> => {
  // Return the data as-is for storybook (not actually encrypted)
  return new Uint8Array([...data, ...password]);
};

const getEmip3decryptResultMockKey = ({
  encryptedData,
  password,
}: {
  encryptedData: Uint8Array;
  password: Uint8Array;
}) => {
  const encryptedDataHex = Buffer.from(encryptedData).toString('hex');
  const passwordHex = Buffer.from(password).toString('hex');
  return `${encryptedDataHex}.${passwordHex}`;
};

const emip3decryptResultMock = new Map<string, Uint8Array>();
export const mockEmip3decryptResult = (
  params: {
    encryptedData: Uint8Array;
    password: Uint8Array;
  },
  resultMock: Uint8Array,
) => {
  emip3decryptResultMock.set(getEmip3decryptResultMockKey(params), resultMock);
};

export const emip3decrypt = async (
  encryptedData: Uint8Array,
  password: Uint8Array,
): Promise<Uint8Array> => {
  const mockKey = getEmip3decryptResultMockKey({ encryptedData, password });
  const resultMock = emip3decryptResultMock.get(mockKey);
  if (resultMock) {
    return resultMock;
  }

  // Return a subset of the data for storybook (not actually decrypted)
  return encryptedData.slice(0, encryptedData.length - password.length);
};

// Stub enums and types
export enum AddressType {
  External = 0,
  Internal = 1,
}

export enum KeyRole {
  Stake = 2,
}

export enum KeyPurpose {
  STANDARD = 0,
  MULTI_SIG = 1,
}

// Stub interfaces and types
export interface GroupedAddress {
  address: string;
  index: number;
  type: AddressType;
  accountIndex: number;
  networkId: number;
  rewardAccount: string;
  stakeKeyDerivationPath?: {
    index: number;
    role: KeyRole;
  };
}

export interface SerializableInMemoryKeyAgentData {
  encryptedRootPrivateKeyBytes: Uint8Array;
}

// Additional types for Bip32Account
export interface DerivationPath {
  role: number;
  index: number;
}

export interface PaymentKeyDerivationPath {
  type: AddressType;
  index: number;
}

export interface ChainId {
  networkId: number;
}

export interface AsyncKeyAgent {
  getAccountIndex(): Promise<number>;
  getChainId(): Promise<ChainId>;
  getExtendedAccountPublicKey(): Promise<string>;
}

export interface Bip32AccountDependencies {
  bip32Ed25519: unknown;
  blake2b: unknown;
}

// Stub Bip32Account class
export class Bip32Account {
  public extendedAccountPublicKeyHex: string;
  public chainId: ChainId;
  public accountIndex: number;

  public constructor(
    options: {
      extendedAccountPublicKey: string;
      chainId: ChainId;
      accountIndex: number;
    },
    _dependencies?: Bip32AccountDependencies,
  ) {
    this.extendedAccountPublicKeyHex = options.extendedAccountPublicKey;
    this.chainId = options.chainId;
    this.accountIndex = options.accountIndex;
  }

  public static async createDefaultDependencies(): Promise<Bip32AccountDependencies> {
    // Return stub dependencies for Storybook
    return {
      bip32Ed25519: {},
      blake2b: {},
    };
  }

  public static async fromAsyncKeyAgent(
    keyAgent: AsyncKeyAgent,
    dependencies?: Bip32AccountDependencies,
  ): Promise<Bip32Account> {
    dependencies ||= await Bip32Account.createDefaultDependencies();

    return new Bip32Account(
      {
        accountIndex: await keyAgent.getAccountIndex(),
        chainId: await keyAgent.getChainId(),
        extendedAccountPublicKey: await keyAgent.getExtendedAccountPublicKey(),
      },
      dependencies,
    );
  }

  public async derivePublicKey(
    derivationPath: DerivationPath,
  ): Promise<string> {
    // Return a stub public key for Storybook
    return `stub_public_key_${derivationPath.role}_${derivationPath.index}`;
  }

  public async deriveAddress(
    paymentKeyDerivationPath: PaymentKeyDerivationPath,
    stakeKeyDerivationIndex: number,
  ): Promise<GroupedAddress> {
    const stakeKeyDerivationPath = {
      index: stakeKeyDerivationIndex,
      role: KeyRole.Stake,
    };

    // Return a stub address for Storybook
    return {
      address: `addr_test1stub${paymentKeyDerivationPath.index}${stakeKeyDerivationIndex}`,
      index: paymentKeyDerivationPath.index,
      type: paymentKeyDerivationPath.type,
      accountIndex: this.accountIndex,
      networkId: this.chainId.networkId,
      rewardAccount: `stake_test1stub${stakeKeyDerivationIndex}`,
      stakeKeyDerivationPath,
    };
  }
}

// Stub InMemoryKeyAgent class
export class InMemoryKeyAgent {
  public extendedAccountPublicKey: string;
  public serializableData: SerializableInMemoryKeyAgentData;

  public constructor() {
    this.extendedAccountPublicKey = 'stub_extended_public_key';
    this.serializableData = {
      encryptedRootPrivateKeyBytes: new Uint8Array([1, 2, 3, 4]),
    };
  }

  public static async fromBip39MnemonicWords(): Promise<InMemoryKeyAgent> {
    // Return a stub instance for Storybook
    return new InMemoryKeyAgent();
  }
}

export const cip8 = {
  cip30signData: async () => ({
    key: '',
    signature: '',
  }),
};

export default {
  util,
  emip3encrypt,
  emip3decrypt,
  cip8,
  AddressType,
  KeyPurpose,
  KeyRole,
  Bip32Account,
  InMemoryKeyAgent,
};
