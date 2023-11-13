import React from 'react';
import { useTranslation } from 'react-i18next';

type DefaultReleaseNoteProps = {
  version: string;
};
const DefaultReleaseNote = ({ version }: DefaultReleaseNoteProps): React.ReactElement => {
  const { t } = useTranslation();

  const [major, minor, patch] = version.split('.');
  return (
    <p>
      {t('announcement.description.text')}{' '}
      <a href={`https://www.lace.io/blog/lace-${major}-${minor}-${patch}-release`} target="_blank">
        {t('announcement.description.linktext')}
      </a>
    </p>
  );
};

export default DefaultReleaseNote;
