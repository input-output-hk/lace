/* global WebdriverIO */
import { SocialComponentElement, SocialComponentEnum } from './SocialComponentElement';
import type { ChainablePromiseElement } from 'webdriverio';

class AboutLaceWidget {
  private readonly CONTAINER = '[data-testid="about-container"]';
  private readonly TITLE = '[data-testid="settings-about-title"]';
  private readonly NETWORK_LABEL = '[data-testid="about-network-label"]';
  private readonly NETWORK_VALUE = '[data-testid="about-network-value"]';
  private readonly VERSION_LABEL = '[data-testid="about-version-label"]';
  private readonly VERSION_VALUE = '[data-testid="about-version-value"]';
  private readonly COMMIT_LABEL = '[data-testid="about-commit-label"]';
  private readonly COMMIT_VALUE = '[data-testid="about-commit-value"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get networkLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NETWORK_LABEL);
  }

  get networkValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NETWORK_VALUE);
  }

  get versionLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.VERSION_LABEL);
  }

  get versionValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.VERSION_VALUE);
  }

  get commitLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COMMIT_LABEL);
  }

  get commitValue(): ChainablePromiseElement<WebdriverIO.Element> {
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
