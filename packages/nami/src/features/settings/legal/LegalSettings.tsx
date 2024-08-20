import React, { useRef } from 'react';

import { ChevronRightIcon, InfoOutlineIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  Link,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Spacer,
  Switch,
  Text,
} from '@chakra-ui/react';

import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import PrivacyPolicy from '../../../ui/app/components/privacyPolicy';
import TermsOfUse from '../../../ui/app/components/termsOfUse';

interface Props {
  isAnalyticsOptIn: boolean;
  handleAnalyticsChoice: (isOptedIn: boolean) => Promise<void>;
}

export const LegalSettings = ({
  isAnalyticsOptIn,
  handleAnalyticsChoice,
}: Readonly<Props>) => {
  const capture = useCaptureEvent();
  const termsReference = useRef<{ openModal: () => void }>();
  const privacyPolicyReference = useRef<{ openModal: () => void }>();
  return (
    <>
      <Box height="10" />
      <Text fontSize="lg" fontWeight="bold">
        Legal
      </Text>
      <Box height="6" />
      <Flex minWidth="65%" padding="0 16px" alignItems="center" gap="2">
        <Text fontSize="16" fontWeight="bold">
          Analytics
          <Popover autoFocus={false}>
            <PopoverTrigger>
              <InfoOutlineIcon
                cursor="pointer"
                color="#4A5568"
                ml="10px"
                width="14px"
                height="14px"
                display="inline-block"
              />
            </PopoverTrigger>
            <PopoverContent>
              <PopoverArrow />
              <PopoverBody>
                <Text
                  color="grey"
                  fontWeight="500"
                  fontSize="14"
                  lineHeight="24px"
                >
                  We collect anonymous information from your browser extension
                  to help us improve the quality and performance of Nami. This
                  may include data about how you use our service, your
                  preferences and information about your system. Read more&nbsp;
                  <Link
                    onClick={() => window.open('https://namiwallet.io')}
                    textDecoration="underline"
                  >
                    here
                  </Link>
                  .
                </Text>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </Text>
        <Spacer />
        <Switch
          isChecked={isAnalyticsOptIn}
          onChange={() => {
            void handleAnalyticsChoice(!isAnalyticsOptIn);
          }}
        />
      </Flex>
      <Box height="3" />
      <Button
        justifyContent="space-between"
        width="65%"
        rightIcon={<ChevronRightIcon />}
        variant="ghost"
        onClick={() => {
          void capture(Events.SettingsTermsAndConditionsClick);
          termsReference.current?.openModal();
        }}
      >
        Terms of Use
      </Button>
      <Box height="1" />
      <Button
        justifyContent="space-between"
        width="65%"
        rightIcon={<ChevronRightIcon />}
        variant="ghost"
        onClick={() => privacyPolicyReference.current?.openModal()}
      >
        Privacy Policy
      </Button>
      <PrivacyPolicy ref={privacyPolicyReference} />
      <TermsOfUse ref={termsReference} />
    </>
  );
};
