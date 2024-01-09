import React from 'react';
import { sx, Box, Flex, Text, Button, FileUpload } from '@lace/ui';

interface Props {
  translations: {
    title: string;
    subtitle: string;
    backButton: string;
    nextButton: string;
    fileUpload: {
      label: { text: string; highlight: boolean }[];
      supportedFormats: string;
      removeButtonLabel: string;
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
            color: '$text_secondary'
          })}
        >
          {translations.subtitle}
        </Text.Body.Normal>
      </Box>
      <Box h="$fill" w="$fill">
        <FileUpload
          label={translations.fileUpload.label}
          removeButtonLabel={translations.fileUpload.removeButtonLabel}
          supportedFormats={translations.fileUpload.supportedFormats}
          accept="application/json"
          onChange={handleFileChange}
          files={file ? [file.name] : undefined}
        />
      </Box>
      <Flex w="$fill" justifyContent="space-between" alignItems="center">
        <Button.Secondary label={translations.backButton} onClick={() => onBack()} />
        <Button.CallToAction label={translations.nextButton} onClick={() => onNext()} />
      </Flex>
    </Flex>
  );
};
