import React from 'react';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity, Image, Switch } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { AuthContext } from '../auth/AuthContext';
import { useThemeContext } from '../theme/ThemeContext';

// Get the API base URL from environment or use a default
const getApiBaseUrl = () => {
  // If we're in development, use the local IP that's working for other requests
  if (__DEV__) {
    return 'http://192.168.1.102:8000';
  }
  // In production, you might want to use a different URL
  return 'https://your-production-api.com';
};

// Create a config object for API URLs
const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  
  // Platform-specific configurations
  STORAGE_PATHS: [
    '/storage/',      // Standard path
    '/',              // Root path
    '/public/storage/' // Alternative path sometimes used
  ],
};

// Helper function to get the correct image URL format
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // For debugging
  console.log('[DrawerContent] Raw image path:', imagePath);
  
  // If the image is already a full URL or a UI Avatars URL, return it directly
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }
  
  // Clean up the path - remove any leading slashes or storage/ prefix
  const cleaned = String(imagePath).replace(/^\/+|^storage\//, '');
  
  // Construct the URL
  const finalUrl = `${API_CONFIG.BASE_URL}/storage/${cleaned}`;
  
  // For debugging
  console.log('[DrawerContent] Final image URL:', finalUrl);
  return finalUrl;
};

// Helper function to handle image loading with retries
const useImageWithFallback = (initialImagePath, userName) => {
  const [imageSource, setImageSource] = React.useState(null);
  const [imageError, setImageError] = React.useState(false);
  const retryCount = React.useRef(0);
  const maxRetries = API_CONFIG.STORAGE_PATHS.length;
  
  // Get user's first initial for fallback avatar
  const getInitial = React.useCallback(() => {
    if (!userName) return 'U';
    return (userName || 'U').charAt(0).toUpperCase();
  }, [userName]);
  
  // Reset and initialize image loading
  React.useEffect(() => {
    if (initialImagePath) {
      setImageError(false);
      retryCount.current = 0;
      setImageSource({ uri: getImageUrl(initialImagePath) });
    } else {
      setImageSource(null);
    }
  }, [initialImagePath]);
  
  const handleImageError = React.useCallback(() => {
    console.log(`[DrawerContent] Image loading error, retry: ${retryCount.current}/${maxRetries}`);
    
    if (retryCount.current < maxRetries && initialImagePath) {
      // Try with a different URL format from our path options
      const pathIndex = retryCount.current;
      retryCount.current += 1;
      
      const cleaned = String(initialImagePath).replace(/^\/+/, '');
      let retryUrl;
      
      if (pathIndex < API_CONFIG.STORAGE_PATHS.length) {
        // Try the next storage path format
        const storagePath = API_CONFIG.STORAGE_PATHS[pathIndex];
        retryUrl = `${API_CONFIG.BASE_URL}${storagePath}${cleaned}`;
        console.log(`[DrawerContent] Retrying with URL format ${pathIndex+1}/${maxRetries}: ${retryUrl}`);
        setImageSource({ uri: retryUrl });
      } else {
        // All path formats tried, use fallback
        useFallbackAvatar();
      }
    } else {
      // All retries failed, use fallback
      useFallbackAvatar();
    }
  }, [initialImagePath]);
  
  // Helper to use the fallback avatar service
  const useFallbackAvatar = React.useCallback(() => {
    setImageError(true);
    const initial = getInitial();
    const fallbackUrl = `https://ui-avatars.com/api/?name=${initial}&background=random&color=fff&size=100`;
    console.log('[DrawerContent] Using fallback avatar URL:', fallbackUrl);
    setImageSource({ uri: fallbackUrl });
  }, [getInitial]);
  
  return { imageSource, imageError, handleImageError };
};

