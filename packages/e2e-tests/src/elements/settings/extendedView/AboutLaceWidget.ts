import { SocialComponentElement, SocialComponentEnum } from './SocialComponentElement';

class AboutLaceWidget {
  private readonly CONTAINER = '[data-testid="about-container"]';
  private readonly TITLE = '[data-testid="settings-about-title"]';
  private readonly NETWORK_LABEL = '[data-testid="about-network-label"]';
  private readonly NETWORK_VALUE = '[data-testid="about-network-value"]';
  private readonly VERSION_LABEL = '[data-testid="about-version-label"]';
  private readonly VERSION_VALUE = '[data-testid="about-version-value"]';
  private readonly COMMIT_LABEL = '[data-testid="about-commit-label"]';
  private readonly COMMIT_VALUE = '[data-testid="about-commit-value"]';

  get container() {
    return $(this.CONTAINER);
  }

  get title() {
    return $(this.TITLE);
  }

  get networkLabel() {
    return $(this.NETWORK_LABEL);
  }

  get networkValue() {
    return $(this.NETWORK_VALUE);
  }

  get versionLabel() {
    return $(this.VERSION_LABEL);
  }

  get versionValue() {
    return $(this.VERSION_VALUE);
  }

  get commitLabel() {
    return $(this.COMMIT_LABEL);
  }

  get commitValue() {
    return $(this.COMMIT_VALUE);
  }

  get website() {
    return new SocialComponentElement(SocialComponentEnum.Website);
  }

  get twitter() {
    return new SocialComponentElement(SocialComponentEnum.Twitter);
  }

  get youtube() {
    return new SocialComponentElement(SocialComponentEnum.Youtube);
  }

  get discord() {
    return new SocialComponentElement(SocialComponentEnum.Discord);
  }

  get github() {
    return new SocialComponentElement(SocialComponentEnum.Github);
  }
}

export default new AboutLaceWidget();
