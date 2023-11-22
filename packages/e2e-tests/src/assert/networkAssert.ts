/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import networkManager from '../utils/networkManager';
import { expect } from 'chai';
import { Logger } from '../support/logger';

class NetworkAssert {
  assertRequestWithParametersIsPresent = async (
    elementToClick: ChainablePromiseElement<WebdriverIO.Element>,
    url: string,
    payload: string[],
    isNetworkPresent: boolean
  ) => {
    Logger.log(`expected request presence: ${isNetworkPresent}`);
    const actualNetworkPresence = await networkManager.isNetworkActivityPresentByPartialUrl(
      url,
      elementToClick,
      payload
    );
    expect(isNetworkPresent).to.equal(actualNetworkPresence);
  };
}

export default new NetworkAssert();
