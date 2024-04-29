import { Ellipsis, InlineInfoList, LabeledInfo } from '@lace/common';
import React, { ReactNode } from 'react';
import styles from './NftDetail.module.scss';
import { NftImage } from './NftImage';
import { TranslationsFor } from '@ui/utils/types';
import { Breadcrumb } from 'antd';
import { FolderOutlined, RightOutlined } from '@ant-design/icons';
import { Box, ControlButton, Flex } from '@lace/ui';
import { ReactComponent as ProfileIcon } from '../../assets/icons/profile-icon.component.svg';

export interface NftDetailProps {
  title?: ReactNode;
  image?: string;
  tokenInformation: LabeledInfo[];
  attributes?: string;
  folder?: string;
  amount?: number | string;
  translations: TranslationsFor<'tokenInformation' | 'attributes' | 'setAsAvatar' | 'directory'>;
  onSetAsAvatar?: (image: string) => void;
  isPopup?: boolean;
}

const JSON_INDENTATION = 2;

const parseAttributes = (attributes: Record<string, string | unknown[] | Record<string, unknown>>) =>
  Object.entries(attributes).map(
    ([name, value]: [string, string | unknown[] | Record<string, unknown>]): LabeledInfo => ({
      name,
      value: typeof value === 'string' ? value : JSON.stringify(value, undefined, JSON_INDENTATION)
    })
  );

export const NftDetail = ({
  title,
  image,
  tokenInformation,
  attributes,
  folder,
  amount,
  translations,
  onSetAsAvatar,
  isPopup
}: NftDetailProps): React.ReactElement => (
  <div className={styles.nftDetail}>
    {title}
    <div className={styles.imageContainer}>
      <div className={styles.imageWrapper}>
        {Number(amount) > 1 && (
          <div data-testid="nft-item-amount" className={styles.amount}>
            {amount}
          </div>
        )}
        <NftImage image={image} detailView popupView />
      </div>
    </div>
    <ControlButton.Outlined
      size="small"
      label={translations.setAsAvatar}
      icon={<ProfileIcon />}
      onClick={() => onSetAsAvatar(image)}
      data-testid="nft-set-as-avatar-button"
    />
    <div className={styles.info}>
      <div data-testid="nft-info" className={styles.section}>
        <h4 data-testid="nft-info-label">{translations.tokenInformation}</h4>
        <InlineInfoList
          items={[
            ...tokenInformation,
            {
              name: translations.directory,
              value: folder ? `Root > ${folder}` : 'Root',
              renderValueAs: !isPopup ? (
                <Breadcrumb separator={<RightOutlined />}>
                  <Breadcrumb.Item>
                    <FolderOutlined />
                    <span>Root</span>
                  </Breadcrumb.Item>
                  {folder && (
                    <Breadcrumb.Item>
                      <Ellipsis text={folder} beforeEllipsis={5} afterEllipsis={5} />
                    </Breadcrumb.Item>
                  )}
                </Breadcrumb>
              ) : (
                <Flex justifyContent="space-between" gap="$1">
                  <Box>Root</Box>
                  {folder && <Box px="$8">{'>'}</Box>}
                  {folder && <Ellipsis text={folder} beforeEllipsis={5} afterEllipsis={5} />}
                </Flex>
              )
            }
          ]}
        />
      </div>
      {attributes && (
        <>
          <div className={styles.separator} />
          <div data-testid="nft-attributes" className={styles.section}>
            <h4 data-testid="nft-attributes-label">{translations.attributes}</h4>
            <InlineInfoList items={parseAttributes(JSON.parse(attributes))} />
          </div>
        </>
      )}
    </div>
  </div>
);
