// FloatingOverlay's Android path: the RN Modal window swallows every touch
// while visible, so without the native touch-through module the wrapper must
// claim the responder and dismiss via onTouchThrough on the first touch (and
// on the hardware back button). With the native module linked it renders the
// TouchThroughWindow marker that makes the window touch-transparent instead.
import type { ElementType } from 'react';

import React from 'react';
import { act, create } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactTestRenderer } from 'react-test-renderer';

// react-test-renderer accepts arbitrary host tags at runtime, but React's
// ElementType only admits intrinsic DOM tags — recast the mocked RN hosts.
const asHost = (type: string): ElementType => type as unknown as ElementType;

const { requireOptionalNativeModule } = vi.hoisted(() => ({
  requireOptionalNativeModule: vi.fn<() => object | null>(() => null),
}));

vi.mock('expo-modules-core', () => ({
  requireNativeViewManager: () => 'TouchThroughWindow',
  requireOptionalNativeModule,
}));

vi.mock('react-native', () => ({
  Modal: 'Modal',
  StyleSheet: {
    absoluteFill: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    create: <T,>(styles: T): T => styles,
  },
  View: 'View',
}));

vi.mock('react-native-screens', () => ({
  FullWindowOverlay: 'FullWindowOverlay',
}));

vi.mock('@gorhom/portal', () => ({ Portal: 'Portal' }));

// Same module id as the component's `../../util` import; the real index pulls
// in Platform-dependent code that cannot load under vitest's node environment.
vi.mock('../../../src/design-system/util', () => ({
  isAndroid: true,
  isIOS: false,
}));

// TouchThroughWindow is resolved at module scope, so each test re-imports the
// component after configuring requireOptionalNativeModule.
const renderOverlay = async (
  onTouchThrough?: () => void,
): Promise<ReactTestRenderer> => {
  const { FloatingOverlay } = await import(
    '../../../src/design-system/molecules/floatingOverlay/floatingOverlay'
  );
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(
      <FloatingOverlay onTouchThrough={onTouchThrough}>
        {React.createElement('ToastContent')}
      </FloatingOverlay>,
    );
  });
  if (!renderer) throw new Error('FloatingOverlay did not render');
  return renderer;
};

const pressBackButton = (renderer: ReactTestRenderer): void => {
  const { onRequestClose } = renderer.root.findByType(asHost('Modal'))
    .props as { onRequestClose: () => void };
  act(() => {
    onRequestClose();
  });
};

describe('FloatingOverlay (Android Modal fallback)', () => {
  beforeEach(() => {
    vi.resetModules();
    requireOptionalNativeModule.mockReturnValue(null);
  });

  it('claims the responder and dismisses on the first touch', async () => {
    const onTouchThrough = vi.fn();
    const renderer = await renderOverlay(onTouchThrough);

    const wrapper = renderer.root
      .findAllByType(asHost('View'))
      .find(view => view.props.onStartShouldSetResponder);
    if (!wrapper) throw new Error('responder wrapper not rendered');

    const wrapperProps = wrapper.props as {
      onStartShouldSetResponder: () => boolean;
      onResponderGrant: () => void;
    };
    expect(wrapperProps.onStartShouldSetResponder()).toBe(true);
    act(() => {
      wrapperProps.onResponderGrant();
    });
    expect(onTouchThrough).toHaveBeenCalledTimes(1);
  });

  it('dismisses on the hardware back button', async () => {
    const onTouchThrough = vi.fn();
    const renderer = await renderOverlay(onTouchThrough);

    pressBackButton(renderer);
    expect(onTouchThrough).toHaveBeenCalledTimes(1);
  });

  it('still renders children when no onTouchThrough is provided', async () => {
    const renderer = await renderOverlay();

    expect(renderer.root.findAllByType(asHost('ToastContent'))).toHaveLength(1);
    pressBackButton(renderer);
  });

  it('omits TouchThroughWindow while the native module is missing', async () => {
    const renderer = await renderOverlay();

    expect(
      renderer.root.findAllByType(asHost('TouchThroughWindow')),
    ).toHaveLength(0);
  });

  it('renders TouchThroughWindow when the native module is available', async () => {
    requireOptionalNativeModule.mockReturnValue({});
    const renderer = await renderOverlay();

    expect(
      renderer.root.findAllByType(asHost('TouchThroughWindow')),
    ).toHaveLength(1);
    expect(renderer.root.findAllByType(asHost('ToastContent'))).toHaveLength(1);
  });
});
