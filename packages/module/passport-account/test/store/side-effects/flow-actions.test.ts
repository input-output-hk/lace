import {
  SponsorExhaustedError,
  passportActions,
} from '@lace-contract/passport';
import { TestScheduler } from 'rxjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  flowActions,
  toFlowError,
} from '../../../src/store/side-effects/flow-actions';

import type { FlowEvent } from '../../../src/store/dependencies';

const actions = { ...passportActions };
const fallbackCode = 'account-create-failed';

const done = (result: string): FlowEvent<string> => ({ type: 'done', result });
const progress = (
  stage: 'activating' | 'deploying' | 'proving' | 'sponsoring',
): FlowEvent<string> => ({ type: 'progress', stage });

describe('toFlowError', () => {
  it('carries the error code when the error has a string code', () => {
    expect(toFlowError(new SponsorExhaustedError(), fallbackCode)).toEqual({
      code: 'sponsor-exhausted',
      message: 'The fee sponsor could not cover this transaction.',
    });
  });

  it('falls back to the given code and stringifies a non-error', () => {
    expect(toFlowError(new Error('node unreachable'), fallbackCode)).toEqual({
      code: fallbackCode,
      message: 'node unreachable',
    });
    expect(toFlowError('lost', fallbackCode)).toEqual({
      code: fallbackCode,
      message: 'lost',
    });
  });
});

describe('flowActions', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('maps each stage to setFlow and the result to its actions followed by ready', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const events$ = cold('-a-b-c-(d|)', {
        a: progress('deploying'),
        b: progress('proving'),
        c: progress('activating'),
        d: done('created'),
      });

      expectObservable(
        flowActions(events$, {
          actions,
          fallbackCode,
          onDone: result => [actions.passport.setLocalUseCounter(result)],
        }),
      ).toBe('-a-b-c-(de|)', {
        a: actions.passport.setFlow('deploying'),
        b: actions.passport.setFlow('proving'),
        c: actions.passport.setFlow('activating'),
        d: actions.passport.setLocalUseCounter('created'),
        e: actions.passport.setFlow('ready'),
      });
    });
  });

  it('maps a typed failure to one setFlowError carrying its code', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const events$ = cold(
        '-a-#',
        { a: progress('deploying') },
        new SponsorExhaustedError(),
      );

      expectObservable(
        flowActions(events$, { actions, fallbackCode, onDone: () => [] }),
      ).toBe('-a-(b|)', {
        a: actions.passport.setFlow('deploying'),
        b: actions.passport.setFlowError({
          code: 'sponsor-exhausted',
          message: 'The fee sponsor could not cover this transaction.',
        }),
      });
    });
  });

  it('maps an untyped failure to one setFlowError carrying the fallback code', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const events$ = cold<FlowEvent<string>>(
        '#',
        {},
        new Error('node unreachable'),
      );

      expectObservable(
        flowActions(events$, { actions, fallbackCode, onDone: () => [] }),
      ).toBe('(a|)', {
        a: actions.passport.setFlowError({
          code: fallbackCode,
          message: 'node unreachable',
        }),
      });
    });
  });
});
