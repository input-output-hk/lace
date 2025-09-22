export class Constants {
  static readonly EXTENSION_ID = 'hgeekaiplokcnmakghbdfbgnlfheichg';
  static readonly EXTENSION_URL = `chrome-extension://${this.EXTENSION_ID}/tab.html`;
  static readonly EXTENSION_URL_ONBOARDING = `${this.EXTENSION_URL}#/onboarding`;
  static readonly EXTENSION_POPUP_URL = `chrome-extension://${this.EXTENSION_ID}/popup.html`;

  static readonly MIDNIGHT_PROOF_SERVER_ADDRESS = 'http://localhost:6300';
  static readonly MIDNIGHT_PROOF_SERVER_VARIANT_LOCAL = 'Local';
  static readonly MIDNIGHT_PROOF_SERVER_EXPOSED_PORT = 6300;

  static readonly NODE_ADDRESS_UNDEPLOYED = 'http://localhost:9944';
  static readonly INDEXER_ADDRESS_UNDEPLOYED = 'http://localhost:8088/api/v1/graphql';

  static readonly NODE_ADDRESS_TESTNET = 'https://rpc.testnet-02.midnight.network';
  static readonly INDEXER_ADDRESS_TESTNET = 'https://indexer.testnet-02.midnight.network/api/v1/graphql';

  static readonly NETWORK_VARIANT_TESTNET = 'Testnet';
}
