import create, { UseStore } from 'zustand';

export interface SectionConfig<T> {
  currentSection: T;
  nextSection?: T;
  prevSection?: T;
}

export type SimpleSectionsConfig<T> = Partial<Record<Extract<T, string>, SectionConfig<T>>>;

export interface SectionsStore<T> {
  currentSection?: SectionConfig<T>;
  setSection: (section?: SectionConfig<T>) => void;
  setPrevSection: () => void;
  resetSection?: () => void;
  sectionsConfig?: SimpleSectionsConfig<T>;
}

export const createSectionsStore = <T>({
  section: currentSection,
  config: sectionsConfig
}: {
  section?: SectionConfig<T>;
  config: SimpleSectionsConfig<T>;
}): UseStore<SectionsStore<T>> =>
  create<SectionsStore<T>>((set, get) => {
    set({ currentSection, sectionsConfig });

    return {
      sectionsConfig,
      currentSection,
      resetSection: () => {
        set({ currentSection });
      },
      setSection: (section) =>
        set({
          currentSection: section ?? get().sectionsConfig[get().currentSection.nextSection as Extract<T, string>]
        }),
      setPrevSection: () =>
        set({
          currentSection: get().sectionsConfig[get().currentSection.prevSection as Extract<T, string>]
        })
    };
  });
