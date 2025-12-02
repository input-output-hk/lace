import { SimpleSectionsConfig } from '@src/views/browser-view/stores';

export enum Sections {
  RECLAIM = 'reclaim',
  SEND = 'send',
  SUCCESS_TX = 'success_tx',
  FAIL_TX = 'fail_tx',
  AUTO_SET = 'auto-set'
}

export const sectionsConfig: SimpleSectionsConfig<Sections> = {
  [Sections.RECLAIM]: {
    currentSection: Sections.RECLAIM,
    nextSection: Sections.SEND
  },
  [Sections.SEND]: {
    currentSection: Sections.SEND,
    nextSection: Sections.RECLAIM
  },
  [Sections.AUTO_SET]: {
    currentSection: Sections.AUTO_SET,
    nextSection: Sections.SUCCESS_TX
  }
};
