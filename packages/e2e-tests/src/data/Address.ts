/* eslint-disable no-unused-vars */
import extensionUtils from '../utils/utils';

export class Address {
  constructor(private name: string, private addressTestnet: string, private addressMainnet: string) {}

  getName(): string {
    return this.name;
  }

  getMainnetAddress(): string {
    return this.addressMainnet;
  }

  getTestnetAddress(): string {
    return this.addressTestnet;
  }

  getAddress(): string {
    return extensionUtils.isMainnet() ? this.addressMainnet : this.addressTestnet;
  }

  setName(name: string): void {
    this.name = name;
  }
}
