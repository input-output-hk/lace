/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class EducationalList {
  private CONTAINER = '//div[@data-testid="educational-list"]';
  private LIST_TITLE = '//h1[@data-testid="educational-list-title"]';
  private LIST_ROW = '//div[@data-testid="educational-list-row"]';
  private LIST_ROW_IMG = '//img[@data-testid="educational-list-row-img"]';
  private LIST_ROW_TITLE = '//h1[@data-testid="educational-list-row-title"]';
  private LIST_ROW_SUBTITLE = '//p[@data-testid="educational-list-row-subtitle"]';
  private LIST_ROW_SUBTITLE_TEMPLATE = '//p[contains(text(), "###SUBTITLE###")]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get listTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LIST_TITLE);
  }

  get listRows(): Promise<WebdriverIO.ElementArray> {
    return $$(`${this.CONTAINER}${this.LIST_ROW}`);
  }

  get listRowImages(): Promise<WebdriverIO.ElementArray> {
    return $$(`${this.CONTAINER}${this.LIST_ROW_IMG}`);
  }

  get listRowTitles(): Promise<WebdriverIO.ElementArray> {
    return $$(`${this.CONTAINER}${this.LIST_ROW_TITLE}`);
  }

  get listRowSubtitles(): Promise<WebdriverIO.ElementArray> {
    return $$(`${this.CONTAINER}${this.LIST_ROW_SUBTITLE}`);
  }

  async getListTitle(): Promise<string> {
    return this.listTitle.getText();
  }

  async getListRowTitles(): Promise<string[]> {
    const titles: string[] = [];
    for (const element of await this.listRowTitles) {
      titles.push(await element.getText());
    }
    return titles;
  }

  async getListRowSubtitles(): Promise<string[]> {
    const subTitles: string[] = [];
    for (const element of await this.listRowSubtitles) {
      subTitles.push(await element.getText());
    }
    return subTitles;
  }

  async getListRowWithSubtitle(subtitle: string): Promise<ChainablePromiseElement<WebdriverIO.Element>> {
    const subtitleSelector = this.LIST_ROW_SUBTITLE_TEMPLATE.replace('###SUBTITLE###', subtitle);
    return $(`${this.LIST_ROW}${subtitleSelector}`);
  }

  async clickItemWithSubtitle(subtitle: string): Promise<void> {
    await (await this.getListRowWithSubtitle(subtitle)).click();
  }
}

export default new EducationalList();
