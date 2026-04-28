import { Onboarding } from './graphical-portal/onboarding.portal';

export * from './button';
export * from './card/card';
export * from './chart/line-chart';
export * from './loader/loader';
export * from './text/text';
export * from './logo/logo';
export * from './logo/logo-with-text';
export * from './input/text-input';
export * from './input/numeric-input';
export * from './icons/customIcons';
export * from './icons/Icon';
export * from './icons/IconMap';
export * as IconURLs from './icons/urls';
export * from './menu/menu-item';
export * from './row/row';
export * from './column/column';
export * from './iconButton/iconButton';
export * from './box/box';
export * from './actionButton/actionButton';
export * from './shimmer/shimmer';
export * from './thumbnail/thumbnail';
export * from './blur-view/blur-view';
export * from './blurTextView/blurTextView';
export * from './indexedChip/indexedChip';
export * from './qrCode/qrCode';
export * from './portal/portal';
export * from './avatar/avatar';
export * from './blurred-label/blurred-label';
export * from './link/link';
export * from './pill/pill';
export * from './webView/webView';
export * from './brand/brand';
export * from './divider/divider';
export * from './customTextInput/customTextInput';
export * from './toggle/toggle';
export * from './customTag/customTag';
export * from './badge/badge';
export * from './beacon/beacon';
export * from './toast/toast';
export * from './settingsCard/settingsCard';
export * from './radioButton/radioButton';
export * from './pricePill/pricePill';
export * from './linearGradient/linearGradient';

/**
 * TODO: consider re-naming
 * as portal often refers to being able to
 * render a component in a different place in the DOM
 *  */
export const GraphicPortal = {
  Onboarding: Onboarding,
};

export interface IconProps {
  width?: number;
  height?: number;
  size?: number;
  color?: string;
  fill?: string;
  stroke?: string;
}
