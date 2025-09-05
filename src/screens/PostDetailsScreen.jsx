import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useI18n } from '../i18n';
import { useThemeContext } from '../theme/ThemeContext';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API configuration (aligned with MapScreen)
const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://127.0.0.1:8000';
const API_CONFIG = {
  BASE_URL: RAW_BASE.replace(/\/$/, ''),
  STORAGE_PATHS: [
    '/storage/',
    '/',
    '/public/storage/'
  ],
};

// Helper function to get the correct image URL format
const getImageUrl = (imagePath, apiBase = API_CONFIG.BASE_URL, isUserAvatar = false) => {
  if (!imagePath) return null;
  
  // For debugging
  console.log('[PostDetails] Raw image path:', imagePath, isUserAvatar ? '(avatar)' : '');
  
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
    const userId = cleaned.replace('avatar/', '').split('/')[0];
    return `${apiBase}/storage/${cleaned}`;
  }
  
  // Handle garbage post images
  if (cleaned.startsWith('storage/garbage_post_images/')) {
    return `${apiBase}/${cleaned}`;
  } 
  if (cleaned.startsWith('garbage_post_images/')) {
    return `${apiBase}/storage/${cleaned}`;
  }
  
  // Default case
  return `${apiBase}/storage/${cleaned}`;
};

