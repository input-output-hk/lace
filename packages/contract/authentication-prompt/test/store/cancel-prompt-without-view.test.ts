import { ViewId } from '@lace-contract/module';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it } from 'vitest';

import { authenticationPromptActions as actions } from '../../src';
import { cancelPromptWithoutView } from '../../src/store/side-effects/cancel-prompt-without-view';

import type { View } from '@lace-contract/views';

const view: View = {
  id: ViewId('view1'),
  location: '/dapp-sign-tx',
  type: 'popupWindow',
};

const cancelled = actions.authenticationPrompt.cancelled();

describe('cancelPromptWithoutView', () => {
  it('cancels an open prompt when the last view closes', () => {
    testSideEffect(cancelPromptWithoutView, ({ cold, flush }) => ({
      dependencies: { actions },
      stateObservables: {
        authenticationPrompt: { isOpen$: cold('a', { a: true }) },
        views: { selectOpenViews$: cold('a-b', { a: [view], b: [] }) },
      },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(emission => emissions.push(emission));
        flush();

        expect(emissions).toEqual([cancelled]);
      },
    }));
  });

  it('leaves the prompt alone while a view is still open', () => {
    testSideEffect(cancelPromptWithoutView, ({ cold, flush }) => ({
      dependencies: { actions },
      stateObservables: {
        authenticationPrompt: { isOpen$: cold('a', { a: true }) },
        views: {
          selectOpenViews$: cold('a-b', { a: [view, view], b: [view] }),
        },
      },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(emission => emissions.push(emission));
        flush();

        expect(emissions).toEqual([]);
      },
    }));
  });

  it('does nothing when no prompt is open', () => {
    testSideEffect(cancelPromptWithoutView, ({ cold, flush }) => ({
      dependencies: { actions },
      stateObservables: {
        authenticationPrompt: { isOpen$: cold('a', { a: false }) },
        views: { selectOpenViews$: cold('a-b', { a: [view], b: [] }) },
      },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(emission => emissions.push(emission));
        flush();

        expect(emissions).toEqual([]);
      },
    }));
  });

  it('cancels a prompt that opens after the last view has closed', () => {
    testSideEffect(cancelPromptWithoutView, ({ cold, flush }) => ({
      dependencies: { actions },
      stateObservables: {
        // The signing wrapper reaches authenticate() only after several
        // provider round trips, so the prompt can open after its window went.
        authenticationPrompt: { isOpen$: cold('a--b', { a: false, b: true }) },
        views: { selectOpenViews$: cold('a-b', { a: [view], b: [] }) },
      },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(emission => emissions.push(emission));
        flush();

        expect(emissions).toEqual([cancelled]);
      },
    }));
  });

  it('cancels only once while the prompt stays unanswerable', () => {
    testSideEffect(cancelPromptWithoutView, ({ cold, flush }) => ({
      dependencies: { actions },
      stateObservables: {
        authenticationPrompt: { isOpen$: cold('a', { a: true }) },
        views: { selectOpenViews$: cold('a-b-c', { a: [view], b: [], c: [] }) },
      },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(emission => emissions.push(emission));
        flush();

        expect(emissions).toEqual([cancelled]);
      },
    }));
  });

  it('does not cancel before the first view has registered', () => {
    testSideEffect(cancelPromptWithoutView, ({ cold, flush }) => ({
      dependencies: { actions },
      stateObservables: {
        authenticationPrompt: { isOpen$: cold('a', { a: true }) },
        views: { selectOpenViews$: cold('a-b', { a: [], b: [view] }) },
      },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(emission => emissions.push(emission));
        flush();

        expect(emissions).toEqual([]);
      },
    }));
  });
});
