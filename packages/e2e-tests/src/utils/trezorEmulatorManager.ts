import robot from 'robotjs';
import * as cv from '@u4/opencv4nodejs';
import path from 'path';
import { browser } from '@wdio/globals';
import { Point2 } from '@u4/opencv4nodejs/typings/Point2';

export const takeScreenshotInGray = async (): Promise<cv.Mat> => {
  const screenSize = robot.getScreenSize();
  const screenShot = robot.screen.capture(0, 0, screenSize.width, screenSize.height);
  const screenShotMat = new cv.Mat(screenShot.image, screenShot.height, screenShot.width, cv.CV_8UC4);
  return screenShotMat.cvtColor(cv.COLOR_BGRA2GRAY);
};

export const getImageInGrey = async (imageName: string): Promise<cv.Mat> => {
  const imagePath = path.resolve(__dirname, './trezorImageExamples/');
  const image = await cv.imreadAsync(`${imagePath}/${imageName}`);
  return image.cvtColor(cv.COLOR_BGR2GRAY);
};

export const matchTemplateOnScreen = async (image: cv.Mat): Promise<{ maxLoc: Point2; maxVal: number }> => {
  await browser.pause(500);
  const screenShot = await takeScreenshotInGray();
  const matchedTemplate = await screenShot.matchTemplateAsync(image, cv.TM_CCOEFF_NORMED);
  const { maxLoc, maxVal } = matchedTemplate.minMaxLoc();
  return { maxLoc, maxVal };
};

export const clickImageOnScreenshot = async (imageName: string, continueIfImageNotFound = false): Promise<void> => {
  const threshold = 0.9;
  const imageGrey = await getImageInGrey(imageName);
  const { maxLoc, maxVal } = await matchTemplateOnScreen(imageGrey);
  if (maxVal > threshold) {
    console.log(`Image: ${imageName} found in the desktop screenshot.`);
    const clickXPin = maxLoc.x + imageGrey.cols / 2;
    const clickYPin = maxLoc.y + imageGrey.rows / 2;
    robot.moveMouse(clickXPin, clickYPin);
    await browser.pause(300);
    robot.mouseClick();
  } else if (!continueIfImageNotFound) {
    throw new Error(
      `Image: ${imageName} not found in the desktop screenshot. Please make sure that trezor emulator is displayed on main screen.`
    );
  }
};

export const lockTrezorDevice = async (continueIfImageNotFound = false): Promise<void> => {
  const threshold = 0.9;
  const imageGrey = await getImageInGrey('unlockedTrezor.png');
  const { maxLoc, maxVal } = await matchTemplateOnScreen(imageGrey);

  if (maxVal > threshold) {
    console.log('Image found in the desktop screenshot.');
    const clickXPin = maxLoc.x + imageGrey.cols / 2;
    const clickYPin = maxLoc.y + imageGrey.rows / 2;
    robot.moveMouse(clickXPin, clickYPin);
    await browser.pause(300);
    robot.mouseToggle('down');
    await browser.pause(5000);
    robot.mouseToggle('up');
  } else if (!continueIfImageNotFound) {
    throw new Error(
      'Image unlockedTrezor.png not found in the desktop screenshot. Please make sure that trezor emulator is displayed on main screen.'
    );
  }
};
