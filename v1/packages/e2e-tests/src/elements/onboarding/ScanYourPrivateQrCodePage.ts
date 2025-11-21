/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonOnboardingElements from './commonOnboardingElements';

class ScanYourPrivateQrCodePage extends CommonOnboardingElements {
  private SAD_EMOJI_ICON = '[data-testid="sad-emoji-icon"]';
  private CAMERA_ACCESS_BLOCKED_LABEL = '[data-testid="camera-access-blocked-label"]';
  private CAMERA_ICON = '[data-testid="camera-icon"]';
  private CAMERA_ACCESS_PROMPT_LABEL = '[data-testid="camera-access-prompt-label"]';
  private CAMERA_PREVIEW_BOX = '[data-testid="camera-preview-box"]';
  private LOADER_IMAGE = '[data-testid="loader-image"]';
  private LOADER_LABEL = '[data-testid="loader-label"]';

  get sadEmojiIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SAD_EMOJI_ICON);
  }

  get cameraAccessBlockedLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CAMERA_ACCESS_BLOCKED_LABEL);
  }

  get cameraIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CAMERA_ICON);
  }

  get cameraAccessPromptLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CAMERA_ACCESS_PROMPT_LABEL);
  }

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
