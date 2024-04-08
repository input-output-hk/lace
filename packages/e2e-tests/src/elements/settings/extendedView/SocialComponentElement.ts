/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

export enum SocialComponentEnum {
  Twitter = 'TWITTER',
  Website = 'WEBSITE',
  Github = 'GITHUB',
  Youtube = 'YOUTUBE',
  Discord = 'DISCORD'
}

export class SocialComponentElement {
  private readonly socialComponent: SocialComponentEnum;

  constructor(socialComponent: SocialComponentEnum) {
    this.socialComponent = socialComponent;
  }

  get element(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`[data-testid="${this.socialComponent}-container"]`);
  }

  get icon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`[data-testid="${this.socialComponent}-icon"]`);
  }
}
