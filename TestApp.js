import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/theme/ThemeContext';
import { I18nProvider } from './src/i18n';
import RankingScreenTest from './src/tests/RankingScreenTest';

export default function TestApp() {
  return (
    <NavigationContainer>
      <ThemeProvider>
        <I18nProvider>
          <SafeAreaView style={{ flex: 1 }}>
            <StatusBar />
            <RankingScreenTest />
          </SafeAreaView>
        </I18nProvider>
      </ThemeProvider>
    </NavigationContainer>
  );
}
