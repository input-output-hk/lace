import { sx, style, keyframes } from '../../design-tokens';

// Use same values from antd to match their animation
// https://github.com/ant-design/ant-design/blob/master/components/message/style/index.tsx#L46
const animationSettings = '0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86) forwards';

const hide = keyframes({
  from: {
    opacity: 1,
  },
  to: {
    opacity: 0,
    transform: `translateY(-12%)`,
  },
});

const slideIn = keyframes({
  from: {
    transform: `translateY(-100%)`,
    opacity: 0,
  },
  to: {
    transform: 'translateY(0%)',
    opacity: 1,
  },
});

export const root = style([
  sx({
    display: 'flex',
    justifyContent: 'center',
  }),
  {
    outline: 'none',
  },
]);

export const animation = style({
  selectors: {
    '&[data-state="open"]': {
      animation: `${slideIn} ${animationSettings}`,
    },
    '&[data-state="closed"]': {
      animation: `${hide} ${animationSettings}`,
    },
  },
});

export const container = style([
  sx({
    height: '$64',
    alignItems: 'center',
    backgroundColor: '$toast_bar_container_bgColor',
    boxShadow: '$tooltip',
    borderRadius: '$medium',
    padding: '$12',
    boxSizing: 'border-box',
  }),
  {
    position: 'relative',
    overflow: 'hidden',
    width: 'fit-content',
  },
]);

export const icon = style([
  sx({
    height: '$40',
    width: '$40',
    borderRadius: '$circle',
    backgroundColor: '$toast_bar_icon_container_bgColor',
    color: '$toast_bar_icon_label_color',
  }),
]);

export const box = sx({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  mr: '$16',
});

export const progress = style([
  {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
]);
