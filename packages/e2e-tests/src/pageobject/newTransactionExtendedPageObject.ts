import TransactionNewPage from '../elements/newTransaction/transactionNewPage';
import TokenSelectionPage from '../elements/newTransaction/tokenSelectionPage';
import { Asset } from '../data/Asset';
import extensionUtils from '../utils/utils';
import { byron, shelley } from '../data/AddressData';
import { AssetInput } from '../elements/newTransaction/assetInput';
import { AddressInput } from '../elements/AddressInput';
import NftsCommon from '../elements/NFTs/nftsCommon';
import { scrollToTheTop } from '../utils/scrollUtils';

export default new (class NewTransactionExtendedPageObject {
  async setTwoAssetsForBundle(bundleIndex: number, assetValue1: number, assetValue2: number) {
    await new AddressInput(bundleIndex).fillAddress(byron.getAddress(), 'paste');
    await new AssetInput(bundleIndex).clickAddAssetButton();
    await TokenSelectionPage.clickOnToken(extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.name : Asset.LACE_COIN.name);
    await TransactionNewPage.coinConfigure(bundleIndex, Asset.CARDANO.ticker).fillTokenValue(assetValue1);
    await TransactionNewPage.coinConfigure(
      bundleIndex,
      extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.ticker : Asset.LACE_COIN.ticker
    ).fillTokenValue(assetValue2);
  }

  async setTwoBundlesWithMultipleAssets() {
    await this.setTwoAssetsForBundle(1, 2, 1);
    await TransactionNewPage.addBundleButton.waitForClickable();
    await TransactionNewPage.addBundleButton.click();
    await new AddressInput(2).fillAddress(shelley.getAddress(), 'paste');
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
    await TransactionNewPage.addBundleButton.waitForClickable();
    await TransactionNewPage.addBundleButton.click();
    await this.setTwoAssetsForBundle(2, 3, 4);
  }

  async setOneBundleWithMultipleAssets() {
    await new AddressInput(1).fillAddress(shelley.getAddress(), 'paste');
    await new AssetInput(1).clickAddAssetButton();
    await TokenSelectionPage.clickOnToken(extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.name : Asset.LACE_COIN.name);
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
      await TokenSelectionPage.clickOnToken(token.name);
      if (tokensCount) {
        await new AssetInput(bundleIndex).clickAddAssetButton();
        await TokenSelectionPage.clickTokensButton();
      }
    }
  }

  async addAllAvailableNftTypes(bundleIndex: number) {
    await new AssetInput(bundleIndex).clickAddAssetButton();
    await TokenSelectionPage.clickNFTsButton();
    const nftNames = await NftsCommon.getAllNftNamesWithScroll(
      `${TokenSelectionPage.ASSET_SELECTOR_CONTAINER} ${TokenSelectionPage.NFT_CONTAINER}`
    );
    await scrollToTheTop();
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
