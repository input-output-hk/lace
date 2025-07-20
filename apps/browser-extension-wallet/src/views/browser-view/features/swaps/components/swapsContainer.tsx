/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers */
import React, { useEffect, useState } from 'react';
import { Layout, SectionLayout, EducationalList } from '@src/views/browser-view/components';
import { useTranslation } from 'react-i18next';

import { Modal, Typography } from 'antd';
import styles from './swapsContainer.module.scss';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { Button, Card, Flex, Select, TextBox } from '@input-output-hk/lace-ui-toolkit';
import LightBulb from '@src/assets/icons/light.svg';
import { getTokenList } from '@src/utils/get-token-list';
import { useObservable } from '@lace/common';
import { useAssetInfo } from '@hooks';
import { useWalletStore } from '@src/stores';
import { DEFAULT_WALLET_BALANCE } from '@src/utils/constants';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
const { Title } = Typography;

/**
 *
 * UI
 *  slippage - value displayed, triggers modal to change
 */

interface TokenListFetchResponse {
  ticker: string;
  name: string;
  policyId: string;
  policyName: string;
  decimals: number;
  priceNumerator: number;
  priceDenominator: number;
  sources: [];
}

const defaultSlippagePercentages = [0.1, 0.3, 0.5]; // TODO: get from posthog
const initialSlippagePercentage = 3;

const getDexList = async () => {
  const response = await window.fetch(`${process.env.SWAPS_API_URL}/dex/list`, { method: 'GET' });

  if (!response.ok) {
    throw new Error('Unexpected response');
  }

  const parsedResponse = (await response.json()) as { results: string[] };
  return parsedResponse.results;
};

const getSwappableTokensList = async () => {
  const response = await window.fetch(`${process.env.SWAPS_API_URL}/tokens/list`, { method: 'GET' });

  if (!response.ok) {
    throw new Error('Unexpected response');
  }

  const parsedResponse = (await response.json()) as { results: TokenListFetchResponse };
  return parsedResponse.results;
};

