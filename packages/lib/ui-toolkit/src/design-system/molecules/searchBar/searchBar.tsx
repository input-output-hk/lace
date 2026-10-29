import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, TextInput as RNTextInput } from 'react-native';

import { useTheme, spacing, radius } from '../../../design-tokens';
import { Icon, IconButton, Row } from '../../atoms';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms/icons/Icon';

export interface SearchBarAction {
  iconName: IconName;
  /**
   * Receives the text currently IN the field, which in self-owned mode may not
   * be the committed query yet. Take the query from here rather than from the
   * consumer's own state: the field commits before calling this, but React has
   * not re-rendered yet, so a handler closing over that state still reads the
   * previous query.
   */
  onPress: (searchText: string) => void;
  testID?: string;
  hasAscendingColor?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

interface SearchBarBaseProps {
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  testID?: string;
  textInputProps?: Omit<
    TextInputProps,
    'onChangeText' | 'placeholder' | 'value'
  >;
  extraStyle?: StyleProp<ViewStyle>;
  actions?: SearchBarAction[];
}

/** The caller owns the text, so every keystroke re-renders the caller. */
export interface ControlledSearchBarProps extends SearchBarBaseProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onSearchCommit?: never;
  initialValue?: never;
}

/**
 * The field owns the text and the caller only hears the SETTLED query — after
 * `COMMIT_DELAY_MS` of quiet, on blur, or on clear. Use this for a search that
 * filters a list: a keystroke then re-renders this input and nothing above it,
 * so neither the filtering nor the list's own render sits between the key press
 * and the letter appearing (ADR 64).
 *
 * `initialValue` seeds the field on mount only — a restored route param, or the
 * last committed query when the surrounding tree gets rebuilt. The text lives
 * here, so a caller that mounts this inside something the list can tear down
 * (`ListHeaderComponent`, a keyed FlashList) must pass the committed query as
 * `initialValue` or the query is lost with the remount.
 */
export interface SelfOwnedSearchBarProps extends SearchBarBaseProps {
  onSearchCommit: (text: string) => void;
  initialValue?: string;
  value?: never;
  onChangeText?: never;
}

export type SearchBarProps = ControlledSearchBarProps | SelfOwnedSearchBarProps;

// The delay every already-debounced search surface in the app settled on
// (governance centre, address book, dapp explorer, and next/ui's screens).
const COMMIT_DELAY_MS = 300;

type SearchBarViewProps = SearchBarBaseProps & {
  value: string;
  onChangeText: ((text: string) => void) | undefined;
  onClear: () => void;
};

const SearchBarView = ({
  value,
  onChangeText,
  onClear,
  placeholder,
  disabled = false,
  clearable = false,
  testID = 'search-bar',
  textInputProps,
  extraStyle = {},
  actions = [],
}: SearchBarViewProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const defaultPlaceholder = t('v2.search-bar.placeholder');
  const renderedPlaceholder = placeholder ?? defaultPlaceholder;

  const hasActions = actions.length > 0;
  const shouldShowClearButton = clearable && !disabled && value.length > 0;
  const hasTrailingContent = hasActions || shouldShowClearButton;

  const renderTrailingContent = () => {
    if (!hasTrailingContent) return null;

    return (
      <Row alignItems="center" gap={spacing.M} style={styles.actionsContainer}>
        {shouldShowClearButton && (
          <IconButton.Static
            icon={<Icon name="Cancel" size={16} color={theme.text.secondary} />}
            onPress={onClear}
            containerStyle={styles.clearButton}
            testID={`${testID}-clear-button`}
          />
        )}
        {actions.map((action, index) => {
          const hasAscendingColor = action.hasAscendingColor ?? false;
          return (
            <IconButton.Static
              key={index}
              icon={
                <Icon
                  name={action.iconName}
                  size={20}
                  color={theme.brand.white}
                />
              }
              onPress={() => {
                action.onPress(value);
              }}
              containerStyle={StyleSheet.flatten([
                styles.actionButton,
                hasAscendingColor
                  ? styles.ascendingActionColor
                  : styles.regularActionColor,
                action.containerStyle,
              ])}
              testID={action.testID ?? `${testID}-action-${index}`}
            />
          );
        })}
      </Row>
    );
  };

  return (
    <Row
      alignItems="center"
      gap={spacing.S}
      style={[styles.container, disabled && styles.disabled, extraStyle]}
      testID={testID}>
      <Icon
        name="Search"
        color={theme.text.secondary}
        testID={`${testID}-icon`}
      />
      <Row
        style={[
          styles.inputContainer,
          hasTrailingContent && styles.inputContainerWithActions,
        ]}>
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={renderedPlaceholder}
          placeholderTextColor={theme.text.secondary}
          style={styles.input}
          editable={!disabled}
          testID={`${testID}-input`}
          // A query must reach the consumer verbatim: iOS applies the pending
          // autocorrection when the field blurs, silently rewriting searches
          // (tickers especially). Overridable via textInputProps.
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          {...textInputProps}
        />
      </Row>
      {renderTrailingContent()}
    </Row>
  );
};

