import webTester from '../actor/webTester';
import TransactionNewPage from '../elements/newTransaction/transactionNewPage';
import { CoinConfigure } from '../elements/newTransaction/coinConfigure';
import { TokenSearchResult } from '../elements/newTransaction/tokenSearchResult';
import { TransactionBundle } from '../elements/newTransaction/transactionBundle';
import TokenSelectionPage from '../elements/newTransaction/tokenSelectionPage';
import { Asset } from '../data/Asset';
import { Logger } from '../support/logger';
import testContext from '../utils/testContext';
import extensionUtils from '../utils/utils';
import { byron, shelley } from '../data/AddressData';
import { browser } from '@wdio/globals';
import TransactionSubmittedPage from '../elements/newTransaction/transactionSubmittedPage';
import { generateRandomString } from '../utils/textUtils';
import { AssetInput } from '../elements/newTransaction/assetInput';
import { AddressInput } from '../elements/AddressInput';

export default new (class NewTransactionExtendedPageObject {
  fillTokenValue = async (valueToEnter: number, assetName?: string, bundleIndex = 1) => {
    await browser.pause(400);
    await webTester.fillComponent(new CoinConfigure(bundleIndex, assetName).input(), String(valueToEnter));
  };

  fillTokenValueUsingKeys = async (valueToEnter: number, assetName?: string, bundleIndex = 1) => {
    await browser.pause(400);
    await $(new CoinConfigure(bundleIndex, assetName).input().toJSLocator()).click();
    await browser.keys(String(valueToEnter));
  };

  fillTokenValueWithoutClearingField = async (valueToEnter: number, assetName?: string, bundleIndex = 1) => {
    await browser.pause(400);
    await $(new CoinConfigure(bundleIndex, assetName).input().toJSLocator()).click();
    for (const digit of valueToEnter.toString()) {
      await browser.pause(50);
      await browser.keys(digit);
    }
  };

  hoverOverTheTokenValue = async (bundleIndex: number, assetName: string) => {
    await browser.pause(500);
    const element = new CoinConfigure(bundleIndex, assetName).input();
    await webTester.waitUntilSeeElement(element);
    await webTester.hoverOnWebElement(element);
  };

  hoverOverTheTokenName = async (bundleIndex: number, assetName: string) => {
    await browser.pause(1000);
    if (assetName.length > 5) {
      assetName = assetName.slice(0, 5);
    }
    const element = new CoinConfigure(bundleIndex, assetName).nameElement();
    await webTester.waitUntilSeeElement(element);
    await webTester.hoverOnWebElement(element);
  };

  clickCoinSelectorName = async (assetName: string, bundleIndex?: number) => {
    await browser.pause(500);
    const asset = extensionUtils.isMainnet() && assetName === 'tADA' ? 'ADA' : assetName;
    await webTester.clickElement(new CoinConfigure(bundleIndex, asset).nameElement());
    await browser.pause(500);
  };

  clickCoinConfigureTokenSearchResult = async (tokenName: string) => {
    await webTester.clickElement(new TokenSearchResult(tokenName).container());
  };

  clickRemoveBundleButton = async (outputIndex: number) => {
    await webTester.clickElement(new TransactionBundle(outputIndex).bundleRemoveButton());
  };

  clickRemoveAssetButton = async (assetName: string, bundleIndex?: number) => {
    await webTester.clickElement(new CoinConfigure(bundleIndex, assetName).assetRemoveButton());
  };

  clickMaxButton = async (bundleIndex: number, assetName: string) => {
    await browser.pause(1000);
    const bundle = new CoinConfigure(bundleIndex, assetName);
    await webTester.clearInputWebElement(await $(bundle.input().toJSLocator()));
    await webTester.hoverOnWebElement(bundle.input());
    await webTester.clickElement(bundle.assetMaxButton());
  };

  clickToLoseFocus = async () => {
    const coinConfigure = new CoinConfigure();
    await webTester.clickElement(coinConfigure.container());
  };

  searchAsset = async (assetName: string) => {
    if (assetName === 'random characters') {
      assetName = await generateRandomString(10);
    }
    await webTester.fillComponent(new TokenSearchResult().searchInput(), assetName);
  };

  async setTwoAssetsForBundle(bundleIndex: number, assetValue1: number, assetValue2: number) {
    await new AddressInput(bundleIndex).fillAddress(byron.getAddress());
    await new AssetInput(bundleIndex).clickAddAssetButton();
    await this.clickCoinConfigureTokenSearchResult(
      extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.name : Asset.LACE_COIN.name
    );
    await this.fillTokenValue(assetValue1, Asset.CARDANO.ticker, bundleIndex);
    await this.fillTokenValue(
      assetValue2,
      extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.ticker : Asset.LACE_COIN.ticker,
      bundleIndex
    );
  }

  async setTwoBundlesWithMultipleAssets() {
    await this.setTwoAssetsForBundle(1, 2, 1);
    await TransactionNewPage.addBundleButton.click();
    await new AddressInput(2).fillAddress(shelley.getAddress());
    await this.clickCoinSelectorName(Asset.CARDANO.ticker, 2);
    await TokenSelectionPage.clickNFTsButton();
    await TokenSelectionPage.clickNftItemInAssetSelector(Asset.IBILECOIN.name);
    await new AssetInput(2).clickAddAssetButton();
    await TokenSelectionPage.clickNFTsButton();
    await TokenSelectionPage.clickNftItemInAssetSelector(Asset.BISON_COIN.name);
    await this.fillTokenValue(1, Asset.IBILECOIN.name, 2);
    await this.fillTokenValue(1, Asset.BISON_COIN.name, 2);
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
    await this.fillTokenValue(1, Asset.CARDANO.ticker);
    await this.fillTokenValue(2, extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.ticker : Asset.LACE_COIN.ticker);
    await this.fillTokenValue(1, Asset.IBILECOIN.name);
    await this.fillTokenValue(1, Asset.BISON_COIN.name);
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

  async saveTransactionHash() {
    const txHashValue = await TransactionSubmittedPage.txHash.getText();
    Logger.log(`saving tx hash: ${txHashValue}`);
    testContext.save('txHashValue', txHashValue);
  }
})();
