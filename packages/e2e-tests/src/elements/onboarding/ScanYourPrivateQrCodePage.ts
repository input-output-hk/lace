/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonOnboardingElements from './commonOnboardingElements';

class ScanYourPrivateQrCodePage extends CommonOnboardingElements {
  private CAMERA_PREVIEW_BOX = '[data-testid="camera-preview-box"]';
  private LOADER_IMAGE = '[data-testid="loader-image"]';
  private LOADER_LABEL = '[data-testid="loader-label"]';

  get cameraPreviewBox(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CAMERA_PREVIEW_BOX);
  }

  get loaderImage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LOADER_IMAGE);
  }

  get loaderLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LOADER_LABEL);
  }
}

export default new ScanYourPrivateQrCodePage();
