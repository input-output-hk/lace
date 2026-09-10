// GlobalToast owns the hide logic (timers), so it must hand its onHide to
// FloatingOverlay as onTouchThrough — that is what unblocks Android's frozen
// touch input on the first tap while the toast is visible.
import type { ElementType } from 'react';

import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { GlobalToast } from '../../../src/design-system/organisms/globalToast/globalToast';

import type { ReactTestRenderer } from 'react-test-renderer';

// react-test-renderer accepts arbitrary host tags at runtime, but React's
// ElementType only admits intrinsic DOM tags — recast the mocked RN hosts.
const asHost = (type: string): ElementType => type as unknown as ElementType;

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-native-reanimated', () => ({
  default: { View: 'Animated.View' },
}));

// Same module id as globalToast's `../..` import; the real design-system index
// pulls in Platform-dependent code that cannot load under vitest's node
// environment.
vi.mock('../../../src/design-system', () => ({
  FloatingOverlay: 'FloatingOverlay',
  Icon: 'Icon',
  Toast: 'Toast',
  useTriggerToast: () => ({ animatedStyle: {}, showToast: vi.fn() }),
}));

describe('GlobalToast', () => {
  it('passes onHide to FloatingOverlay as onTouchThrough', () => {
    const onHide = vi.fn();
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(
        <GlobalToast toast={{ text: 'copied' }} onHide={onHide} />,
      );
    });
    if (!renderer) throw new Error('GlobalToast did not render');

    const overlay = renderer.root.findByType(asHost('FloatingOverlay'));
    expect(overlay.props.onTouchThrough).toBe(onHide);
    expect(onHide).not.toHaveBeenCalled();

    act(() => {
      renderer?.unmount();
    });
  });

  it('renders nothing without a toast', () => {
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(<GlobalToast toast={null} onHide={vi.fn()} />);
    });

    expect(renderer?.toJSON()).toBeNull();
  });
});
