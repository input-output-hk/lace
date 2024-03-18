import webTester from '../actor/webTester';
import TransactionNewPage from '../elements/newTransaction/transactionNewPage';
import { TokenSearchResult } from '../elements/newTransaction/tokenSearchResult';
import { TransactionBundle } from '../elements/newTransaction/transactionBundle';
import TokenSelectionPage from '../elements/newTransaction/tokenSelectionPage';
import { Asset } from '../data/Asset';
import extensionUtils from '../utils/utils';
import { byron, shelley } from '../data/AddressData';
import { generateRandomString } from '../utils/textUtils';
import { AssetInput } from '../elements/newTransaction/assetInput';
import { AddressInput } from '../elements/AddressInput';

export default new (class NewTransactionExtendedPageObject {
  clickCoinConfigureTokenSearchResult = async (tokenName: string) => {
    await webTester.clickElement(new TokenSearchResult(tokenName).container());
  };

  clickRemoveBundleButton = async (outputIndex: number) => {
    await webTester.clickElement(new TransactionBundle(outputIndex).bundleRemoveButton());
  };

  searchAsset = async (assetName: string) => {
    if (assetName === 'random characters') {
      assetName = await generateRandomString(10);
    }
    await new TokenSearchResult().searchInput.setValue(assetName);
  };

  async setTwoAssetsForBundle(bundleIndex: number, assetValue1: number, assetValue2: number) {
    await new AddressInput(bundleIndex).fillAddress(byron.getAddress());
    await new AssetInput(bundleIndex).clickAddAssetButton();
    await this.clickCoinConfigureTokenSearchResult(
      extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.name : Asset.LACE_COIN.name
    );
    await TransactionNewPage.coinConfigure(bundleIndex, Asset.CARDANO.ticker).fillTokenValue(assetValue1);
    await TransactionNewPage.coinConfigure(
      bundleIndex,
      extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.ticker : Asset.LACE_COIN.ticker
    ).fillTokenValue(assetValue2);
  }

  async setTwoBundlesWithMultipleAssets() {
    await this.setTwoAssetsForBundle(1, 2, 1);
    await TransactionNewPage.addBundleButton.click();
    await new AddressInput(2).fillAddress(shelley.getAddress());
    await TransactionNewPage.coinConfigure(2, Asset.CARDANO.ticker).clickCoinSelectorName();
    await TokenSelectionPage.clickNFTsButton();
    await TokenSelectionPage.clickNftItemInAssetSelector(Asset.IBILECOIN.name);
    await new AssetInput(2).clickAddAssetButton();
    await TokenSelectionPage.clickNFTsButton();
    await TokenSelectionPage.clickNftItemInAssetSelector(Asset.BISON_COIN.name);
    await TransactionNewPage.coinConfigure(2, Asset.IBILECOIN.name).fillTokenValue(1);
    await TransactionNewPage.coinConfigure(2, Asset.BISON_COIN.name).fillTokenValue(1);
  }

  async setTwoBundlesWithTheSameAssets() {
    await this.setTwoAssetsForBundle(1, 1, 2);
    await TransactionNewPage.addBundleButton.click();
    await this.setTwoAssetsForBundle(2, 3, 4);
  }

  async setOneBundleWithMultipleAssets() {
    await new AddressInput(1).fillAddress(shelley.getAddress());
    await new AssetInput(1).clickAddAssetButton();
    await this.clickCoinConfigureTokenSearchResult(
      extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.name : Asset.LACE_COIN.name
    );
    await new AssetInput(1).clickAddAssetButton();
    await TokenSelectionPage.clickNFTsButton();
    await TokenSelectionPage.clickNftItemInAssetSelector(Asset.IBILECOIN.name);
    await new AssetInput(1).clickAddAssetButton();
    await TokenSelectionPage.clickNFTsButton();
    await TokenSelectionPage.clickNftItemInAssetSelector(Asset.BISON_COIN.name);
    await TransactionNewPage.coinConfigure(1, Asset.CARDANO.ticker).fillTokenValue(1);
    await TransactionNewPage.coinConfigure(
      1,
      extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.ticker : Asset.LACE_COIN.ticker
    ).fillTokenValue(2);
    await TransactionNewPage.coinConfigure(1, Asset.IBILECOIN.name).fillTokenValue(1);
    await TransactionNewPage.coinConfigure(1, Asset.BISON_COIN.name).fillTokenValue(1);
  }

  async addAllAvailableTokenTypes(bundleIndex: number) {
    await new AssetInput(bundleIndex).clickAddAssetButton();
    await TokenSelectionPage.clickTokensButton();
    const tokens = await TokenSelectionPage.getTokensInfo();
    let tokensCount = tokens.length;
    for (const token of tokens) {
      tokensCount--;
      await this.clickCoinConfigureTokenSearchResult(token.name);
      if (tokensCount) {
        await new AssetInput(bundleIndex).clickAddAssetButton();
        await TokenSelectionPage.clickTokensButton();
      }
    }
  }

  async addAllAvailableNftTypes(bundleIndex: number) {
    await new AssetInput(bundleIndex).clickAddAssetButton();
    await TokenSelectionPage.clickNFTsButton();
    const nftNames = await TokenSelectionPage.getNftNames();
    let nftsCount = nftNames.length;
    for (const nftName of nftNames) {
      nftsCount--;
      await TokenSelectionPage.clickNftItemInAssetSelector(nftName);
      if (nftsCount) {
        await new AssetInput(bundleIndex).clickAddAssetButton();
        await TokenSelectionPage.clickNFTsButton();
      }
    }
  }
})();
