import { Box, Divider, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import styles from './../layout/Footer.styles.module.scss';
import Logo from '../assets/icons/logo.svg';
import * as React from 'react';

export const Footer = () => (
  <div className={styles.wrapper}>
    <Divider />
    <Flex mt="$24" justifyContent="space-between" alignItems="center" pb="$24">
      <div>
        <Text.Body.Small className={styles.footerText}>
          By using the website, you agree to these{' '}
          <a href="/terms-of-use.pdf" target="_blank" className={styles.footerLink}>
            Terms of use
          </a>{' '}
          and{' '}
          <a href="/privacy-policy.pdf" target="_blank" className={styles.footerLink}>
            Privacy Policy
          </a>
        </Text.Body.Small>
        <Box>
          <Text.Body.Small className={styles.footerText}>
            &copy; {new Date().getFullYear()} Input Output Global. All Rights Reserved.
          </Text.Body.Small>
        </Box>
      </div>
      <Logo className={styles.logo} />
    </Flex>
  </div>
);
