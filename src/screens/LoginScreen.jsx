import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../auth/AuthContext';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { useThemeContext } from '../theme/ThemeContext';

const LoginScreen = () => {
  const navigation = useNavigation();
  const { login, loading, loginWithGoogle, loginWithApple } = React.useContext(AuthContext);
  const { t } = useI18n();
  const { isDarkMode } = useThemeContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Login</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
        placeholderTextColor={isDarkMode ? '#999' : '#777'}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
        placeholderTextColor={isDarkMode ? '#999' : '#777'}
      />
      <TouchableOpacity 
        style={[styles.loginButton, isDarkMode ? styles.darkLoginButton : styles.lightLoginButton]}
        onPress={() => login(email, password)}
      >
        <Text style={styles.loginButtonText}>Login</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.forgotPasswordLink} 
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={[styles.forgotPasswordText, isDarkMode ? styles.darkLinkText : styles.lightLinkText]}>{t('forgot_password_link')}</Text>
      </TouchableOpacity>
      
      <View style={{ height: 20 }} />
      
      <TouchableOpacity 
        style={[styles.socialButton, styles.googleButton]} 
        onPress={() => loginWithGoogle({ email })}
      >
        <AntDesign name="google" size={20} color="white" />
        <Text style={styles.socialButtonText}>Continue with Google</Text>
      </TouchableOpacity>
      
      <View style={{ height: 12 }} />
      
      <TouchableOpacity 
        style={[styles.socialButton, styles.appleButton]} 
        onPress={() => loginWithApple({ email })}
      >
        <AntDesign name="apple1" size={20} color="white" />
        <Text style={styles.socialButtonText}>Continue with Apple</Text>
      </TouchableOpacity>
      
      <View style={{ height: 20 }} />
      
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={[styles.registerLink, isDarkMode ? styles.darkLinkText : styles.lightLinkText]}>No account? Register</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  lightContainer: { backgroundColor: '#FFFFFF' },
  darkContainer: { backgroundColor: '#121212' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  lightText: { color: '#000000' },
  darkText: { color: '#FFFFFF' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  lightInput: { borderColor: '#CCCCCC', backgroundColor: '#F5F5F5', color: '#000000' },
  darkInput: { borderColor: '#444444', backgroundColor: '#2A2A2A', color: '#FFFFFF' },
  loginButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  lightLoginButton: { backgroundColor: '#007AFF' },
  darkLoginButton: { backgroundColor: '#0A84FF' },
  loginButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 10
  },
  googleButton: {
    backgroundColor: '#34A853', // Google green
  },
  appleButton: {
    backgroundColor: '#000',
  },
  socialButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  registerLink: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  lightLinkText: { color: '#007AFF' },
  darkLinkText: { color: '#0A84FF' },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  }
});

export default LoginScreen;
