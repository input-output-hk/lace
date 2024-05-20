/* eslint-disable no-magic-numbers */
const addedLength = 4;

export const truncate = (text: string, partOneLength: number, partTwoLength: number): string => {
  const textMinLenght = partOneLength + partTwoLength + addedLength;
  if (text.length <= textMinLenght) return text;

  return `${text.slice(0, partOneLength)}${text.slice(text.length - partTwoLength)}`;
};

export const addEllipsis = (text: string, partOneLength: number, partTwoLength: number): string => {
  const textMinLength = partOneLength + partTwoLength + addedLength;
  if (text.length <= textMinLength) return text;

  return `${text.slice(0, partOneLength)}...${text.slice(text.length - partTwoLength)}`;
};

const getCssStyle = (element: HTMLElement, prop: string) => window.getComputedStyle(element).getPropertyValue(prop);

const getCanvasFontSize = (el: HTMLElement) => {
  const fontWeight = getCssStyle(el, 'font-weight') || 'normal';
  const fontSize = getCssStyle(el, 'font-size') || '16px';
  const fontFamily = getCssStyle(el, 'font-family') || 'Times New Roman';

  return `${fontWeight} ${fontSize} ${fontFamily}`;
};

export const getTextWidth = (text: string, element: HTMLElement): number => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  context.font = getCanvasFontSize(element);
  return context.measureText(text).width;
};

export const trimTextInHalfToFitSize = (text: string, el: HTMLElement): string => {
  const size = el.offsetWidth - 5;
  const ellipsis = '...';
  if (size < 10) return ellipsis;

  const ellipsisSize = getTextWidth(ellipsis, el);
  const halfTextWidthSize = Math.ceil(text.length / 2);

  let firstPart = text.slice(0, halfTextWidthSize);
  let secondPart = text.slice(halfTextWidthSize);
  // removing one char and check if it fits the half of container size
  while (firstPart.length > 1 && getTextWidth(firstPart, el) + ellipsisSize / 2 >= size / 2) {
    firstPart = firstPart.slice(0, -1);
  }
  while (secondPart.length > 1 && getTextWidth(secondPart, el) + ellipsisSize / 2 > size / 2) {
    secondPart = secondPart.slice(1 - secondPart.length);
  }

  return `${firstPart}${ellipsis}${secondPart}`;
};
