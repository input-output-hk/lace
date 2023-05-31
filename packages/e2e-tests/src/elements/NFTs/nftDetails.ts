/* eslint-disable no-undef */
import { WebElement, WebElementFactory as Factory } from '../webElement';
import { DrawerCommonExtended } from '../drawerCommonExtended';
import { InfoList } from '../infoList';
import { ChainablePromiseElement } from 'webdriverio';

export class NftDetails extends WebElement {
  protected CONTAINER;
  private IMG_SELECTOR = '//img[@data-testid="nft-image"]';
  private INFO_SECTION_SELECTOR = '//div[@data-testid="nft-info"]';
  private ATTRIBUTES_SECTION_SELECTOR = '//div[@data-testid="nft-attributes"]';
  private SEND_NFT_BUTTON = '#send-nft-btn';

  constructor() {
    super();
    this.CONTAINER = new DrawerCommonExtended().container().toJSLocator();
  }

  imageOfSpecificNft(nftName: string): WebElement {
    return Factory.fromSelector(`//*[contains(text(),'${nftName}')]/../div/img`, 'xpath');
  }

  imageElement(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.IMG_SELECTOR}`, 'xpath');
  }

  infoSectionTitle(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.INFO_SECTION_SELECTOR}/h4`, 'xpath');
  }

  infoSectionList(): InfoList {
    return new InfoList(this.INFO_SECTION_SELECTOR);
  }

  attributesSectionTitle(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.ATTRIBUTES_SECTION_SELECTOR}/h4`, 'xpath');
  }

  attributesSectionList(): InfoList {
    return new InfoList(this.ATTRIBUTES_SECTION_SELECTOR);
  }

  get sendNFTButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_NFT_BUTTON);
  }
}