const SelfOwnedSearchBar = ({
  initialValue = '',
  onSearchCommit,
  textInputProps,
  actions,
  ...viewProps
}: SelfOwnedSearchBarProps) => {
  const [text, setText] = useState(initialValue);
  // Held in refs so the timer callback never closes over a stale consumer and
  // a repeated query is not re-announced.
  const commitRef = useRef(onSearchCommit);
  commitRef.current = onSearchCommit;
  const committedRef = useRef(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancelPending = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  useEffect(() => cancelPending, [cancelPending]);

  const commit = useCallback(
    (value: string) => {
      cancelPending();
      if (value === committedRef.current) return;
      committedRef.current = value;
      commitRef.current(value);
    },
    [cancelPending],
  );

  const handleChangeText = useCallback(
    (value: string) => {
      setText(value);
      cancelPending();
      timerRef.current = setTimeout(() => {
        commit(value);
      }, COMMIT_DELAY_MS);
    },
    [cancelPending, commit],
  );

  // Clearing is a deliberate act, not a pause in typing: commit it at once
  // rather than leaving the list showing results for a query that is gone.
  const handleClear = useCallback(() => {
    setText('');
    commit('');
  }, [commit]);

  // Flush whatever the keyboard's dismissal leaves pending. Only that: a tap
  // on another control does NOT blur this field on native — gesture-handler
  // touchables bypass the responder system and the lists above set
  // keyboardShouldPersistTaps="handled" — so blur cannot be the flush a press
  // handler relies on. The actions below flush explicitly for that reason.
  const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    event => {
      commit(text);
      textInputProps?.onBlur?.(event);
    },
    [commit, text, textInputProps],
  );

  // The actions sit INSIDE the field (browse-pool's filter button): pressing
  // one acts on the query the user can see, so settle that query first rather
  // than let the press race the commit delay. The handler is also handed the
  // text, because the commit it just triggered has not re-rendered the
  // consumer yet — a handler reading its own state would still see the
  // previous query.
  const flushingActions = useMemo(
    () =>
      actions?.map(action => ({
        ...action,
        onPress: (searchText: string) => {
          commit(searchText);
          action.onPress(searchText);
        },
      })),
    [actions, commit],
  );

  return (
    <SearchBarView
      {...viewProps}
      actions={flushingActions}
      value={text}
      onChangeText={handleChangeText}
      onClear={handleClear}
      textInputProps={{ ...textInputProps, onBlur: handleBlur }}
    />
  );
};

const ControlledSearchBar = ({
  value = '',
  onChangeText,
  ...viewProps
}: ControlledSearchBarProps) => {
  const handleClear = useCallback(() => {
    onChangeText?.('');
  }, [onChangeText]);

  return (
    <SearchBarView
      {...viewProps}
      value={value}
      onChangeText={onChangeText}
      onClear={handleClear}
    />
  );
};

export const SearchBar = (props: SearchBarProps) =>
  props.onSearchCommit === undefined ? (
    <ControlledSearchBar {...props} />
  ) : (
    <SelfOwnedSearchBar {...props} />
  );

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background.secondary,
      borderRadius: radius.S,
      padding: spacing.M,
    },
    inputContainer: {
      flex: 1,
      minWidth: 0,
    },
    inputContainerWithActions: {
      paddingRight: spacing.XXXXL,
    },
    input: {
      flex: 1,
      color: theme.text.primary,
    },
    clearButton: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.XS,
    },
    disabled: {
      opacity: 0.5,
    },
    actionsContainer: {
      position: 'absolute',
      right: spacing.M,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButton: {
      height: 32,
      width: 32,
      padding: spacing.XS,
    },
    ascendingActionColor: {
      backgroundColor: theme.brand.ascending,
    },
    regularActionColor: {
      backgroundColor: theme.background.tertiary,
    },
  });
