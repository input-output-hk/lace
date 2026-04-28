import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerActivityListener } from '../src/ActivityDetector';

describe('registerActivityListener', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const dispatchEvent = (
    type: 'click' | 'keydown' | 'mousemove' | 'scroll',
  ) => {
    document.dispatchEvent(new Event(type));
  };

  it('calls reportActivity on click', () => {
    const reportActivity = vi.fn();
    const unsubscribe = registerActivityListener(reportActivity);

    dispatchEvent('click');

    expect(reportActivity).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('calls reportActivity on keydown', () => {
    const reportActivity = vi.fn();
    const unsubscribe = registerActivityListener(reportActivity);

    dispatchEvent('keydown');

    expect(reportActivity).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('calls reportActivity on mousemove', () => {
    const reportActivity = vi.fn();
    const unsubscribe = registerActivityListener(reportActivity);

    dispatchEvent('mousemove');

    expect(reportActivity).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('calls reportActivity on scroll', () => {
    const reportActivity = vi.fn();
    const unsubscribe = registerActivityListener(reportActivity);

    dispatchEvent('scroll');

    expect(reportActivity).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('throttles events to at most one per 1000ms', () => {
    const reportActivity = vi.fn();
    const unsubscribe = registerActivityListener(reportActivity);

    dispatchEvent('click');
    dispatchEvent('keydown');
    dispatchEvent('mousemove');

    expect(reportActivity).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(999);
    dispatchEvent('click');
    expect(reportActivity).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(1);
    dispatchEvent('click');
    expect(reportActivity).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it('merges different event types through the same throttle', () => {
    const reportActivity = vi.fn();
    const unsubscribe = registerActivityListener(reportActivity);

    dispatchEvent('click');
    expect(reportActivity).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);
    dispatchEvent('keydown');
    expect(reportActivity).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);
    dispatchEvent('mousemove');
    expect(reportActivity).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it('stops listening after unsubscribe', () => {
    const reportActivity = vi.fn();
    const unsubscribe = registerActivityListener(reportActivity);

    dispatchEvent('click');
    expect(reportActivity).toHaveBeenCalledOnce();

    unsubscribe();

    vi.advanceTimersByTime(1000);
    dispatchEvent('click');
    dispatchEvent('keydown');
    dispatchEvent('mousemove');
    dispatchEvent('scroll');

    expect(reportActivity).toHaveBeenCalledOnce();
  });
});