// Custom hook for image loading with fallback
const useImageWithFallback = (initialImagePath, userName, isUserAvatar = false) => {
  // Initialize with a safe fallback so <Image> never receives a null source on first render
  const initialChar = (userName || 'U').charAt(0).toUpperCase();
  const initialFallback = { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(initialChar)}&background=random&color=fff&size=100` };
  const [imageSource, setImageSource] = React.useState(() => {
    return initialImagePath
      ? { uri: getImageUrl(initialImagePath, API_CONFIG.BASE_URL, isUserAvatar) }
      : initialFallback;
  });
  const [imageError, setImageError] = React.useState(false);
  const retryCount = React.useRef(0);
  const maxRetries = API_CONFIG.STORAGE_PATHS.length;
  
  // Get user's first initial for fallback avatar
  const getInitial = React.useCallback(() => {
    if (!userName) return 'U';
    return (userName || 'U').charAt(0).toUpperCase();
  }, [userName]);
  
  // Define fallback setter before using it in effects/callbacks
  const useFallbackAvatar = React.useCallback(() => {
    setImageError(true);
    const initial = getInitial();
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=random&color=fff&size=100`;
    console.log('[PostDetails] Using fallback avatar:', fallbackUrl);
    setImageSource({ uri: fallbackUrl });
  }, [getInitial]);
  
  // Reset and initialize image loading
  React.useEffect(() => {
    if (initialImagePath) {
      setImageError(false);
      retryCount.current = 0;
      setImageSource({ uri: getImageUrl(initialImagePath, API_CONFIG.BASE_URL, isUserAvatar) });
    } else {
      // No image path provided — use a safe fallback immediately
      useFallbackAvatar();
    }
  }, [initialImagePath, isUserAvatar, useFallbackAvatar]);
  
  const handleImageError = React.useCallback(() => {
    console.log(`[PostDetails] Image loading error, retry: ${retryCount.current}/${maxRetries}`);
    
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
        
        console.log(`[PostDetails] Retrying with URL format ${pathIndex+1}/${maxRetries}: ${retryUrl}`);
        setImageSource({ uri: retryUrl });
      } else {
        useFallbackAvatar();
      }
    } else {
      useFallbackAvatar();
    }
  }, [initialImagePath, maxRetries, isUserAvatar, useFallbackAvatar]);
 
  return { imageSource, imageError, handleImageError };
};

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const PostDetailsScreen = ({ route, navigation }) => {
  const postId = route?.params?.postId ?? route?.params?.id ?? null;
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isDarkMode } = useThemeContext();
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState(null);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  
  // Load token from AsyncStorage
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        setToken(storedToken);
      } catch (err) {
        console.error('Failed to load auth token', err);
      }
    };
    loadToken();
  }, []);
  
  // Fetch post details
  const fetchPostDetails = useCallback(async () => {
    // Guard: if no postId provided, do not attempt to fetch
    if (!postId) {
      console.warn('PostDetailsScreen: No postId provided');
      setPost(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Validate postId format
    const normalizedId = String(postId).trim();
    if (!normalizedId || normalizedId === 'undefined' || normalizedId === 'null') {
      console.warn('PostDetailsScreen: Invalid postId format:', postId);
      setPost(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setLoading(true);
    try {
      console.log('PostDetailsScreen: Fetching post with ID:', normalizedId);
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/garbage-posts/${normalizedId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 10000 // 10 second timeout
      });
      
      // Extract post data from response with better error handling
      const postData = res.data?.garbagePost || res.data?.data || res.data;
      
      if (!postData || !postData.id) {
        console.error('PostDetailsScreen: Invalid post data received:', res.data);
        setPost(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      console.log('PostDetailsScreen: Post details fetched successfully:', postData.id);
      setPost(postData);
      
      // Check if post is favorited
      if (token) {
        try {
          const favRes = await axios.get(`${API_CONFIG.BASE_URL}/api/users/favorite-posts`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const favorites = favRes.data?.favoritePosts || 
                           favRes.data?.favorites || 
                           favRes.data?.data || 
                           favRes.data?.favorite_posts || 
                           favRes.data?.favorite_posts?.data || 
                           [];
          
          const isFav = favorites.some(fav => {
            const favId = fav?.garbage_post_id ?? fav?.post_id ?? fav?.garbage_post?.id ?? fav?.post?.id;
            return String(favId) === String(postId);
          });
          
          setIsFavorited(isFav);
        } catch (err) {
          console.error('Failed to check favorite status', err);
        }
      }
    } catch (err) {
      console.error('PostDetailsScreen: Failed to fetch post details', err);
      // Set post to null on error to show error state
      setPost(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId, token]);
  
  useEffect(() => {
    fetchPostDetails();
  }, [fetchPostDetails]);
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchPostDetails();
  };
  
  // Submit comment
  const submitComment = async () => {
    if (!token || !comment.trim()) return;
    
    setSubmittingComment(true);
    try {
      await axios.post(
        `${API_CONFIG.BASE_URL}/api/comments`,
        {
          content: comment,
          commentable_id: postId,
          commentable_type: 'App\\Models\\GarbagePost'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Clear comment and refresh post to show new comment
      setComment('');
      fetchPostDetails();
    } catch (err) {
      console.error('Failed to submit comment', err);
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // Toggle favorite
  const toggleFavorite = async () => {
    if (!token || favoriting) return;
    
    setFavoriting(true);
    try {
      if (isFavorited) {
        // Remove favorite
        await axios.delete(`${API_CONFIG.BASE_URL}/api/users/favorite-posts`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: { garbage_post_id: postId }
        });
      } else {
        // Add favorite
        await axios.post(
          `${API_CONFIG.BASE_URL}/api/users/favorite-posts`,
          { garbage_post_id: postId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      // Update local state
      setIsFavorited(!isFavorited);
    } catch (err) {
      console.error('Toggle favorite failed', err);
    } finally {
      setFavoriting(false);
    }
  };
  
  // Share post
  const sharePost = async () => {
    try {
      await Share.share({
        message: `${t('check_out_post')}: ${post.title || post.description || t('interesting_post')}`,
        url: `${API_CONFIG.BASE_URL}/posts/${postId}`
      });
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  // Set up image hooks with default values first to maintain hook order
  const [authorAvatarSource, setAuthorAvatarSource] = useState({ uri: '' });
  const [beforeSource, setBeforeSource] = useState({ uri: '' });
  const [afterSource, setAfterSource] = useState({ uri: '' });
  const [handleAuthorAvatarError, setHandleAuthorAvatarError] = useState(() => () => {});
  const [handleBeforeError, setHandleBeforeError] = useState(() => () => {});
  const [handleAfterError, setHandleAfterError] = useState(() => () => {});

  // Initialize image hooks when post data is available
  useEffect(() => {
    if (post) {
      // Set up author avatar
      const { imageSource: authorSource, handleImageError: authorErrorHandler } = useImageWithFallback(
        post.user?.avatar,
        post.user?.name,
        true
      );
      setAuthorAvatarSource(authorSource);
      setHandleAuthorAvatarError(() => authorErrorHandler);

      // Set up before/after images
      const beforeImage = post.images?.find(img => img.type === 'before')?.image_path || null;
      const afterImage = post.images?.find(img => img.type === 'after')?.image_path || null;
      const beforeUrl = beforeImage ? getImageUrl(beforeImage) : null;
      const afterUrl = afterImage ? getImageUrl(afterImage) : null;

      const { imageSource: beforeImgSource, handleImageError: beforeErrorHandler } = useImageWithFallback(beforeUrl, 'B');
      const { imageSource: afterImgSource, handleImageError: afterErrorHandler } = useImageWithFallback(afterUrl, 'A');
      
      setBeforeSource(beforeImgSource);
      setAfterSource(afterImgSource);
      setHandleBeforeError(() => beforeErrorHandler);
      setHandleAfterError(() => afterErrorHandler);
    }
  }, [post]);

  // Comment item component moved outside to fix Rules of Hooks violation

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>{t('loading')}</Text>
        </View>
      </View>
    );
  }
  
  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.text} />
          <Text style={[styles.errorText, { color: colors.text }]}>{t('post_not_found')}</Text>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>{t('go_back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
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
        {/* Post Header */}
        <View style={[styles.postCard, { 
          backgroundColor: colors.card,
          shadowColor: isDarkMode ? '#000' : '#888',
          shadowOpacity: isDarkMode ? 0.4 : 0.2,
          borderColor: isDarkMode ? colors.border : 'transparent'
        }]}>
          <View style={styles.postHeader}>
            <View style={styles.postAuthor}>
              <Image
                source={authorAvatarSource}
                style={styles.authorAvatar}
                onError={handleAuthorAvatarError}
              />
              <View>
                <Text style={[styles.authorName, { color: colors.text }]}>
                  {post.user?.name || t('anonymous')}
                </Text>
                <Text style={[styles.postTime, { color: colors.text + '80' }]}>
                  {formatDate(post.created_at)}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Post Content */}
          <View style={styles.postContent}>
            {post.title && (
              <Text style={[styles.postTitle, { color: colors.text }]}>
                {post.title}
              </Text>
            )}
            
            <Text style={[styles.postDescription, { color: colors.text }]}>
              {post.description || ''}
            </Text>
            
            {/* Before/After Images */}
            {(beforeUrl || afterUrl) && (
              <View style={styles.imagesContainer}>
                {beforeUrl && (
                  <View style={styles.imageWrapper}>
                    <Image
                      source={beforeSource}
                      style={styles.postImage}
                      resizeMode="cover"
                      onError={handleBeforeError}
                    />
                    <View style={[styles.imageLabel, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                      <Text style={styles.imageLabelText}>{t('before')}</Text>
                    </View>
                  </View>
                )}
                
                {afterUrl && (
                  <View style={styles.imageWrapper}>
                    <Image
                      source={afterSource}
                      style={styles.postImage}
                      resizeMode="cover"
                      onError={handleAfterError}
                    />
                    <View style={[styles.imageLabel, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                      <Text style={styles.imageLabelText}>{t('after')}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
            
            {/* Post Metadata */}
            <View style={styles.metadataContainer}>
              <View style={styles.metadataItem}>
                <Ionicons name="location-outline" size={16} color={colors.text} />
                <Text style={[styles.metadataText, { color: colors.text }]}>
                  {post.street_id ? `Street ID: ${post.street_id}` : t('location_unavailable')}
                </Text>
              </View>
              
              <View style={styles.metadataItem}>
                <Ionicons name="calendar-outline" size={16} color={colors.text} />
                <Text style={[styles.metadataText, { color: colors.text }]}>
                  {formatDate(post.date)}
                </Text>
              </View>
              
              <View style={styles.metadataItem}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.text} />
                <Text style={[styles.metadataText, { color: colors.text }]}>
                  {t('status')}: {post.verification_status}
                </Text>
              </View>
            </View>
            
            {/* Post Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={toggleFavorite}
                disabled={favoriting || !token}
              >
                <Ionicons
                  name={isFavorited ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isFavorited ? '#e74c3c' : colors.text}
                />
                <Text style={[styles.actionText, { color: colors.text }]}>
                  {t('favorite')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={sharePost}
              >
                <Ionicons name="share-social-outline" size={24} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>
                  {t('share')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Comments Section */}
        <View style={[styles.commentsCard, { 
          backgroundColor: colors.card,
          shadowColor: isDarkMode ? '#000' : '#888',
          shadowOpacity: isDarkMode ? 0.4 : 0.2,
          borderColor: isDarkMode ? colors.border : 'transparent'
        }]}>
          <Text style={[styles.commentsTitle, { color: colors.text }]}>
            {t('comments')} ({post.comments?.length || 0})
          </Text>
          
          {post.comments && post.comments.length > 0 ? (
            post.comments.map((comment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                colors={colors}
                t={t}
                formatDate={formatDate}
              />
            ))
          ) : (
            <View style={styles.noCommentsContainer}>
              <Ionicons name="chatbubble-outline" size={32} color={colors.text + '50'} />
              <Text style={[styles.noCommentsText, { color: colors.text }]}>
                {t('no_comments')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Comment Input */}
      {token && (
        <View style={[styles.commentInputContainer, { 
          backgroundColor: colors.card,
          borderTopColor: colors.border
        }]}>
          <TextInput
            style={[styles.commentInput, { 
              color: colors.text,
              backgroundColor: isDarkMode ? colors.background : '#f0f0f0'
            }]}
            placeholder={t('write_comment')}
            placeholderTextColor={colors.text + '80'}
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, { 
              backgroundColor: colors.primary,
              opacity: comment.trim() && !submittingComment ? 1 : 0.5
            }]}
            onPress={submitComment}
            disabled={!comment.trim() || submittingComment}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

// CommentItem component moved outside to fix Rules of Hooks violation
const CommentItem = React.memo(({ comment, colors, t, formatDate }) => {
  const { imageSource: commentAvatarSource, handleImageError: handleCommentAvatarError } = 
    useImageWithFallback(comment.user?.avatar, comment.user?.name, true);
  
  return (
    <View style={[styles.commentItem, { marginBottom: 16 }]}>
      <Image
        source={commentAvatarSource}
        style={styles.commentAvatar}
        onError={handleCommentAvatarError}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentAuthorName, { color: colors.text }]}>
            {comment.user?.name || t('anonymous')}
          </Text>
          <Text style={[styles.commentPostTime, { color: colors.text + '80' }]}>
            {formatDate(comment.created_at)}
          </Text>
        </View>
        <Text style={[styles.commentText, { color: colors.text, fontSize: 14, lineHeight: 20 }]}>
          {comment.content}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  postCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 0.5,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  authorName: {
    fontWeight: '600',
    fontSize: 16,
  },
  postTime: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  postContent: {
    marginBottom: 8,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  postDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  imagesContainer: {
    marginBottom: 16,
  },
  imageWrapper: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 240,
    borderRadius: 8,
  },
  imageLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  imageLabelText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  metadataContainer: {
    marginBottom: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataText: {
    marginLeft: 8,
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  commentsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 80,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 0.5,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentAuthorName: {
    fontWeight: '600',
    fontSize: 15,
    marginRight: 8,
  },
  commentPostTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  noCommentsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noCommentsText: {
    marginTop: 8,
    fontSize: 14,
  },
  commentInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default PostDetailsScreen;
