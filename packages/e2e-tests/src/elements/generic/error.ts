import { WebElement } from '../webElement';

export class Error extends WebElement {
  toJSLocator = (): string => 'ion-toast[class="ion-color ion-color-danger md hydrated"]';
}
