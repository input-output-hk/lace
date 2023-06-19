import { Language } from '@lace/common';
import { useEffect, useState } from 'react';
import { changeLanguage, getI18n } from '../../i18n';

export const useI18n = (language?: Language) => {
  const [loading, setLoading] = useState(true);
  const i18n = getI18n();

  useEffect(() => {
    (async () => {
      if (language && i18n.language !== language) {
        setLoading(true);
        await changeLanguage(language);
      }

      setLoading(false);
    })();
  }, [i18n.language, language]);

  return {
    i18n,
    loading,
  };
};
