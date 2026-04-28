import type { ReactElement } from 'react';

import { isValidElement, cloneElement } from 'react';
import React from 'react';

import { isAndroid, isWeb } from '../../util';

import type { TextInputSize, TextInputStatus } from './customTextInput';
import type { CtaButtonProps } from '../ctaWrapper/ctaWrapper';

const SIZES = {
  MEDIUM: 65,
  LARGE: 110,
  SMALL: {
    WEB: 60,
    MOBILE: {
      ANDROID: 55,
      IOS: 50,
    },
  },
};

export const checkStatus = (
  status: TextInputStatus,
  editable: boolean,
  isFocused: boolean,
  isHovered: boolean,
  isDisabled?: boolean,
  // eslint-disable-next-line max-params
) => {
  return {
    isLoading: status === 'loading',
    isDisabled: isDisabled || status === 'disabled' || !editable,
    isActive: status === 'active' || isFocused,
    isHover: status === 'hover' || isHovered,
  };
};

export const getSize = (size?: TextInputSize) => {
  const isLarge = size === 'large';
  const isMedium = size === 'medium';

  const {
    WEB: webSize,
    MOBILE: { ANDROID: androidSize, IOS: iosSize },
  } = SIZES.SMALL;

  const containerHeight = isMedium
    ? SIZES.MEDIUM
    : isLarge
    ? SIZES.LARGE
    : isWeb
    ? webSize
    : isAndroid
    ? androidSize
    : iosSize;

  return {
    isLarge: size === 'large',
    isSmall: size === 'small',
    isMedium: size === 'medium',
    containerHeight,
  };
};

// CTA Button constants
export const MAX_CTA_BUTTONS = 2;

// Animation constants
export const LABEL_ANIMATION_OFFSET = 11;
export const LABEL_FOCUSED_POSITION = -5;
export const LABEL_FONT_SIZES = {
  UNFOCUSED: 17,
  FOCUSED: 13,
} as const;

// Type guard for CTA button props
export const isCTAButtonProps = (cta: unknown): cta is CtaButtonProps => {
  return typeof cta === 'object' && cta !== null && !isValidElement(cta);
};

// Helper function to render CTA buttons
export const renderCtaButtons = (
  ctaButtons: Array<CtaButtonProps | ReactElement>,
  CtaButtonWrapper: React.ComponentType<CtaButtonProps>,
): ReactElement[] => {
  return ctaButtons.slice(0, MAX_CTA_BUTTONS).map((cta, index) => {
    if (isCTAButtonProps(cta)) {
      return <CtaButtonWrapper key={index} {...cta} />;
    }
    return cloneElement(cta, { key: index });
  });
};
