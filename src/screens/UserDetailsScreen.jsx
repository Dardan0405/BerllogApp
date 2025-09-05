import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useI18n } from '../i18n';
import { useThemeContext } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { format } from 'date-fns';

// API configuration - same as in RankingScreen
const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://127.0.0.1:8000';
const API_CONFIG = {
  BASE_URL: RAW_BASE.replace(/\/$/, ''),
  STORAGE_PATHS: [
    '/storage/',
    '/',
    '/public/storage/'
  ],
};

// Helper function to get the correct image URL format (reusing from RankingScreen)
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

// Custom hook for image loading with fallback (reusing from RankingScreen)
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

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy');
  } catch (error) {
    return dateString;
  }
};

// Post item component
const PostItem = ({ post, colors, isDarkMode, t, navigation }) => {
  const { imageSource: beforeImageSource, handleImageError: handleBeforeImageError } = useImageWithFallback(
    post.images?.find(img => img.type === 'before')?.image_path,
    '',
    false
  );

  const { imageSource: afterImageSource, handleImageError: handleAfterImageError } = useImageWithFallback(
    post.images?.find(img => img.type === 'after')?.image_path,
    '',
    false
  );

  return (
    <TouchableOpacity 
      style={[styles.postCard, { 
        backgroundColor: isDarkMode ? colors.card : '#fff',
        shadowColor: isDarkMode ? '#000' : '#888',
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
        borderColor: isDarkMode ? colors.border : 'transparent',
      }]}
      onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
      activeOpacity={0.7}
    >
      <View style={styles.postImagesContainer}>
        {beforeImageSource && (
          <View style={styles.postImageWrapper}>
            <Image 
              source={beforeImageSource} 
              style={styles.postImage}
              onError={handleBeforeImageError}
            />
            <View style={styles.imageLabel}>
              <Text style={styles.imageLabelText}>{t('before')}</Text>
            </View>
          </View>
        )}
        {afterImageSource && (
          <View style={styles.postImageWrapper}>
            <Image 
              source={afterImageSource} 
              style={styles.postImage}
              onError={handleAfterImageError}
            />
            <View style={styles.imageLabel}>
              <Text style={styles.imageLabelText}>{t('after')}</Text>
            </View>
          </View>
        )}
      </View>
      <View style={styles.postMeta}>
        <Text style={[styles.postTitle, { color: colors.text }]} numberOfLines={1}>
          {post.description || t('untitled_post')}
        </Text>
        <Text style={[styles.postDate, { color: colors.text + '80' }]}>
          {formatDate(post.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const UserDetailsScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isDarkMode } = useThemeContext();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const { imageSource, handleImageError } = useImageWithFallback(
    profile?.avatar,
    profile?.name,
    true
  );

  // Fetch user profile data
  const fetchUserProfile = async () => {
    try {
      setError('');
      if (!refreshing) setLoading(true);
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/users/profiles/${userId}`);
      
      // Extract profile data
      const profileData = response.data?.user || response.data;
      setProfile(profileData);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setError(t('failed_to_load_profile'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchUserProfile();
  }, [userId]);
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
  };

  // Get full name from profile
  const getFullName = () => {
    if (!profile) return '';
    
    const firstName = profile.user_detail?.first_name || '';
    const lastName = profile.user_detail?.last_name || '';
    
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    return profile.name || t('anonymous');
  };

  // Get posts count
  const getPostsCount = () => {
    if (!profile || !profile.garbage_posts) return 0;
    return Array.isArray(profile.garbage_posts) ? profile.garbage_posts.length : 0;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with back button */}
      <View style={[styles.header, { 
        backgroundColor: isDarkMode ? colors.card : '#fff',
        borderBottomColor: isDarkMode ? colors.border : '#f0f0f0'
      }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('user_profile')}
        </Text>
      </View>
      
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
            onPress={() => fetchUserProfile()}
          >
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* User Profile Card */}
          <View style={[styles.profileCard, { 
            backgroundColor: isDarkMode ? colors.card : '#fff',
            shadowColor: isDarkMode ? '#000' : '#888',
            shadowOpacity: isDarkMode ? 0.3 : 0.1,
            borderColor: isDarkMode ? colors.border : 'transparent',
          }]}>
            <View style={styles.profileHeader}>
              <Image 
                source={imageSource} 
                style={styles.avatar}
                onError={handleImageError}
              />
              <View style={styles.profileInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {getFullName()}
                </Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {getPostsCount()}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.text + '80' }]}>
                      {getPostsCount() === 1 ? t('post_count') : t('posts_count')}
                    </Text>
                  </View>
                  {profile?.points && (
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {profile.points}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.text + '80' }]}>
                        {profile.points === 1 ? t('point') : t('points')}
                      </Text>
                    </View>
                  )}
                  {profile?.rank && (
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {profile.rank}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.text + '80' }]}>
                        {t('rank')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            
            {/* User Details */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>
                  {t('email')}:
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {profile?.email || '-'}
                </Text>
              </View>
              
              {profile?.user_detail?.date_of_birth && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>
                    {t('date_of_birth')}:
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(profile.user_detail.date_of_birth)}
                  </Text>
                </View>
              )}
              
              {profile?.user_detail?.address && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>
                    {t('address')}:
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {profile.user_detail.address}
                  </Text>
                </View>
              )}
              
              {profile?.created_at && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>
                    {t('joined')}:
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(profile.created_at)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          {/* User Posts Section */}
          <View style={styles.postsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('recent_submissions')}
              </Text>
              <Text style={[styles.postsCount, { color: colors.primary }]}>
                {getPostsCount()} {getPostsCount() === 1 ? t('post_count') : t('posts_count')}
              </Text>
            </View>
            
            {profile?.garbage_posts && profile.garbage_posts.length > 0 ? (
              <View style={styles.postsGrid}>
                {profile.garbage_posts.slice(0, 6).map((post) => (
                  <PostItem
                    key={post.id}
                    post={post}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    t={t}
                    navigation={navigation}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.emptyContainer, { borderColor: isDarkMode ? colors.border : '#f0f0f0' }]}>
                <Ionicons name="images-outline" size={48} color={colors.text + '50'} />
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  {t('no_posts_yet')}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 0.5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    marginRight: 24,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
  },
  detailsContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
  },
  postsSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  postsCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  postCard: {
    width: '48%',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0.5,
  },
  postImagesContainer: {
    height: 120,
    flexDirection: 'row',
  },
  postImageWrapper: {
    flex: 1,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderTopRightRadius: 8,
  },
  imageLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  postMeta: {
    padding: 8,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  postDate: {
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
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default UserDetailsScreen;
