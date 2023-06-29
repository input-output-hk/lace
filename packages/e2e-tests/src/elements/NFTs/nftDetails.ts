import CommonDrawerElements from '../CommonDrawerElements';

class NftDetails extends CommonDrawerElements {
  private IMAGE = '[data-testid="nft-image"]';
  private TOKEN_INFO_SECTION = '[data-testid="nft-info"]';
  private TOKEN_INFORMATION_LABEL = '[data-testid="nft-info-label"]';
  private ATTRIBUTES_SECTION = '[data-testid="nft-attributes"]';
  private ATTRIBUTES_LABEL = '[data-testid="nft-attributes-label"]';
  private INFO_LIST_ITEM = '[data-testid="info-list-item"]';
  private INFO_LIST_ITEM_KEY = '[data-testid="info-list-item-key"]';
  private INFO_LIST_ITEM_VALUE = '[data-testid="info-list-item-key"]';
  private SEND_NFT_BUTTON = '#send-nft-btn';
  private NFT_TITLE_ON_POPUP = '[data-testid="drawer-content"] h2';

  get nftTitleOnPopup() {
    return $(this.NFT_TITLE_ON_POPUP);
  }

  get image() {
    return this.drawerBody.$(this.IMAGE);
  }

  get tokenInfoSection() {
    return $(this.TOKEN_INFO_SECTION);
  }

  get tokenInfoSectionTitle() {
    return this.drawerBody.$(this.TOKEN_INFORMATION_LABEL);
  }

  get policyIdLabel() {
    return this.tokenInfoSection.$$(this.INFO_LIST_ITEM)[0].$(this.INFO_LIST_ITEM_KEY);
  }

  get policyIdValue() {
    return this.tokenInfoSection.$$(this.INFO_LIST_ITEM)[0].$(this.INFO_LIST_ITEM_VALUE);
  }

  get assetIdLabel() {
    return this.tokenInfoSection.$$(this.INFO_LIST_ITEM)[1].$(this.INFO_LIST_ITEM_KEY);
  }

  get assetIdValue() {
    return this.tokenInfoSection.$$(this.INFO_LIST_ITEM)[1].$(this.INFO_LIST_ITEM_VALUE);
  }

  get mediaUrlLabel() {
    return this.tokenInfoSection.$$(this.INFO_LIST_ITEM)[2].$(this.INFO_LIST_ITEM_KEY);
  }

  get mediaUrlValue() {
    return this.tokenInfoSection.$$(this.INFO_LIST_ITEM)[2].$(this.INFO_LIST_ITEM_VALUE);
  }

  get attributesSectionTitle() {
    return this.drawerBody.$(this.ATTRIBUTES_LABEL);
  }

  get attributesSection() {
    return $(this.ATTRIBUTES_SECTION);
  }

  get collectionLabel() {
    return this.attributesSection.$$(this.INFO_LIST_ITEM)[0].$(this.INFO_LIST_ITEM_KEY);
  }

  get collectionValue() {
    return this.attributesSection.$$(this.INFO_LIST_ITEM)[0].$(this.INFO_LIST_ITEM_KEY);
  }

  get copyrightLabel() {
    return this.attributesSection.$$(this.INFO_LIST_ITEM)[1].$(this.INFO_LIST_ITEM_KEY);
  }

  get copyrightValue() {
    return this.attributesSection.$$(this.INFO_LIST_ITEM)[1].$(this.INFO_LIST_ITEM_KEY);
  }

  get sendNFTButton() {
    return $(this.SEND_NFT_BUTTON);
  }
}

export default new NftDetails();
