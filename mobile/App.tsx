import React from 'react';
import { StatusBar, View } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { I18nProvider } from './src/i18n';
import AppNavigator from './src/navigation/AppNavigator';

const AppContent = () => {
  const { isDarkMode } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#0f172a' : '#f8fafc'}
      />
      <AuthProvider>
        <I18nProvider>
          <NotificationProvider>
            <AppNavigator />
          </NotificationProvider>
        </I18nProvider>
      </AuthProvider>
    </View>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
