import { FixedLengthArray } from '../../../@types/fixed-length-array.types';

type Reach = 'max' | 'min';
type RangeType = 'width' | 'height';
type Range = Reach | FixedLengthArray<[RangeType, Reach]>;
type MaxWidth = number;
type MinWidth = number;

const MediaQueriesSizes = {
  MOBILE: 576,
  TABLET: 768,
  DESKTOP: 1200
};

type ExtendedTypes = 'mobile' | 'tablet' | 'desktop';
/**
 * This function is a media query helper to use with styled-components.
 * @param size - Max or min size of media query.
 * @param range - max or min reach of media query.
 */

const hasExtension = (extended?: ExtendedTypes): string => {
  const toUppercase = extended?.toUpperCase() as Uppercase<ExtendedTypes>;
  return extended ? `, (min-wdith: ${MediaQueriesSizes[toUppercase]}px)` : '';
};

const customMediaQuery = (size: number, range: Range = 'max', extended?: ExtendedTypes): string => {
  if (Array.isArray(range)) {
    const [type, reach] = range;
    return `@media (${reach}-${type}: ${size}px)${hasExtension(extended)}`;
  }

  return `@media (${range}-width: ${size}px)`;
};

const customMediaQueryBetween = ([minWidth = 0, maxWidth = 0]: FixedLengthArray<[MaxWidth, MinWidth]>): string =>
  `@media (min-width: ${minWidth}px) and (max-width: ${maxWidth}px)`;

export default {
  custom: customMediaQuery,
  desktop: customMediaQuery(MediaQueriesSizes.DESKTOP, 'min'),
  tablet: customMediaQuery(MediaQueriesSizes.TABLET, 'min'),
  phone: customMediaQuery(MediaQueriesSizes.MOBILE),
  between: customMediaQueryBetween,
  extended: ''
};
