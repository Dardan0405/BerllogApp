import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthContext } from '../auth/AuthContext';
import { useI18n } from '../i18n';
import { useThemeContext } from '../theme/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

const ProfileScreen = ({ navigation }) => {
  const { token, user: authUser, logout } = useAuthContext();
  const { t } = useI18n();
  const { isDarkMode } = useThemeContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    if (!token) {
      navigation.replace('Login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load profile');
      
      const u = data?.user || null;
      setUser(u);
      setName(u?.name || '');
      setEmail(u?.email || '');
      const ud = u?.userDetail || u?.user_detail || {};
      setAvatarUrl(ud?.image || u?.image || u?.avatar || '');
      setFirstName(ud?.first_name || '');
      setLastName(ud?.last_name || '');
      setDateOfBirth(ud?.date_of_birth ? ud.date_of_birth.slice(0, 10) : '');
      setAddress(ud?.address || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onPickAvatar = async () => {
    try {
      // Request permission first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access media library is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.[0]) return;
      
      const image = result.assets[0];
      console.log('Selected image:', {
        uri: image.uri,
        width: image.width,
        height: image.height,
        type: image.type,
        fileSize: image.fileSize
      });
      
      setAvatarFile(image);
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Image picker error:', err);
      setError(t('profile.photo_error') || 'Failed to pick image');
    }
  };

  const onSave = async () => {
    if (!token) {
      navigation.replace('Login');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Basic form validation
      if (!name?.trim()) {
        throw new Error(t('profile.name_required') || 'Name is required');
      }
      if (!email?.trim()) {
        throw new Error(t('profile.email_required') || 'Email is required');
      }

      const formData = new FormData();
      
      // Only append fields that have values
      if (name) formData.append('name', name.trim());
      if (email) formData.append('email', email.trim().toLowerCase());
      if (firstName) formData.append('first_name', firstName.trim());
      if (lastName) formData.append('last_name', lastName.trim());
      if (dateOfBirth) formData.append('date_of_birth', dateOfBirth);
      if (address) formData.append('address', address.trim());

      // Handle avatar upload if a new one was selected
      if (avatarFile?.uri) {
        const fileName = `avatar_${Date.now()}.jpg`;
        
        // Create the file object for upload
        const file = {
          uri: avatarFile.uri,
          type: 'image/jpeg',
          name: fileName
        };

        // Append the file to FormData with the correct field name
        formData.append('avatar', file);

        // Log upload details
        console.log('Uploading avatar:', {
          uri: file.uri,
          type: file.type,
          name: file.name
        });

        // Log all form data fields
        console.log('Form data fields:', formData._parts.map(([key]) => key).join(', '));
      }

      console.log('Sending request to:', `${process.env.EXPO_PUBLIC_API_BASE}/api/users/profile`);
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE}/api/users/profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      let responseData;
      try {
        const responseText = await response.text();
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        console.error('Server error:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
        
        let errorMessage = 'Update failed';
        if (responseData?.message) {
          errorMessage = responseData.message;
        } else if (responseData?.errors) {
          // Handle validation errors
          errorMessage = Object.entries(responseData.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
        } else if (response.status === 413) {
          errorMessage = 'File too large. Please select an image smaller than 2MB';
        }
        throw new Error(errorMessage);
      }

      setSuccess(t('profile.updated_success') || 'Profile updated successfully');
      setAvatarFile(null);
      fetchProfile(); // Refresh profile data
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.message || t('profile.update_error') || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
    },
    scrollContent: {
      padding: 16,
    },
    header: {
      marginBottom: 24,
      alignItems: 'center',
    },
    avatarContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: isDarkMode ? '#333' : '#e0e0e0',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      overflow: 'hidden',
    },
    avatar: {
      width: '100%',
      height: '100%',
    },
    avatarText: {
      fontSize: 40,
      color: isDarkMode ? '#fff' : '#333',
    },
    changePhotoButton: {
      backgroundColor: isDarkMode ? '#404040' : '#e0e0e0',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    changePhotoText: {
      color: isDarkMode ? '#fff' : '#333',
      marginLeft: 8,
    },
    section: {
      marginBottom: 24,
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      marginBottom: 8,
      color: isDarkMode ? '#fff' : '#333',
    },
    input: {
      backgroundColor: isDarkMode ? '#333' : '#fff',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: isDarkMode ? '#fff' : '#333',
      borderWidth: 1,
      borderColor: isDarkMode ? '#404040' : '#e0e0e0',
    },
    errorText: {
      color: '#ff4444',
      marginBottom: 16,
    },
    successText: {
      color: '#00C851',
      marginBottom: 16,
    },
    saveButton: {
      backgroundColor: '#2196F3',
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 24,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarContainer} onPress={onPickAvatar}>
            {avatarFile?.uri || avatarUrl ? (
              <Image
                source={{ uri: avatarFile?.uri || avatarUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>
                {(name || email || 'U').charAt(0).toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.changePhotoButton} onPress={onPickAvatar}>
            <MaterialIcons name="camera-alt" size={24} color={isDarkMode ? '#fff' : '#333'} />
            <Text style={styles.changePhotoText}>{t('profile.change_photo')}</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <View style={styles.section}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('profile.name')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('profile.name_placeholder')}
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('profile.email')}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t('profile.email_placeholder')}
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('profile.first_name')}</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('profile.first_name_placeholder')}
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('profile.last_name')}</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('profile.last_name_placeholder')}
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('profile.date_of_birth')}</Text>
            <TextInput
              style={styles.input}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('profile.address')}</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder={t('profile.address_placeholder')}
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? t('profile.saving') : t('profile.save_changes')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
