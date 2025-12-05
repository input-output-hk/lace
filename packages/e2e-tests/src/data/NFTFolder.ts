/* eslint-disable no-unused-vars */
export class NFTFolder {
  constructor(private name: string, private assets: string[]) {}

  getName(): string {
    return this.name;
  }

  getAssets(): string[] {
    return this.assets;
  }
}