export const SwapsContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const [tokenA, setTokenA] = useState<{ token: string; amount: string }>({ token: 'ADA', amount: '0' });
  const [tokenB, setTokenB] = useState<{ token: string; amount: string }>({ token: '', amount: '0' });
  const [dexList, setDexList] = useState<string[]>([]);
  const [chosenDexList, setChosenDexList] = useState<string[]>([]);
  const swapCenterPayload = usePostHogClientContext().getFeatureFlagPayload('swap-center');
  console.log(swapCenterPayload);
  const [isSlippageModalVisible, setIsSlippageModalVisible] = useState(false);
  const { inMemoryWallet } = useWalletStore();

  const [isDexChoiceModalVisible, setIsDexChoiceModalVisible] = useState(false);
  const assetsInfo = useAssetInfo();
  const [targetSlippage, setTargetSlippage] = useState(initialSlippagePercentage);

  const assetsBalance = useObservable(inMemoryWallet.balance.utxo.total$, DEFAULT_WALLET_BALANCE.utxo.total$);

  const { tokenList: swappableTokens } = getTokenList({
    assetsInfo,
    balance: assetsBalance?.assets,
    fiatCurrency: null
  });

  const titles = {
    glossary: t('educationalBanners.title.glossary'),
    faq: t('educationalBanners.title.faq'),
    video: t('educationalBanners.title.video')
  };

  useEffect(() => {
    getDexList().then((response) => {
      setDexList(response);
      setChosenDexList(response);
    });
    getSwappableTokensList();
  }, []);

  const educationalItems = [
    {
      title: titles.faq,
      subtitle: 'What are swaps?',
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=what-are-swaps`
    },
    {
      title: titles.faq,
      subtitle: 'Can I cancel a swap?',
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=can-swaps-be-cancelled`
    },
    {
      title: titles.faq,
      subtitle: 'What is slippage?',
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=what-is-slippage`
    }
  ];

  const sidePanel = (
    <Flex flexDirection="column" alignItems="stretch" gap="$32" mb="$112">
      <EducationalList items={educationalItems} title={'About swaps'} />
    </Flex>
  );

  return (
    <Layout>
      <SectionLayout sidePanelContent={sidePanel}>
        <SectionTitle title={'Swaps'} />
        <Card.Outlined style={{ padding: 16 }}>
          <Flex style={{ justifyContent: 'flex-end' }}>
            <Flex style={{ gap: '16px' }}>
              {/** SWAPS settings */}
              <Button.CallToAction
                label={`Slippage ${targetSlippage}%`}
                onClick={() => setIsSlippageModalVisible(!isSlippageModalVisible)}
              />
              <Button.Secondary
                label="Update Dex's"
                onClick={() => setIsDexChoiceModalVisible(!isDexChoiceModalVisible)}
              />
            </Flex>
          </Flex>
          <Flex flexDirection={'column'}>
            <Title level={3}>You swap</Title>
            <Card.Outlined>
              <Flex flexDirection={'row'} w="$fill">
                <Select.Root
                  align="selected"
                  variant="outline"
                  showArrow
                  value={tokenA?.token}
                  onChange={(v) => setTokenA({ amount: '0', token: v })}
                >
                  {swappableTokens.map((token) => (
                    <Select.Item key={token.name} title={token.name} value={token.name} />
                  ))}
                </Select.Root>
                <TextBox label="" value={tokenA?.amount} />
              </Flex>
            </Card.Outlined>
            <Title level={3}>To get</Title>
            <Card.Outlined>
              <Flex flexDirection={'row'} w="$fill">
                <Select.Root
                  align="selected"
                  variant="outline"
                  showArrow
                  value={tokenB?.token}
                  onChange={(v) => setTokenB({ amount: '0', token: v })}
                >
                  {swappableTokens.map((token) => (
                    <Select.Item key={token.name} title={token.name} value={token.name} />
                  ))}
                </Select.Root>
                <TextBox label="" value={tokenA?.amount} />
              </Flex>
            </Card.Outlined>
          </Flex>
        </Card.Outlined>
        {/* modals */}
        <Modal footer={null} className={styles.modal} open={isSlippageModalVisible} centered closable={false}>
          <Title level={3}>Slippage Settings</Title>
          <Flex className={styles.modalColumn} w="$fill">
            <Flex className={styles.slippageBlock} w="$fill">
              {defaultSlippagePercentages.map((suggestedPercentage) => (
                <Button.Primary
                  w={'$fill'}
                  color={targetSlippage === suggestedPercentage ? 'primary' : 'secondary'}
                  key={`suggested-percentage-${suggestedPercentage}`}
                  onClick={() => setTargetSlippage(suggestedPercentage)}
                  label={suggestedPercentage.toString()}
                />
              ))}
            </Flex>
            <Flex w={'$fill'}>
              <TextBox containerStyle={{ flex: 1 }} w="$fill" label="custom amount" value={targetSlippage.toString()} />
            </Flex>
            <Flex className={styles.buttons} w="$fill" justifyContent={'flex-end'}>
              <Button.Secondary
                onClick={() => setIsSlippageModalVisible(false)}
                data-testid="forgot-password-cancel-button"
                label={t('general.button.cancel')}
              />
              <Button.Primary
                onClick={() => {
                  // update slippage stuff
                }}
                data-testid="forgot-password-confirm-button"
                label="update"
              />
            </Flex>
          </Flex>
        </Modal>
        <Modal footer={null} className={styles.modal} open={isDexChoiceModalVisible} centered>
          <Title level={3}>Available DEX's</Title>
          <Flex flexDirection={'column'}>
            {chosenDexList}
            {dexList.map((dex) => (
              <p>{dex}</p>
            ))}
            <Flex justifyContent={'flex-end'}>
              <Button.Secondary
                onClick={() => setIsDexChoiceModalVisible(false)}
                data-testid="forgot-password-cancel-button"
                label={t('general.button.cancel')}
              />
              <Button.Primary
                onClick={() => {
                  // set dex stuff
                }}
                data-testid="set-dexs"
                label="update choices"
              />
            </Flex>
          </Flex>
        </Modal>
      </SectionLayout>
    </Layout>
  );
};
