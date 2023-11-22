import React from 'react';
import { useTranslation } from 'react-i18next';

type DefaultReleaseNoteProps = {
  version: string;
};
const DefaultReleaseNote = ({ version }: DefaultReleaseNoteProps): React.ReactElement => {
  const { t } = useTranslation();

  const [major, minor, patch] = version.split('.');
  const isPatchVersion = !!patch && Number(patch) > 0;
  const link = isPatchVersion
    ? 'https://discord.com/invite/lacewallet'
    : `https://www.lace.io/blog/lace-${major}-${minor}-${patch}-release`;
  return (
    <p>
      {t('announcement.description.text')}{' '}
      <a href={link} target="_blank">
        {t('announcement.description.linktext')}
      </a>
    </p>
  );
};

export default DefaultReleaseNote;
