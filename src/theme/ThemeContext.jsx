import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create the theme context
const ThemeContext = createContext();

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const deviceTheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', or 'system'
  
  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme_preference');
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
      } catch (error) {
        console.error('Failed to load theme preference', error);
      }
    };
    
    loadThemePreference();
  }, []);
  
  // Save theme preference when it changes
  useEffect(() => {
    const saveThemePreference = async () => {
      try {
        await AsyncStorage.setItem('theme_preference', themeMode);
      } catch (error) {
        console.error('Failed to save theme preference', error);
      }
    };
    
    if (themeMode !== 'system') {
      saveThemePreference();
    }
  }, [themeMode]);
  
  // Determine the actual theme based on preference
  const actualTheme = themeMode === 'system' ? deviceTheme : themeMode;
  
  // Toggle between light, dark, and system
  const toggleTheme = () => {
    setThemeMode(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  };
  
  return (
    <ThemeContext.Provider value={{ 
      themeMode, 
      isDarkMode: actualTheme === 'dark', 
      toggleTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useThemeContext = () => useContext(ThemeContext);
