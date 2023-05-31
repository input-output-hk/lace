export class LocalStorageBuilder {
  private built: AppSettings = {
    isWalkthroughFinished: false,
    mnemonicVerificationFrequency: '',
    lastMnemonicVerification: '',
    hasWallet: false
  };

  withWalkthroughFinished(isFinished: boolean): this {
    this.built.isWalkthroughFinished = isFinished;
    return this;
  }

  withVerificationFrequency(interval: string): this {
    this.built.mnemonicVerificationFrequency = interval;
    return this;
  }

  witLastMnemonicVerificationAt(time: string): this {
    this.built.lastMnemonicVerification = time;
    return this;
  }

  wallet(userHasWallet: boolean): this {
    this.built.hasWallet = userHasWallet;
    return this;
  }

  build(): AppSettings {
    return this.built;
  }
}

export type AppSettings = {
  isWalkthroughFinished: boolean;
  mnemonicVerificationFrequency: string;
  lastMnemonicVerification: string;
  hasWallet: boolean;
};
