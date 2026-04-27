import React from 'react';
import { View, Text, ScrollView } from 'react-native';

interface ConfigurationErrorScreenProps {
  configValidationError: string;
}

export const ConfigurationErrorScreen: React.FC<
  ConfigurationErrorScreenProps
> = ({ configValidationError }) => {
  const errorParts = (configValidationError || '').split('|');
  const count = errorParts[0]?.replace('COUNT:', '') || '0';
  const variables =
    errorParts[1]?.replace('VARS:', '').replace('ERROR:', '') ||
    'Unknown error';
  const environmentInfo = errorParts[2]?.replace('ENV:', '') || '';

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      {/* Enhanced Header with Count */}
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
          ⚠️ Configuration Error
        </Text>
        <Text
          style={{
            color: '#fecaca',
            textAlign: 'center',
            fontSize: 18,
            fontWeight: '600',
            marginBottom: 8,
          }}>
          {count} environment variable{count !== '1' ? 's' : ''} missing
        </Text>
        <Text
          style={{
            color: '#fca5a5',
            textAlign: 'center',
            fontSize: 14,
            fontStyle: 'italic',
          }}>
          Cannot start app without required configuration
        </Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={{ flex: 1, margin: 20 }}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Missing Variables Section */}
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
            Missing Variables ({count})
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
              {variables}
            </Text>
          </View>
        </View>

        {/* Environment Info Section */}
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
            Environment Configuration
          </Text>
          <View
            style={{
              backgroundColor: '#f0f9ff',
              borderLeftWidth: 6,
              borderLeftColor: '#3b82f6',
              borderRadius: 12,
              padding: 16,
            }}>
            <Text
              style={{
                color: '#1e40af',
                fontSize: 13,
                lineHeight: 20,
                fontFamily: 'monospace',
              }}>
              {environmentInfo}
            </Text>
          </View>
        </View>

        {/* How to Fix Section */}
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
              1. Create or update your environment file (.env.local)
            </Text>
            <Text
              style={{
                color: '#15803d',
                fontSize: 14,
                lineHeight: 20,
                marginBottom: 12,
              }}>
              2. Add all missing EXPO_PUBLIC_* variables with valid values
            </Text>
            <Text
              style={{
                color: '#15803d',
                fontSize: 14,
                lineHeight: 20,
                marginBottom: 12,
              }}>
              3. Restart the development server
            </Text>
            <Text
              style={{
                color: '#166534',
                fontSize: 12,
                lineHeight: 16,
                fontStyle: 'italic',
              }}>
              💡 Tip: Check .env.example for reference values
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Enhanced Footer */}
      <View
        style={{
          backgroundColor: 'white',
          paddingVertical: 20,
          paddingHorizontal: 24,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 5,
        }}>
        <Text
          style={{
            color: '#374151',
            textAlign: 'center',
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 4,
          }}>
          🔧 Configuration Required
        </Text>
        <Text
          style={{
            color: '#6b7280',
            textAlign: 'center',
            fontSize: 12,
            lineHeight: 16,
          }}>
          The app will automatically reload once variables are configured
        </Text>
      </View>
    </View>
  );
};
