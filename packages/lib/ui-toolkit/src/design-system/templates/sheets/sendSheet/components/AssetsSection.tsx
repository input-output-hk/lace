import { formatRawToLocale } from '@lace-lib/util-render';
import React from 'react';
import { StyleSheet } from 'react-native';

import { radius, spacing } from '../../../../../design-tokens';
import { isShieldedFromMetadata } from '../../../../../utils/sendSheetUtils';
import {
  Button,
  Column,
  CustomTextInput,
  Icon,
  Row,
  Text,
} from '../../../../atoms';
import { getAssetImageUrl } from '../../../../util';

import type { Theme } from '../../../../../design-tokens';
import type { SendSheetProps } from '../sendSheet';

interface AssetsSectionProps {
  copies: Pick<
    SendSheetProps['copies'],
    | 'addButtonLabel'
    | 'assetErrors'
    | 'assetsTitle'
    | 'balanceLabel'
    | 'maxButtonLabel'
  >;
  values: Pick<
    SendSheetProps['values'],
    'assetInputValues' | 'assetsToSend' | 'selectedAccountId'
  >;
  utils: Pick<
    SendSheetProps['utils'],
    | 'isAddAssetButtonEnabled'
    | 'shouldShowMaxButton'
    | 'shouldShowRemoveAsset'
    | 'theme'
  >;
  actions: Pick<
    SendSheetProps['actions'],
    | 'handleInputChange'
    | 'onAddAssetPress'
    | 'onMaxAmountPress'
    | 'onRemoveAsset'
  >;
}

export const AssetsSection = ({
  copies,
  values,
  utils,
  actions,
}: AssetsSectionProps) => {
  const {
    assetsTitle,
    balanceLabel,
    assetErrors,
    addButtonLabel,
    maxButtonLabel,
  } = copies;
  const { assetsToSend, assetInputValues, selectedAccountId } = values;
  const {
    isAddAssetButtonEnabled,
    shouldShowMaxButton,
    shouldShowRemoveAsset,
    theme,
  } = utils;
  const {
    onAddAssetPress,
    onRemoveAsset,
    onMaxAmountPress,
    handleInputChange,
  } = actions;

  const styles = getStyles(theme);

  return (
    <Column gap={spacing.M}>
      <Row justifyContent="space-between" alignItems="center">
        <Text.XS testID="you-will-send-label">{assetsTitle}</Text.XS>
        {selectedAccountId !== null && (
          <Button.Primary
            iconSize={20}
            label={addButtonLabel}
            preIconName="Plus"
            onPress={onAddAssetPress}
            disabled={!isAddAssetButtonEnabled}
            testID="send-sheet-add-asset-button"
          />
        )}
      </Row>

      {assetsToSend?.map((asset, index) => {
        const isNft =
          asset.type === 'nft' || asset.token.metadata?.isNft === true;

        const formattedAvailableLabel = formatRawToLocale(
          asset.token.available || '0',
        );

        const rawValue = assetInputValues?.[index]?.value ?? '0';
        const isShielded = isShieldedFromMetadata(asset.token.metadata);

        return (
          <CustomTextInput
            isWithinBottomSheet
            key={asset.token.tokenId}
            testID={`send-amount-${index}`}
            avatar={{
              content: {
                ...(asset.token.metadata?.image && {
                  img: { uri: getAssetImageUrl(asset.token.metadata.image) },
                }),
                fallback: asset.token.displayShortName,
              },
              isShielded,
              size: 40,
              shape: 'rounded',
              testID: `send-amount-${index}-avatar`,
            }}
            {...(isNft
              ? {}
              : {
                  label: `${balanceLabel} ${formattedAvailableLabel}`,
                })}
            value={rawValue}
            keyboardType="decimal-pad"
            editable={!isNft}
            readOnly={isNft}
            onChange={event => {
              handleInputChange(index, event.nativeEvent.text);
            }}
            ctaButtons={[
              ...(shouldShowMaxButton?.(asset.token.tokenId) && !isNft
                ? [
                    {
                      label: maxButtonLabel,
                      onPress: () => {
                        onMaxAmountPress(index);
                      },
                      style: styles.ctaButton,
                      testID: `send-amount-${index}-max-button`,
                    },
                  ]
                : []),
              ...(shouldShowRemoveAsset?.(index) !== false
                ? [
                    {
                      icon: <Icon name="Delete" />,
                      onPress: () => {
                        onRemoveAsset(asset.token.tokenId);
                      },
                      style: styles.ctaButton,
                      testID: `send-amount-${index}-delete-button`,
                    },
                  ]
                : []),
            ]}
            inputError={assetErrors?.[index]}
          />
        );
      })}
    </Column>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    ctaButton: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.rounded,
    },
  });
