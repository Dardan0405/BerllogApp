import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useI18n } from '../i18n';
import { useThemeContext } from '../theme/ThemeContext';

/**
 * A simple test component to verify translations and theme functionality
 * for the RankingScreen component
 */
const RankingScreenTest = () => {
  const { t, locale, setLocale } = useI18n();
  const { isDarkMode, toggleTheme } = useThemeContext();
  
  // Test all the translation keys used in RankingScreen
  const testKeys = [
    '24h',
    'last_week',
    'last_30_days',
    'all_time',
    'no_rankings',
    'failed_to_load',
    'retry',
    'points',
    'point',
    'posts_count',
    'post_count',
    'user',
    'rank',
    'anonymous',
    'loading'
  ];

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'sq' : 'en');
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}>
      <Text style={[styles.header, { color: isDarkMode ? '#fff' : '#000' }]}>
        RankingScreen Translation Test
      </Text>
      
      <View style={styles.controlsContainer}>
        <Button 
          title={`Current Theme: ${isDarkMode ? 'Dark' : 'Light'}`}
          onPress={toggleTheme}
        />
        <Button 
          title={`Current Language: ${locale === 'en' ? 'English' : 'Albanian'}`}
          onPress={toggleLanguage}
        />
      </View>

      <View style={styles.translationsContainer}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
          Translation Keys:
        </Text>
        
        {testKeys.map((key) => (
          <View key={key} style={styles.translationRow}>
            <Text style={[styles.keyText, { color: isDarkMode ? '#aaa' : '#555' }]}>
              {key}:
            </Text>
            <Text style={[styles.valueText, { color: isDarkMode ? '#fff' : '#000' }]}>
              {t(key)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  translationsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  translationRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  keyText: {
    flex: 1,
    fontWeight: 'bold',
  },
  valueText: {
    flex: 2,
  },
});

export default RankingScreenTest;
