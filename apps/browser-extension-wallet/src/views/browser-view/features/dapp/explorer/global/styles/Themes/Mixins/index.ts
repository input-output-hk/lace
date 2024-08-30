/* eslint-disable @typescript-eslint/ban-ts-comment */
import { colors } from '../Colors';
import { IMixins, RuleLengthArray } from './types';
import { toRem } from '../../Utils/ToRem.styles';

/**
 * Default grid size: 4
 */

const FONT_BASE_SIZE = 16;

const getFormattedSizes = (rules: RuleLengthArray = [], rule: string, isStyleObject?: boolean): any => {
  if (rules && rules.length === 0) return isStyleObject ? {} : '';
  const [...rulesValues] = rules.map((value) => toRem(value));
  const formattedValues = `${rulesValues}`.replace(/,/g, ' ');

  if (isStyleObject)
    return {
      [`${rule}`]: `${formattedValues}`
    };

  return `
      ${rule}: ${formattedValues};
    `;
};

export const mixins: IMixins['mixins'] = {
  setSpacer: (space, isStyleObject = false) => {
    if (!space) return isStyleObject ? {} : '';
    if (isStyleObject)
      return {
        marginTop: `${toRem(space)}`
      };
    return `margin-top: ${toRem(space)};`;
  },

  setMargin: (margin, isStyleObject) => getFormattedSizes(margin, 'margin', isStyleObject),

  setPadding: (padding, isStyleObject) => getFormattedSizes(padding, 'padding', isStyleObject),

  setObjectFit: (value) => {
    if (!value) return {};
    return {
      objectFit: value
    };
  },

  setSize: ({ size, ...sizes }) => {
    if (size)
      return {
        width: size,
        height: size
      };

    return {
      ...sizes
    };
  },
  // @ts-ignore
  setColor: (color) => {
    // @ts-ignore
    const selectedColor = color?.includes('#') ? `${color} !important` : `${colors[color]} !important`;

    return { color: color ? selectedColor : `${colors.white} !important` };
  },

  setBackground: (color) => {
    if (color)
      return {
        backgroundColor: color
      };

    return {};
  },

  toRem: (value: number): string => `${value / FONT_BASE_SIZE}rem`
};
