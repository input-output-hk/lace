import { Button, FileUpload, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import React, { ChangeEvent, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

export class UnrecognizedFile extends Error {
  constructor() {
    super('UnrecognizedFile');
  }
}

const loadFileAsJson = <Content extends unknown>(file: File) =>
  new Promise<Content>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (reader.error) {
        reject(new UnrecognizedFile());
        return;
      }
      try {
        resolve(JSON.parse(reader.result as string));
      } catch {
        reject(new UnrecognizedFile());
      }
    });
    reader.readAsText(file);
  });

type SharedTransactionData = unknown;

type CoSignEntryProps = {
  onCancel: () => void;
  onContinue: () => void;
};

export const CoSignEntry = ({ onCancel, onContinue }: CoSignEntryProps) => {
  const { t } = useTranslation();
  const [loadedFileName, setLoadedFileName] = useState('');

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files.length === 0) return;
    setLoadedFileName(event.target.files[0].name);

    let sharedTransactionData: SharedTransactionData;
    try {
      sharedTransactionData = await loadFileAsJson<SharedTransactionData>(event.target.files[0]);
    } catch (error: unknown) {
      if (error instanceof UnrecognizedFile) {
        // handle with popup message
      }
      throw error;
    }

    // TODO: LW-10777 (next PR) validate and display popup errors
    console.info(sharedTransactionData);
  };

  const handleContinue = () => {
    onContinue();
  };

  return (
    <Flex gap="$32" flexDirection="column" h="$fill">
      <Flex gap="$8" flexDirection="column">
        <Text.SubHeading>Import transaction</Text.SubHeading>
        <Text.Body.Normal>
          To co-sign a transaction initiated by another shared wallet member, upload the transaction JSON file you
          received.
        </Text.Body.Normal>
      </Flex>
      <Flex h="$fill" w="$fill">
        <FileUpload
          id="upload-transaction-json"
          label={
            <Trans
              i18nKey="sharedWallets.transaction.coSign.importJsonStep.uploadBtnTitle"
              t={t}
              components={{
                Link: <Text.Button color="highlight" />,
              }}
            />
          }
          accept="application/json"
          onChange={onFileChange}
          supportedFormats="Supported formats: JSON"
          removeButtonLabel="Remove"
          files={loadedFileName ? [loadedFileName] : undefined}
          onRemove={() => setLoadedFileName('')}
        />
      </Flex>
      <Flex gap="$16" flexDirection="column" mb="$24" w="$fill">
        <Button.CallToAction label="Continue" onClick={handleContinue} disabled={!loadedFileName} w="$fill" />
        <Button.Secondary label="Cancel" onClick={onCancel} w="$fill" />
      </Flex>
    </Flex>
  );
};
