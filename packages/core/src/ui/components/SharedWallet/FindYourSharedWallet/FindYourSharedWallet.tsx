import React from 'react';
import {
  sx,
  Box,
  Flex,
  Text,
  Button,
  FileUpload,
  ActionCard,
  RefreshComponent
} from '@input-output-hk/lace-ui-toolkit';

type Title = { text: string; highlight: boolean };

interface Props {
  translations: {
    title: string;
    subtitle: string;
    backButton: string;
    nextButton: string;
    fileUpload: {
      label: Title[];
      supportedFormats: string;
      removeButtonLabel: string;
    };
    syncNetwork: {
      title: Title[];
      description: string;
    };
  };
  onChange: (file: File) => void;
  onBack: () => void;
  onNext: () => void;
  file?: File;
}

export const FindYourSharedWallet = ({ translations, onChange, onBack, onNext, file }: Props): JSX.Element => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.files?.[0]);
  };

  return (
    <Flex h="$fill" flexDirection="column" w="$fill">
      <Box mb={'$24'}>
        <Text.Heading
          className={sx({
            color: '$text_primary'
          })}
        >
          {translations.title}
        </Text.Heading>
      </Box>
      <Box mb={'$40'}>
        <Text.Body.Normal
          className={sx({
            color: '$text_primary'
          })}
        >
          {translations.subtitle}
        </Text.Body.Normal>
      </Box>
      <Box h="$fill" w="$fill">
        <Box mb="$16">
          <FileUpload
            label={translations.fileUpload.label}
            removeButtonLabel={translations.fileUpload.removeButtonLabel}
            supportedFormats={translations.fileUpload.supportedFormats}
            accept="application/json"
            onChange={handleFileChange}
            files={file ? [file.name] : undefined}
          />
        </Box>
        {file === undefined && (
          <Box>
            <ActionCard
              title={translations.syncNetwork.title}
              description={translations.syncNetwork.description}
              icon={<RefreshComponent />}
            />
          </Box>
        )}
      </Box>
      <Flex w="$fill" justifyContent="space-between" alignItems="center">
        <Button.Secondary label={translations.backButton} onClick={() => onBack()} />
        <Button.CallToAction label={translations.nextButton} onClick={() => onNext()} />
      </Flex>
    </Flex>
  );
};
