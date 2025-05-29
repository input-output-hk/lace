import React, { useRef } from 'react';

import { ChevronRightIcon } from '@chakra-ui/icons';
import { Box, Button, Text } from '@chakra-ui/react';

import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { useOutsideHandles } from '../../../features/outside-handles-provider/useOutsideHandles';
import TermsOfUse from '../../../ui/app/components/termsOfUse';

export const LegalSettings = () => {
  const capture = useCaptureEvent();
  const { openExternalLink } = useOutsideHandles();
  const termsReference = useRef<{ openModal: () => void }>();
  return (
    <>
      <Box height="10" />
      <Text fontSize="lg" fontWeight="bold">
        Legal
      </Text>
      <Box height="6" />
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
        onClick={() => {
          openExternalLink(`${process.env.PRIVACY_POLICY_URL}`);
        }}
      >
        Privacy Policy
      </Button>
      <TermsOfUse ref={termsReference} />
    </>
  );
};
