import webTester from '../actor/webTester';
import { TransactionNewPage } from '../elements/newTransaction/transactionNewPage';
import { CoinConfigure } from '../elements/newTransaction/coinConfigure';
import { TokenSearchResult } from '../elements/newTransaction/tokenSearchResult';
import { AddressInput } from '../elements/addressInput';
import { AssetInput } from '../elements/newTransaction/assetInput';
import { TransactionBundle } from '../elements/newTransaction/transactionBundle';
import { TokenSelectionPage } from '../elements/newTransaction/tokenSelectionPage';
import nftsPageObject from './nftsPageObject';
import { Asset } from '../data/Asset';
import { Logger } from '../support/logger';
import testContext from '../utils/testContext';
import extensionUtils from '../utils/utils';
import { shelley } from '../data/AddressData';
import { browser } from '@wdio/globals';
import TransactionSubmittedPage from '../elements/newTransaction/transactionSubmittedPage';

export default new (class NewTransactionExtendedPageObject {
  fillAddress = async (address: string, index?: number) => {
    // Workaround - native method setValue() is failing during filling multiple bundles
    await $(new AddressInput(index).input().toJSLocator()).click();
    await browser.execute(`document.execCommand('insertText', false, '${address}');`);
    Logger.log(`Filled address: ${address}`);
  };

  fillAddressWithFirstChars = async (address: string, characters: number) => {
    await browser.pause(500);
    await webTester.fillComponent(new TransactionNewPage().addressInput().input(), address.slice(0, characters));
    await browser.pause(500);
  };

  fillTokenValue = async (valueToEnter: number, assetName?: string, bundleIndex = 1) => {
    await browser.pause(400);
    await webTester.fillComponent(new CoinConfigure(bundleIndex, assetName).input(), String(valueToEnter));
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

  clickBackground = async () => {
    await new TransactionNewPage().backgroundSection.click();
  };

  addToAddress = async (value: string) => {
    await $(new AddressInput().input().toJSLocator()).addValue(value);
  };

  clickCoinSelectorName = async (assetName: string, bundleIndex?: number) => {
    await browser.pause(500);
    const asset = extensionUtils.isMainnet() && assetName === 'tADA' ? 'ADA' : assetName;
    await webTester.clickElement(new CoinConfigure(bundleIndex, asset).nameElement());
    await browser.pause(500);
  };

  addAmountOfAssets = async (amount: number, assetType: string) => {
    for (let i = 1; i <= amount; i++) {
      await (assetType === 'Tokens'
        ? webTester.clickElement(new TokenSelectionPage().tokenItemInfo(i))
        : await new TokenSelectionPage().nftNames[i].click());
    }
  };

  deselectToken = async (assetType: string, index: number) => {
    await (assetType === 'Tokens'
      ? webTester.clickElement(new TokenSelectionPage().tokenItemInfo(index))
      : await new TokenSelectionPage().nftNames[index].click());
  };

  saveSelectedTokens = async (assetType: string, bundle: number) => {
    const tokenSelectionPage = new TokenSelectionPage();
    const amountOfAssets = Number(await webTester.getTextValueFromElement(tokenSelectionPage.assetsCounter()));
    testContext.save(`amountOfAssetsInBundle${String(bundle)}`, amountOfAssets);

    for (let i = 1; i <= amountOfAssets; i++) {
      if (assetType === 'Tokens') {
        const tokenName = String(await webTester.getTextValueFromElement(tokenSelectionPage.tokenName(i))).slice(0, 6);
        const asset =
          tokenName === 'asset1'
            ? String(await webTester.getTextValueFromElement(tokenSelectionPage.tokenName(i))).slice(0, 10)
            : String(await webTester.getTextValueFromElement(tokenSelectionPage.tokenTicker(i))).slice(0, 10);
        testContext.save(`bundle${String(bundle)}asset${String(i)}`, asset);
      } else {
        const asset = String(await tokenSelectionPage.nftNames[i].getText()).slice(0, 10);
        testContext.save(`bundle${String(bundle)}asset${String(i)}`, asset);
      }
    }
  };

  saveTicker = async (assetType: string, assetName: string) => {
    const tokenSelectionPage = new TokenSelectionPage();
    if (assetType === 'Token') {
      assetName =
        assetName.slice(0, 6) === 'asset1'
          ? assetName.slice(0, 10)
          : String(await webTester.getTextValueFromElement(tokenSelectionPage.tokenTickerFromName(assetName)));
    }
    testContext.save('savedTicker', String(assetName));
  };

  clickCoinConfigureTokenSearchResult = async (tokenName: string) => {
    await webTester.clickElement(new TokenSearchResult(tokenName).container());
  };

  clickAddAddressButton = async (index?: number) => {
    await webTester.clickElement(new TransactionNewPage().addressInput(index).ctaButton());
  };

  clickAddAssetButtonMulti = async (bundleIndex: number) => {
    await webTester.clickElement(new AssetInput().assetAddButtonMultiple(bundleIndex));
  };

  async clickAddAssetButton() {
    await webTester.clickElement(new AssetInput().assetAddButton());
  }

  clickAddressBookSearchResult = async (index: number) => {
    await webTester.clickElement(new TransactionNewPage().addressBookSearchResultRow(index));
  };

  clickRemoveBundleButton = async (outputIndex: number) => {
    await webTester.clickElement(new TransactionBundle(outputIndex).bundleRemoveButton());
  };

  clickRemoveAssetButton = async (assetName: string, bundleIndex?: number) => {
    await webTester.clickElement(new CoinConfigure(bundleIndex, assetName).assetRemoveButton());
  };

  fillMetadata = async (characters: number) => {
    const text = await webTester.generateRandomString(characters);
    await new TransactionNewPage().txMetadataInputField.setValue(text);
  };

  clickTokensButton = async () => {
    await new TokenSelectionPage().tokensButton.click();
  };

  clickNFTsButton = async () => {
    await new TokenSelectionPage().nftsButton.click();
  };

  clickMaxButton = async (bundleIndex: number, assetName: string) => {
    await browser.pause(1000);
    const bundle = new CoinConfigure(bundleIndex, assetName);
    await webTester.clearInputWebElement(await $(bundle.input().toJSLocator()));
    await webTester.hoverOnWebElement(bundle.input());
    await webTester.clickElement(bundle.assetMaxButton());
  };

  getTokensInfo = async () => {
    const tokenInfo = [];
    const numberOfTokens = await webTester.getElementCount(new TokenSelectionPage().tokenItem().toJSLocator(), 'xpath');
    for (let token = 1; token <= numberOfTokens; token++) {
      const tokenDetailsText = (await webTester.getTextValueFromElement(
        new TokenSelectionPage().tokenItemInfo(token)
      )) as string;
      const tokenDetailsArray = tokenDetailsText.split('\n');
      const tokenDetails = { name: tokenDetailsArray[0], ticker: tokenDetailsArray[1] };
      tokenInfo.push(tokenDetails);
    }
    return tokenInfo;
  };

  getNftNames = async () => {
    const nftInfo = [];
    const tokenSelectionPage = new TokenSelectionPage();
    const numberOfNFTs = await tokenSelectionPage.nftNames.length;
    for (let i = 0; i < numberOfNFTs; i++) {
      nftInfo.push(await tokenSelectionPage.nftNames[i].getText());
    }
    return nftInfo;
  };

  saveMetadata = async () => {
    const metadata = await new TransactionNewPage().txMetadataInputField.getValue();
    testContext.save('metadata', metadata);
  };

  clickToLoseFocus = async () => {
    const coinConfigure = new CoinConfigure();
    await webTester.clickElement(coinConfigure.container());
  };

  searchAsset = async (assetName: string) => {
    if (assetName === 'random characters') {
      assetName = await webTester.generateRandomString(10);
    }
    await webTester.fillComponent(new TokenSearchResult().searchInput(), assetName);
  };

  async setTwoAssetsForBundle(bundleIndex: number, assetValue1: number, assetValue2: number) {
    await this.fillAddress(shelley.getAddress(), bundleIndex);
    await this.clickAddAssetButtonMulti(bundleIndex);
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
    await new TransactionNewPage().addBundleButton.click();
    await this.fillAddress(shelley.getAddress(), 2);
    await this.clickCoinSelectorName(Asset.CARDANO.ticker, 2);
    await this.clickNFTsButton();
    await nftsPageObject.clickNftItemInAssetSelector(Asset.IBILECOIN.name);
    await this.clickAddAssetButtonMulti(2);
    await this.clickNFTsButton();
    await nftsPageObject.clickNftItemInAssetSelector(Asset.BISON_COIN.name);
    await this.fillTokenValue(1, Asset.IBILECOIN.name, 2);
    await this.fillTokenValue(1, Asset.BISON_COIN.name, 2);
  }

  async setTwoBundlesWithTheSameAssets() {
    await this.setTwoAssetsForBundle(1, 1, 2);
    await new TransactionNewPage().addBundleButton.click();
    await this.setTwoAssetsForBundle(2, 3, 4);
  }

  async setOneBundleWithMultipleAssets() {
    await this.fillAddress(shelley.getAddress(), 1);
    await this.clickAddAssetButtonMulti(1);
    await this.clickCoinConfigureTokenSearchResult(
      extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.name : Asset.LACE_COIN.name
    );
    await this.clickAddAssetButtonMulti(1);
    await this.clickNFTsButton();
    await nftsPageObject.clickNftItemInAssetSelector(Asset.IBILECOIN.name);
    await this.clickAddAssetButtonMulti(1);
    await this.clickNFTsButton();
    await nftsPageObject.clickNftItemInAssetSelector(Asset.BISON_COIN.name);
    await this.fillTokenValue(1, Asset.CARDANO.ticker);
    await this.fillTokenValue(2, extensionUtils.isMainnet() ? Asset.HOSKY_TOKEN.ticker : Asset.LACE_COIN.ticker);
    await this.fillTokenValue(1, Asset.IBILECOIN.name);
    await this.fillTokenValue(1, Asset.BISON_COIN.name);
  }

  async addAllAvailableTokenTypes(bundleIndex: number) {
    await this.clickAddAssetButtonMulti(bundleIndex);
    await this.clickTokensButton();
    const tokens = await this.getTokensInfo();
    let tokensCount = tokens.length;
    for (const token of tokens) {
      tokensCount--;
      await this.clickCoinConfigureTokenSearchResult(token.name);
      if (tokensCount) {
        await this.clickAddAssetButtonMulti(bundleIndex);
        await this.clickTokensButton();
      }
    }
  }

  async addAllAvailableNftTypes(bundleIndex: number) {
    await this.clickAddAssetButtonMulti(bundleIndex);
    await this.clickNFTsButton();
    const nftNames = await this.getNftNames();
    let nftsCount = nftNames.length;
    for (const nftName of nftNames) {
      nftsCount--;
      await nftsPageObject.clickNftItemInAssetSelector(nftName);
      if (nftsCount) {
        await this.clickAddAssetButtonMulti(bundleIndex);
        await this.clickNFTsButton();
      }
    }
  }

  async saveTransactionHash() {
    const txHashValue = await TransactionSubmittedPage.txHash.getText();
    Logger.log(`saving tx hash: ${txHashValue}`);
    testContext.save('txHashValue', txHashValue);
  }
})();
