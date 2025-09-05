import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../auth/AuthContext';
import { useThemeContext } from '../theme/ThemeContext';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const { register, loading } = React.useContext(AuthContext);
  const { isDarkMode } = useThemeContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password_confirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState({});

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Register</Text>
      <TextInput 
        value={name} 
        onChangeText={setName} 
        placeholder="Name" 
        style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]} 
        placeholderTextColor={isDarkMode ? '#999' : '#777'}
      />
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
      <TextInput 
        value={password_confirmation} 
        onChangeText={setPasswordConfirmation} 
        placeholder="Confirm Password" 
        secureTextEntry 
        style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]} 
        placeholderTextColor={isDarkMode ? '#999' : '#777'}
      />
      {Object.keys(errors).map(field => (
        <View key={field} style={[styles.errorContainer, isDarkMode ? styles.darkErrorContainer : styles.lightErrorContainer]}>
          {errors[field].map((error, index) => (
            <Text key={index} style={[styles.errorText, isDarkMode ? styles.darkErrorText : styles.lightErrorText]}>{error}</Text>
          ))}
        </View>
      ))}
      
      <TouchableOpacity 
        style={[styles.registerButton, isDarkMode ? styles.darkRegisterButton : styles.lightRegisterButton]}
        onPress={async () => {
          setErrors({});
          const result = await register({ name, email, password, password_confirmation });
          
          if (result.success) {
            Alert.alert('Success', 'Account created successfully!');
            navigation.navigate('Login');
          } else if (result.error?.data?.errors) {
            setErrors(result.error.data.errors);
          } else if (result.error?.message) {
            Alert.alert('Registration Failed', result.error.message);
          }
        }}
      >
        <Text style={styles.registerButtonText}>Create account</Text>
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
  registerButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  lightRegisterButton: { backgroundColor: '#007AFF' },
  darkRegisterButton: { backgroundColor: '#0A84FF' },
  registerButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  errorContainer: {
    marginBottom: 10,
    borderRadius: 4,
    padding: 8,
  },
  lightErrorContainer: {
    backgroundColor: '#FFEBEE',
  },
  darkErrorContainer: {
    backgroundColor: '#3F1F1F',
  },
  errorText: {
    fontSize: 14,
  },
  lightErrorText: {
    color: '#D32F2F',
  },
  darkErrorText: {
    color: '#FF6B6B',
  },
});

export default RegisterScreen;