const DrawerContent = (props) => {
  const { colors } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const { token, logout, user } = React.useContext(AuthContext);
  const { themeMode, isDarkMode, toggleTheme } = useThemeContext();
  
  // For debugging
  React.useEffect(() => {
    if (user) {
      console.log('[DrawerContent] User data:', JSON.stringify(user, null, 2));
    }
  }, [user]);
  
  // Get the image path from user data
  const imagePath = React.useMemo(() => {
    console.log('[DrawerContent] User data for avatar:', JSON.stringify({
      user_avatar: user?.avatar,
      user_detail_avatar: user?.user_detail?.avatar,
      userDetail_avatar: user?.userDetail?.avatar
    }, null, 2));
    return user?.avatar || user?.user_detail?.avatar || user?.userDetail?.avatar || null;
  }, [user]);
  
  // Get user name for fallback avatar
  const userName = React.useMemo(() => {
    return user?.name || user?.username || user?.email || 'User';
  }, [user]);
  
  // Use our custom hook for image handling with fallback
  const { imageSource, imageError, handleImageError } = useImageWithFallback(imagePath, userName);

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.card }]}>
          {imageSource && !imageError ? (
            <Image 
              source={imageSource} 
              style={styles.avatarImage}
              resizeMode="cover"
              onError={(e) => {
                console.log('[DrawerContent] Image loading error:', e.nativeEvent.error || 'Unknown error');
                handleImageError();
              }}
              onLoadStart={() => console.log('[DrawerContent] Image loading started')}
              onLoadEnd={() => console.log('[DrawerContent] Image loading finished')}
            />
          ) : (
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 24 }}>
              {(user?.name || user?.username || user?.email || 'U').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View>
          <Text style={[styles.brand, { color: colors.text }]}>
            {user?.name || user?.username || user?.email || 'User'}
          </Text>
          {/* <TouchableOpacity onPress={}>
            <Text style={{ color: colors.primary }}>{t('logout')}</Text>
          </TouchableOpacity> */}
        </View>
      </View>

      <View style={styles.items}>
        <DrawerItem
          icon={({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />}
          label={t('posts')}
          onPress={() => props.navigation.navigate('Home')}
        />
        <DrawerItem
          icon={({ color, size }) => <Ionicons name="trophy-outline" color={color} size={size} />}
          label={t('ranking')}
          onPress={() => props.navigation.navigate('Ranking')}
        />
        <DrawerItem
          icon={({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} />}
          label={t('polls')}
          onPress={() => props.navigation.navigate('Polls')}
        />
        <DrawerItem
          icon={({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />}
          label={t('activities')}
          onPress={() => props.navigation.navigate('Events')}
        />
        <DrawerItem
          icon={({ color, size }) => <Ionicons name="map-outline" color={color} size={size} />}
          label={t('map')}
          onPress={() => props.navigation.navigate('Map')}
        />
        <DrawerItem
          icon={({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} />}
          label={t('statistics')}
          onPress={() => props.navigation.navigate('Statistics')}
        />
        <DrawerItem
          icon={({ color, size }) => <Ionicons name="thumbs-up-outline" color={color} size={size} />}
          label={t('reactions_page.title')}
          onPress={() => props.navigation.navigate('ReactionTypes')}
        />
        <DrawerItem
          icon={({ color, size }) => <Ionicons name="information-circle-outline" color={color} size={size} />}
          label={t('about')}
          onPress={() => props.navigation.navigate('About')}
        />
        
        {/* Theme Toggle */}
        <View style={styles.themeContainer}>
          <View style={styles.themeTextContainer}>
            <Ionicons 
              name={isDarkMode ? "moon" : "sunny"} 
              size={22} 
              color={colors.text} 
              style={styles.themeIcon}
            />
            <Text style={[styles.themeText, { color: colors.text }]}>
              {isDarkMode ? t('dark_mode') || 'Dark Mode' : t('light_mode') || 'Light Mode'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.themeButton}
            onPress={toggleTheme}
          >
            <View style={[styles.themeIndicator, { backgroundColor: isDarkMode ? colors.primary : '#f1c40f' }]}>
              <Text style={styles.themeButtonText}>
                {themeMode === 'system' ? 'Auto' : (isDarkMode ? 'On' : 'Off')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {token ? (
          <DrawerItem
            icon={({ color, size }) => <Ionicons name="log-out-outline" color={color} size={size} />}
            label={t('logout')}
            onPress={logout}
          />
        ) : (
          <>
            <DrawerItem
              icon={({ color, size }) => <Ionicons name="log-in-outline" color={color} size={size} />}
              label="Login"
              onPress={() => props.navigation.navigate('Login')}
            />
            <DrawerItem
              icon={({ color, size }) => <Ionicons name="person-add-outline" color={color} size={size} />}
              label="Register"
              onPress={() => props.navigation.navigate('Register')}
            />
          </>
        )}
      </View>
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
  },
  items: {
    marginTop: 8,
  },
  themeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  themeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeIcon: {
    marginRight: 10,
  },
  themeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeButton: {
    padding: 4,
  },
  themeIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  themeButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default DrawerContent;
