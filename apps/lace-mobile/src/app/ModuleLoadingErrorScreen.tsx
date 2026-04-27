import React from 'react';
import { View, Text, ScrollView } from 'react-native';

interface ModuleLoadingErrorScreenProps {
  error: string;
}

export const ModuleLoadingErrorScreen: React.FC<
  ModuleLoadingErrorScreenProps
> = ({ error }) => {
  const FLAG_SEPARATOR = '\n\n--- Flag Comparison ---\n';
  const [errorMessage, flagComparison] = error.includes(FLAG_SEPARATOR)
    ? error.split(FLAG_SEPARATOR)
    : [error, null];

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <View
        style={{
          backgroundColor: '#dc2626',
          paddingTop: 50,
          paddingBottom: 24,
          paddingHorizontal: 24,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 8,
        }}>
        <Text
          style={{
            color: 'white',
            textAlign: 'center',
            fontSize: 28,
            fontWeight: 'bold',
            marginBottom: 12,
          }}>
          ⚠️ Module Loading Error
        </Text>
        <Text
          style={{
            color: '#fca5a5',
            textAlign: 'center',
            fontSize: 14,
            fontStyle: 'italic',
          }}>
          Development build only
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, margin: 20 }}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 20 }}>
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 5,
          }}>
          <Text
            style={{
              color: '#1f2937',
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 16,
              textAlign: 'center',
            }}>
            Error Details
          </Text>
          <View
            style={{
              backgroundColor: '#fef2f2',
              borderLeftWidth: 6,
              borderLeftColor: '#ef4444',
              borderRadius: 12,
              padding: 16,
            }}>
            <Text
              style={{
                color: '#dc2626',
                fontSize: 12,
                fontFamily: 'monospace',
                lineHeight: 18,
              }}>
              {errorMessage}
            </Text>
          </View>
        </View>

        {flagComparison !== null && (
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 5,
            }}>
            <Text
              style={{
                color: '#1f2937',
                fontSize: 18,
                fontWeight: 'bold',
                marginBottom: 16,
                textAlign: 'center',
              }}>
              Feature Flag Comparison
            </Text>
            <View
              style={{
                backgroundColor: '#fffbeb',
                borderLeftWidth: 6,
                borderLeftColor: '#f59e0b',
                borderRadius: 12,
                padding: 16,
              }}>
              <Text
                style={{
                  color: '#92400e',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  lineHeight: 20,
                }}>
                {flagComparison}
              </Text>
            </View>
          </View>
        )}

        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 5,
          }}>
          <Text
            style={{
              color: '#1f2937',
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 16,
              textAlign: 'center',
            }}>
            How to Fix
          </Text>
          <View
            style={{
              backgroundColor: '#f0fdf4',
              borderLeftWidth: 6,
              borderLeftColor: '#22c55e',
              borderRadius: 12,
              padding: 16,
            }}>
            <Text
              style={{
                color: '#15803d',
                fontSize: 14,
                lineHeight: 20,
                marginBottom: 12,
              }}>
              1. Check that all required feature flags are present in
              feature-flags.ts
            </Text>
            <Text
              style={{
                color: '#15803d',
                fontSize: 14,
                lineHeight: 20,
                marginBottom: 12,
              }}>
              2. Verify every contract dependency has a module implementation
              loaded
            </Text>
            <Text
              style={{
                color: '#15803d',
                fontSize: 14,
                lineHeight: 20,
                marginBottom: 12,
              }}>
              3. Check that feature-flags.override.ts (if present) enables the
              correct flags
            </Text>
            <Text
              style={{
                color: '#166534',
                fontSize: 12,
                lineHeight: 16,
                fontStyle: 'italic',
              }}>
              💡 Tip: The full error has been sent to Sentry with tag
              phase=module-loading
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
