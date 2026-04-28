import { useTranslation } from '@lace-contract/i18n';
import {
  NavigationControls,
  SheetRoutes,
  StackRoutes,
} from '@lace-lib/navigation';
import {
  Icon,
  radius,
  Tabs,
  Text,
  spacing,
  useTheme,
  PageContainerTemplate,
} from '@lace-lib/ui-toolkit';
import { TabBarMetrics } from '@lace-lib/ui-toolkit';
import React, { useState, useMemo, useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ActionList } from '../components/ActionList';
import { CredentialCard } from '../components/CredentialCard';
import { IdentityProfile } from '../components/IdentityProfile';
import {
  MOCK_USER,
  MOCK_CREDENTIALS,
  MOCK_CONNECTIONS,
  MOCK_ACTIVITY,
} from '../data/mockData';

import type { Activity, Connection, Credential, User } from '../data/mockData';
import type { Theme } from '@lace-lib/ui-toolkit';

interface IdentityCenterPageProps {
  user?: User;
  credentials?: Credential[];
  connections?: Connection[];
  activity?: Activity[];
}

export const IdentityCenterPage = ({
  user = MOCK_USER,
  credentials = MOCK_CREDENTIALS,
  connections = MOCK_CONNECTIONS,
  activity = MOCK_ACTIVITY,
}: IdentityCenterPageProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  const [activeTab, setActiveTab] = useState(0);
  const [isSheetsExpanded, setIsSheetsExpanded] = useState(false);
  const [isStackExpanded, setIsStackExpanded] = useState(false);

  const tabs = useMemo(
    () => [t('v2.identity.tabs.connections'), t('v2.identity.tabs.activity')],
    [t],
  );

  //TODO: Remove this once we complete phase1
  const debugSheetScreens = useMemo(
    () =>
      __DEV__
        ? [
            {
              label: t('v2.identity.page.kycDetails'),
              route: SheetRoutes.KYCDetails,
            },
            {
              label: t('v2.identity.page.kycWebview'),
              route: SheetRoutes.KYCWebview,
            },
            {
              label: t('v2.identity.page.connectionDetails'),
              route: SheetRoutes.ConnectionDetails,
            },
            {
              label: t('v2.identity.page.connectionPending'),
              route: SheetRoutes.ConnectionPending,
            },
            {
              label: t('v2.identity.page.connectionComplete'),
              route: SheetRoutes.ConnectionComplete,
            },
          ]
        : [],
    [t],
  );

  //TODO: Remove this once we complete phase1
  const debugStackScreens = useMemo(
    () =>
      __DEV__
        ? [
            {
              label: t('v2.identity.page.introStart'),
              route: StackRoutes.IntroStart,
            },
            {
              label: t('v2.identity.page.introLace'),
              route: StackRoutes.IntroLace,
            },
            {
              label: t('v2.identity.page.introProof'),
              route: StackRoutes.IntroProof,
            },
            {
              label: t('v2.identity.page.introPrivacy'),
              route: StackRoutes.IntroPrivacy,
            },
            {
              label: t('v2.identity.page.introComplete'),
              route: StackRoutes.IntroComplete,
            },
          ]
        : [],
    [t],
  );

  //TODO: Remove this once we complete phase1
  const handleDebugSheetScreen = useCallback((route: SheetRoutes) => {
    NavigationControls.sheets.navigate(route);
  }, []);

  //TODO: Remove this once we complete phase1
  const handleDebugStackScreen = useCallback((route: StackRoutes) => {
    NavigationControls.actions.closeAndNavigate(route, {}, { merge: true });
  }, []);

  return (
    <PageContainerTemplate style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {
          //TODO: Remove this once we complete phase1
          __DEV__ && (
            <>
              <View style={styles.debugRow}>
                <TouchableOpacity
                  style={styles.debugHeader}
                  onPress={() => {
                    setIsSheetsExpanded(!isSheetsExpanded);
                  }}
                  testID="debug-accordion-sheet">
                  <Text.XS style={styles.debugHeaderText}>Sheets</Text.XS>
                  <Icon
                    name={isSheetsExpanded ? 'CaretUp' : 'CaretDown'}
                    size={10}
                    color={theme.text.secondary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.debugHeader}
                  onPress={() => {
                    setIsStackExpanded(!isStackExpanded);
                  }}
                  testID="debug-accordion-stack">
                  <Text.XS style={styles.debugHeaderText}>Stack</Text.XS>
                  <Icon
                    name={isStackExpanded ? 'CaretUp' : 'CaretDown'}
                    size={10}
                    color={theme.text.secondary}
                  />
                </TouchableOpacity>
              </View>

              {isSheetsExpanded && (
                <View style={styles.debugButtons}>
                  {debugSheetScreens.map(screen => (
                    <TouchableOpacity
                      key={screen.route}
                      style={styles.debugBtn}
                      onPress={() => {
                        handleDebugSheetScreen(screen.route);
                      }}
                      testID={`debug-btn-${screen.route}`}>
                      <Text.XS style={styles.debugBtnText}>
                        {screen.label}
                      </Text.XS>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {isStackExpanded && (
                <View style={styles.debugButtons}>
                  {debugStackScreens.map(screen => (
                    <TouchableOpacity
                      key={screen.route}
                      style={styles.debugBtn}
                      onPress={() => {
                        handleDebugStackScreen(screen.route);
                      }}
                      testID={`debug-btn-${screen.route}`}>
                      <Text.XS style={styles.debugBtnText}>
                        {screen.label}
                      </Text.XS>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )
        }

        <IdentityProfile name={user.name} did={user.did} />

        <View style={styles.section}>
          <Text.L style={styles.sectionTitle}>
            {t('v2.identity.credentials.title')}
          </Text.L>
          <View style={styles.grid}>
            {credentials.map(cred => (
              <CredentialCard key={cred.id} credential={cred} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.tabsContainer}>
            <Tabs
              tabs={tabs}
              selectedTab={tabs[activeTab]}
              onSelectTab={setActiveTab}
            />
          </View>

          <ActionList
            data={activeTab === 0 ? connections : activity}
            type={activeTab === 0 ? 'connection' : 'activity'}
          />
        </View>
      </ScrollView>
    </PageContainerTemplate>
  );
};

const getStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: spacing.L,
      paddingBottom: TabBarMetrics.horizontal.height + spacing.XL,
    },
    section: {
      marginTop: spacing.L,
      gap: spacing.M,
    },
    sectionTitle: {
      marginBottom: spacing.S,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    tabsContainer: {
      marginBottom: spacing.M,
    },
    debugRow: {
      flexDirection: 'row',
      gap: spacing.S,
    },
    debugHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: spacing.XS,
      backgroundColor: theme.background.secondary,
      borderRadius: radius.XS,
    },
    debugHeaderText: {
      color: theme.text.secondary,
    },
    debugButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 6,
    },
    debugBtn: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      backgroundColor: theme.background.secondary,
      borderRadius: radius.XS,
    },
    debugBtnText: {
      color: theme.text.primary,
    },
  });
