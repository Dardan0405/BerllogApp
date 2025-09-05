import 'react-native-gesture-handler'
import 'react-native-reanimated';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { I18nProvider } from './src/i18n';
import { AuthProvider } from './src/auth/AuthContext';
import { ThemeProvider, useThemeContext } from './src/theme/ThemeContext';

// Adaptive status bar component
const AdaptiveStatusBar = () => {
  const { isDarkMode } = useThemeContext();
  return <StatusBar style={isDarkMode ? 'light' : 'dark'} />
};

// Main app component
function MainApp() {
  return (
    <>
      <AppNavigator />
      <AdaptiveStatusBar />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <ThemeProvider>
          <MainApp />
        </ThemeProvider>
      </I18nProvider>
    </AuthProvider>
  );
}
