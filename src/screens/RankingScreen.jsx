import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useI18n } from '../i18n';
import { useThemeContext } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

// API configuration
const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://127.0.0.1:8000';
const API_CONFIG = {
  BASE_URL: RAW_BASE.replace(/\/$/, ''),
  STORAGE_PATHS: [
    '/storage/',
    '/',
    '/public/storage/'
  ],
};

// Helper function to get the correct image URL format (same as PostDetailsScreen)
const getImageUrl = (imagePath, apiBase = API_CONFIG.BASE_URL, isUserAvatar = false) => {
  if (!imagePath) return null;
  
  // If the image is already a full URL, return it directly
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }
  
  // Clean up the path
  const cleaned = String(imagePath).replace(/^\/+/g, '');
  
  // Special handling for user avatars
  if (isUserAvatar || cleaned.startsWith('avatar/')) {
    // If it's a user ID or simple filename without path
    if (!cleaned.includes('/')) {
      return `${apiBase}/api/users/${cleaned}/avatar`;
    }
    // If it's an avatar path
    return `${apiBase}/storage/${cleaned}`;
  }
  
  // Default case
  return `${apiBase}/storage/${cleaned}`;
};

// Custom hook for image loading with fallback (same as PostDetailsScreen)
const useImageWithFallback = (initialImagePath, userName, isUserAvatar = false) => {
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
      setImageSource({ uri: getImageUrl(initialImagePath, API_CONFIG.BASE_URL, isUserAvatar) });
    } else {
      setImageSource(null);
    }
  }, [initialImagePath, isUserAvatar]);
  
  const handleImageError = React.useCallback(() => {
    if (retryCount.current < maxRetries && initialImagePath) {
      // Try with a different URL format from our path options
      const pathIndex = retryCount.current;
      retryCount.current += 1;
      
      const cleaned = String(initialImagePath).replace(/^\/+/g, '');
      let retryUrl;
      
      if (pathIndex < API_CONFIG.STORAGE_PATHS.length) {
        // Try the next storage path format
        const storagePath = API_CONFIG.STORAGE_PATHS[pathIndex];
        
        if (isUserAvatar) {
          // For avatars, try different URL patterns
          if (pathIndex === 0) {
            retryUrl = `${API_CONFIG.BASE_URL}/storage/avatar/${cleaned.replace('avatar/', '')}`;
          } else if (pathIndex === 1) {
            retryUrl = `${API_CONFIG.BASE_URL}/api/users/${cleaned.replace('avatar/', '').split('/')[0]}/avatar`;
          } else {
            retryUrl = `${API_CONFIG.BASE_URL}${storagePath}${cleaned}`;
          }
        } else {
          retryUrl = `${API_CONFIG.BASE_URL}${storagePath}${cleaned}`;
        }
        
        setImageSource({ uri: retryUrl });
      } else {
        useFallbackAvatar();
      }
    } else {
      useFallbackAvatar();
    }
  }, [initialImagePath, maxRetries, isUserAvatar]);
  
  const useFallbackAvatar = React.useCallback(() => {
    setImageError(true);
    const initial = getInitial();
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=random&color=fff&size=100`;
    setImageSource({ uri: fallbackUrl });
  }, [getInitial]);

  return { imageSource, imageError, handleImageError };
};

// Helper: convert 1 -> 1st, 2 -> 2nd, 3 -> 3rd, etc
function toOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${(s[(v - 20) % 10] || s[v] || s[0])}`;
}

// User row component
const UserRankRow = ({ item, index, colors, isDarkMode, onUserPress, t }) => {
  const { imageSource, handleImageError } = useImageWithFallback(
    item.avatar,
    item.name,
    true
  );

  // Determine if this is a top 3 position
  const isTopThree = index < 3;
  const position = index + 1;
  
  // Trophy colors for top 3
  const trophyColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  
  return (
    <TouchableOpacity 
      style={[styles.rankRow, { 
        backgroundColor: isDarkMode ? colors.card : '#fff',
        shadowColor: isDarkMode ? '#000' : '#888',
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
        borderColor: isDarkMode ? colors.border : 'transparent',
        marginBottom: 12
      }]}
      onPress={() => onUserPress(item)}
      activeOpacity={0.7}
    >
      {/* Position indicator */}
      <View style={[styles.positionContainer, {
        backgroundColor: isTopThree ? trophyColors[index] : isDarkMode ? colors.border : '#f0f0f0'
      }]}>
        <Text style={[styles.positionText, {
          color: isTopThree ? '#000' : colors.text
        }]}>{position}</Text>
      </View>
      
      {/* User info */}
      <View style={styles.userInfoContainer}>
        <Image 
          source={imageSource} 
          style={styles.avatar}
          onError={handleImageError}
        />
        <View style={styles.nameContainer}>
          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
            {item.name || t('anonymous')}
          </Text>
          <Text style={[styles.userRank, { color: colors.text + '80' }]}>
            {toOrdinal(position)}
          </Text>
        </View>
      </View>
      
      {/* Points */}
      <View style={styles.pointsContainer}>
        <Text style={[styles.pointsValue, { color: colors.text }]}>
          {item.total_points || '0'}
        </Text>
        <Text style={[styles.pointsLabel, { color: colors.text + '80' }]}>
          {item.total_points === 1 ? t('point') : t('points')}
        </Text>
      </View>
      
      {/* Posts count */}
      <View style={styles.postsContainer}>
        <Text style={[styles.postsValue, { color: colors.text }]}>
          {item.post_count || '0'}
        </Text>
        <Text style={[styles.postsLabel, { color: colors.text + '80' }]}>
          {item.post_count === 1 ? t('post_count') : t('posts_count')}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const RankingScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isDarkMode } = useThemeContext();
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation values for tab indicator
  const tabIndicatorPosition = useState(new Animated.Value(0))[0];
  const { width } = Dimensions.get('window');
  const tabWidth = width / 4; // 4 tabs
  
  // Fetch leaderboard data
  const fetchLeaderboard = async (selectedIndex = activeIndex) => {
    try {
      setError('');
      if (!refreshing) setLoading(true);
      
      const ranges = ['last24h', 'last_week', 'last_30_days', 'all_time'];
      const range = ranges[selectedIndex] || 'all_time';
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/users/leaderboard?range=${range}`);
      
      // Extract leaderboard data
      const leaderboardData = response.data?.leaderboard || [];
      setData(leaderboardData);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError(t('failed_to_load'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchLeaderboard();
  }, []);
  
  // Handle tab change
  const handleTabChange = (index) => {
    setActiveIndex(index);
    
    // Animate tab indicator
    Animated.spring(tabIndicatorPosition, {
      toValue: index * tabWidth,
      useNativeDriver: false,
      friction: 8,
      tension: 70
    }).start();
    
    // Fetch data for selected tab
    fetchLeaderboard(index);
  };
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };
  
  // Handle user press
  const handleUserPress = (user) => {
    // Navigate to user details screen within the same stack navigator
    navigation.navigate('UserDetails', { userId: user.id });
  };
  
  // Localized timeframe labels
  const timeframes = [
    t('24h'),
    t('last_week'),
    t('last_30_days'),
    t('all_time'),
  ];
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: isDarkMode ? colors.card : '#fff',
        borderBottomColor: isDarkMode ? colors.border : '#f0f0f0'
      }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('ranking')}
          {data.length > 0 && (
            <Text style={[styles.countChip, { color: colors.primary }]}> ({data.length})</Text>
          )}
        </Text>
      </View>
      
      {/* Tab Menu */}
      <View style={[styles.tabContainer, { 
        backgroundColor: isDarkMode ? colors.card : '#fff',
        borderBottomColor: isDarkMode ? colors.border : '#f0f0f0'
      }]}>
        {timeframes.map((label, index) => (
          <TouchableOpacity
            key={index}
            style={styles.tabButton}
            onPress={() => handleTabChange(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: index === activeIndex }}
          >
            <Text style={[styles.tabText, { 
              color: index === activeIndex ? colors.primary : colors.text + '80',
              fontWeight: index === activeIndex ? '600' : '400'
            }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Animated Tab Indicator */}
        <Animated.View 
          style={[styles.tabIndicator, { 
            backgroundColor: colors.primary,
            width: tabWidth,
            transform: [{ translateX: tabIndicatorPosition }]
          }]} 
        />
      </View>
      
      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>{t('loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.text} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => fetchLeaderboard()}
          >
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id || Math.random())}
          renderItem={({ item, index }) => (
            <UserRankRow 
              item={item} 
              index={index} 
              colors={colors} 
              isDarkMode={isDarkMode}
              onUserPress={handleUserPress}
              t={t}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={64} color={colors.text + '50'} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                {t('no_rankings')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  countChip: {
    fontSize: 18,
    fontWeight: '400',
  },
  tabContainer: {
    flexDirection: 'row',
    height: 48,
    borderBottomWidth: 1,
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 0.5,
  },
  positionContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  positionText: {
    fontWeight: '700',
    fontSize: 14,
  },
  userInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  nameContainer: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    fontSize: 16,
  },
  userRank: {
    fontSize: 12,
    marginTop: 2,
  },
  pointsContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  pointsValue: {
    fontWeight: '700',
    fontSize: 16,
  },
  pointsLabel: {
    fontSize: 12,
  },
  postsContainer: {
    alignItems: 'center',
    width: 50,
  },
  postsValue: {
    fontWeight: '600',
    fontSize: 16,
  },
  postsLabel: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default RankingScreen;
