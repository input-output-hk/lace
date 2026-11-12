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

// Throws on a non-string key, as i18next does.
vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({
    t: (key: unknown) => {
      if (typeof key !== 'string') {
        throw new TypeError('key.indexOf is not a function');
      }
      return key;
    },
  }),
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

  it('passes string text and subtitle to Toast', () => {
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(
        <GlobalToast
          toast={{ text: 'copied', subtitle: 'address' }}
          onHide={vi.fn()}
        />,
      );
    });
    if (!renderer) throw new Error('GlobalToast did not render');

    const toast = renderer.root.findByType(asHost('Toast'));
    expect(toast.props.text).toBe('copied');
    expect(toast.props.subtitle).toBe('address');

    act(() => {
      renderer?.unmount();
    });
  });

  // The shape a SteelSwap validation error left in persisted state, which
  // crashed every launch before the hide timer could clear it.
  it('drops a subtitle that is not a string and still hides the toast', () => {
    vi.useFakeTimers();
    const onHide = vi.fn();
    const subtitle = [
      { type: 'value_error', msg: 'amount must be a positive number' },
    ] as unknown as string;
    let renderer: ReactTestRenderer | undefined;
    try {
      act(() => {
        renderer = create(
          <GlobalToast
            toast={{ text: 'v2.swap.toast.build-failed.title', subtitle }}
            onHide={onHide}
          />,
        );
      });
      if (!renderer) throw new Error('GlobalToast did not render');

      const toast = renderer.root.findByType(asHost('Toast'));
      expect(toast.props.text).toBe('v2.swap.toast.build-failed.title');
      expect(toast.props.subtitle).toBeUndefined();
      expect(onHide).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(3600);
      });
      expect(onHide).toHaveBeenCalledTimes(1);
    } finally {
      act(() => {
        renderer?.unmount();
      });
      vi.useRealTimers();
    }
  });

  it('renders empty text when the text is not a string', () => {
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(
        <GlobalToast
          toast={{ text: { key: 'copied' } as unknown as string }}
          onHide={vi.fn()}
        />,
      );
    });
    if (!renderer) throw new Error('GlobalToast did not render');

    expect(renderer.root.findByType(asHost('Toast')).props.text).toBe('');

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
