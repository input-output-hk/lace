import { SectionsStore, createSectionsStore } from '@src/views/browser-view/stores';
import { Sections, sectionsConfig } from './types';

const useSectionsStore = createSectionsStore<Sections>({ config: sectionsConfig, section: sectionsConfig.reclaim });

export const useSections = (): Pick<SectionsStore<Sections>, 'currentSection' | 'setPrevSection' | 'setSection'> =>
  useSectionsStore(({ currentSection, setSection, setPrevSection }) => ({
    currentSection,
    setSection,
    setPrevSection
  }));
