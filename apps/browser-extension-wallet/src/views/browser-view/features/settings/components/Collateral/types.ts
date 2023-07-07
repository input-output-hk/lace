import { SimpleSectionsConfig } from '@src/views/browser-view/stores';

export enum Sections {
  RECLAIM = 'reclaim',
  SEND = 'send',
  SUCCESS_TX = 'success_tx',
  FAIL_TX = 'fail_tx'
}

export const sectionsConfig: SimpleSectionsConfig<Sections> = {
  [Sections.RECLAIM]: {
    currentSection: Sections.RECLAIM,
    nextSection: Sections.SEND
  },
  [Sections.SEND]: {
    currentSection: Sections.SEND,
    nextSection: Sections.RECLAIM
  }
};
