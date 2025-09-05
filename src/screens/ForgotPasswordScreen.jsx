import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useI18n } from '../i18n';
import { AuthContext } from '../auth/AuthContext';
import { useThemeContext } from '../theme/ThemeContext';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const { t } = useI18n();
  const { API_CONFIG } = React.useContext(AuthContext);
  const { isDarkMode } = useThemeContext();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert(
        t('error'),
        t('please_enter_valid_email'),
        [{ text: t('ok'), style: 'default' }]
      );
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_CONFIG?.BASE_URL || 'http://192.168.0.101:8000'}/api/password/reset`, {
        email,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      setSuccess(true);
      Alert.alert(
        t('success'),
        t('reset_link_sent'),
        [{ text: t('ok'), style: 'default' }]
      );
    } catch (error) {
      console.error('Password reset error:', error);
      
      let errorMessage = t('reset_link_error');
      if (error.response?.status === 422) {
        // Validation error
        const errors = error.response?.data?.errors;
        if (errors?.email?.[0]) {
          errorMessage = errors.email[0];
        }
      }
      
      Alert.alert(
        t('error'),
        errorMessage,
        [{ text: t('ok'), style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#4CAF50" : "#34A853"} />
        </TouchableOpacity>
        <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>{t('forgot_password')}</Text>
      </View>
      
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, isDarkMode ? styles.darkIconCircle : styles.lightIconCircle]}>
          <Ionicons name="mail-outline" size={40} color={isDarkMode ? "#4CAF50" : "#34A853"} />
        </View>
      </View>
      
      <Text style={[styles.description, isDarkMode ? styles.darkText : styles.lightText]}>
        {t('forgot_password_description')}
      </Text>
      
      <View style={[styles.inputContainer, isDarkMode ? styles.darkInputContainer : styles.lightInputContainer]}>
        <Ionicons name="mail-outline" size={20} color={isDarkMode ? "#4CAF50" : "#34A853"} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
          placeholder={t('email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={isDarkMode ? "#999" : "#777"}
        />
      </View>
      
      <TouchableOpacity 
        style={[styles.resetButton, success && styles.successButton, isDarkMode ? styles.darkResetButton : styles.lightResetButton]} 
        onPress={handleResetPassword}
        disabled={loading || success}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.resetButtonText}>
            {success ? t('reset_link_sent_short') : t('send_reset_link')}
          </Text>
        )}
      </TouchableOpacity>
      
      {success && (
        <View style={[styles.successContainer, isDarkMode ? styles.darkSuccessContainer : styles.lightSuccessContainer]}>
          <Ionicons name="checkmark-circle" size={24} color={isDarkMode ? "#4CAF50" : "#34A853"} />
          <Text style={[styles.successText, isDarkMode ? styles.darkSuccessText : styles.lightSuccessText]}>{t('check_your_email')}</Text>
        </View>
      )}
      
      <View style={[styles.helperTextContainer, isDarkMode ? styles.darkHelperTextContainer : styles.lightHelperTextContainer]}>
        <Text style={[styles.helperText, isDarkMode ? styles.darkHelperText : styles.lightHelperText]}>
          {t('reset_helper_text')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  lightContainer: {
    backgroundColor: '#FFFFFF',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 10,
  },
  lightText: {
    color: '#333',
  },
  darkText: {
    color: '#FFFFFF',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightIconCircle: {
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
  },
  darkIconCircle: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 25,
  },
  lightInputContainer: {
    borderColor: '#E0E0E0',
    backgroundColor: '#F9F9F9',
  },
  darkInputContainer: {
    borderColor: '#444444',
    backgroundColor: '#2A2A2A',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  lightInput: {
    color: '#333',
  },
  darkInput: {
    color: '#FFFFFF',
  },
  resetButton: {
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  lightResetButton: {
    backgroundColor: '#34A853',
    shadowColor: '#34A853',
  },
  darkResetButton: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  successButton: {
    backgroundColor: '#28A745',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
  },
  lightSuccessContainer: {
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
  },
  darkSuccessContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  successText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  lightSuccessText: {
    color: '#34A853',
  },
  darkSuccessText: {
    color: '#4CAF50',
  },
  helperTextContainer: {
    marginTop: 25,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  lightHelperTextContainer: {
    backgroundColor: '#F5F5F5',
    borderLeftColor: '#34A853',
  },
  darkHelperTextContainer: {
    backgroundColor: '#2A2A2A',
    borderLeftColor: '#4CAF50',
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
  },
  lightHelperText: {
    color: '#666',
  },
  darkHelperText: {
    color: '#BBBBBB',
  },
});

export default ForgotPasswordScreen;
