import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  ActivityIndicator, RefreshControl, SafeAreaView, FlatList,
  Share
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useI18n } from '../i18n';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeContext } from '../theme/ThemeContext';

// API configuration similar to DrawerContent
const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.0.101:8000';
const API_CONFIG = {
  BASE_URL: RAW_BASE.replace(/\/$/, ''),
  STORAGE_PATHS: [
    '/storage/',
    '/',
    '/public/storage/'
  ],
};

// Utility functions
const getTimeAgo = (posted) => {
  if (!posted) return '';
  // Try to parse ISO or date-like strings
  const d = new Date(posted);
  if (!isNaN(d.getTime())) {
    const now = Date.now();
    const diffMs = Math.max(0, now - d.getTime());
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) {
      const m = Math.max(1, minutes);
      return `${m} minute${m === 1 ? '' : 's'}`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours === 1 ? '' : 's'}`;
    }
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  // Fallback: handle strings like '3 minutes', '2 hours', '1 day', or localized variants
  if (typeof posted === 'string') {
    const txt = posted.trim().toLowerCase();
    const mm = txt.match(/(\d+)\s*(minute|minutes|min|minuta|minut)/);
    const hh = txt.match(/(\d+)\s*(hour|hours|hr|ore|ora)/);
    const dd = txt.match(/(\d+)\s*(day|days|dita|dite)/);
    if (mm) {
      const m = parseInt(mm[1], 10) || 1;
      return `${m} minute${m === 1 ? '' : 's'}`;
    }
    if (hh) {
      const h = parseInt(hh[1], 10) || 1;
      return `${h} hour${h === 1 ? '' : 's'}`;
    }
    if (dd) {
      const dNum = parseInt(dd[1], 10) || 1;
      return `${dNum} day${dNum === 1 ? '' : 's'}`;
    }
  }
  return String(posted || '');
};

// Helper function to get the correct image URL format
const getImageUrl = (imagePath, apiBase = API_CONFIG.BASE_URL) => {
  if (!imagePath) return null;
  
  // For debugging
  console.log('[HomeScreen] Raw image path:', imagePath);
  
  // If the image is already a full URL, return it directly
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }
  
  // Clean up the path
  const cleaned = String(imagePath).replace(/^\/+/, '');
  
  // Construct the URL based on the path format
  let finalUrl;
  
  // Handle specific paths for garbage post images
  if (cleaned.startsWith('storage/garbage_post_images/')) {
    finalUrl = `${apiBase}/${cleaned}`;
  } else if (cleaned.startsWith('garbage_post_images/')) {
    finalUrl = `${apiBase}/storage/${cleaned}`;
  } else if (cleaned.startsWith('avatar/')) {
    finalUrl = `${apiBase}/storage/${cleaned}`;
  } else if (!cleaned.includes('/')) {
    finalUrl = `${apiBase}/storage/avatar/${cleaned}`;
  } else {
    finalUrl = `${apiBase}/${cleaned}`;
  }
  
  // For debugging
  console.log('[HomeScreen] Final image URL:', finalUrl);
  return finalUrl;
};

// Custom hook for image loading with fallback
const useImageWithFallback = (initialUrl, userInitial = 'U') => {
  const [imageSource, setImageSource] = useState({ uri: initialUrl });
  const [imageError, setImageError] = useState(false);

  const getInitial = useCallback(() => {
    return userInitial || 'U';
  }, [userInitial]);

  const handleImageError = useCallback(() => {
    if (imageError) {
      // Already tried fallback, use UI Avatars
      useFallbackAvatar();
      return;
    }

    // Try alternative storage paths
    if (initialUrl) {
      const originalUrl = initialUrl;
      for (const path of API_CONFIG.STORAGE_PATHS) {
        if (originalUrl.includes(path)) continue; // Skip the current path
        
        // Try an alternative path
        const filename = originalUrl.split('/').pop();
        if (filename) {
          const alternativeUrl = `${API_CONFIG.BASE_URL}${path}${filename}`;
          setImageSource({ uri: alternativeUrl });
          return;
        }
      }
    }
    
    // If all paths failed, use fallback avatar
    useFallbackAvatar();
  }, [imageError, initialUrl, getInitial]);

  const useFallbackAvatar = useCallback(() => {
    setImageError(true);
    const initial = getInitial();
    const fallbackUrl = `https://ui-avatars.com/api/?name=${initial}&background=random&color=fff&size=100`;
    setImageSource({ uri: fallbackUrl });
  }, [getInitial]);

  return { imageSource, imageError, handleImageError };
};

// Posts Component
const Posts = ({ colors, t, refreshing, onRefresh, navigation }) => {
  const { isDarkMode } = useThemeContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [favoritedByPost, setFavoritedByPost] = useState({});
  const [favoriting, setFavoriting] = useState({});
  const [reactionTypeByPost, setReactionTypeByPost] = useState({});
  const [reactionFlashByPost, setReactionFlashByPost] = useState({});
  
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
  
  // Fetch initial favorites so hearts reflect backend state
  const fetchFavorites = useCallback(async () => {
    if (!token) {
      setFavoritedByPost({});
      return;
    }
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/users/favorite-posts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = res?.data;
      const candidates = [
        payload?.favoritePosts,
        payload?.favorites,
        payload?.data,
        payload?.favorite_posts,
        payload?.favorite_posts?.data,
      ];
      const list = candidates.find((x) => Array.isArray(x)) || [];
      const map = {};
      for (const item of list) {
        const pid =
          item?.garbage_post_id ??
          item?.post_id ??
          item?.garbage_post?.id ??
          item?.post?.id ??
          null;
        if (pid != null) map[String(pid)] = true;
      }
      setFavoritedByPost(map);
    } catch (err) {
      console.error('Failed to fetch favorites', err);
    }
  }, [token]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);
  
  // Load posts from API
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/garbage-posts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      // Normalize the data structure based on the actual API response
      // The API returns { garbagePosts: { data: [...posts] } }
      const postsData = res.data?.garbagePosts?.data || [];
      console.log('Posts fetched:', postsData.length);
      setPosts(postsData);
    } catch (err) {
      console.error('Failed to fetch posts', err);
    } finally {
      setLoading(false);
    }
  }, [token]);
  
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);
  
  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    fetchPosts();
  }, [fetchPosts]);
  
  // Toggle favorite
  const toggleFavorite = async (postId) => {
    if (!token) {
      // Show message that user needs to log in
      return;
    }
    
    if (favoriting[postId]) return;
    
    const isFav = !!favoritedByPost[String(postId)];
    try {
      setFavoriting((p) => ({ ...p, [postId]: true }));
      
      if (isFav) {
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
      setFavoritedByPost(prev => ({
        ...prev,
        [postId]: !isFav
      }));
      
    } catch (err) {
      console.error('Toggle favorite failed', err);
    } finally {
      setFavoriting((p) => ({ ...p, [postId]: false }));
    }
  };
  
  // Toggle upvote/downvote
  const toggleReaction = async (postId, reactionType) => {
    if (!token) return;
    
    const currentReaction = reactionTypeByPost[postId];
    
    // If same reaction, remove it
    if (currentReaction === reactionType) {
      setReactionTypeByPost(prev => {
        const next = {...prev};
        delete next[postId];
        return next;
      });
    } else {
      // Otherwise set new reaction
      setReactionTypeByPost(prev => ({
        ...prev,
        [postId]: reactionType
      }));
    }
    
    // Show feedback message
    setReactionFlashByPost((p) => ({ ...p, [postId]: { text: 'Reaction saved', type: 'success' } }));
    setTimeout(() => {
      setReactionFlashByPost((p) => {
        const next = { ...p };
        delete next[postId];
        return next;
      });
    }, 1500);
  };
  
  // Share post
  const sharePost = async (post) => {
    try {
      await Share.share({
        message: `Check out this post: ${post.title || 'Interesting post'}`,
        url: `${API_CONFIG.BASE_URL}/posts/${post.id}`
      });
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  // Post item component (valid place to use hooks)
  const PostItem = ({
    post,
    colors,
    t,
    isFavorited,
    isUpvoted,
    isDownvoted,
    flashMessage,
    toggleReaction,
    toggleFavorite,
    sharePost,
    navigation,
  }) => {
    const postId = post.id;
    const { isDarkMode } = useThemeContext();
    const avatarUrl = post.user?.avatar ? getImageUrl(post.user.avatar) : null;
    const { imageSource, handleImageError } = useImageWithFallback(
      avatarUrl,
      post.user?.name?.charAt(0) || 'U'
    );

    // Resolve potential Before/After images from post.images with robust fallbacks
    const imagesArr = Array.isArray(post.images) ? post.images : [];
    const resolvedPaths = imagesArr.map((img) => img?.image_path || img?.path || img?.url || img);

    let beforePath = null;
    let afterPath = null;
    for (const p of resolvedPaths) {
      const s = String(p || '').toLowerCase();
      if (!beforePath && s.includes('before')) beforePath = p;
      if (!afterPath && s.includes('after')) afterPath = p;
    }
    if (!beforePath && resolvedPaths[0]) beforePath = resolvedPaths[0];
    if (!afterPath && resolvedPaths[1]) afterPath = resolvedPaths[1];

    const beforeUrl = beforePath ? getImageUrl(beforePath) : null;
    const afterUrl = afterPath ? getImageUrl(afterPath) : null;

    // Use the same fallback/retry logic as DrawerContent via our hook
    const {
      imageSource: beforeSource,
      handleImageError: handleBeforeError,
    } = useImageWithFallback(beforeUrl, 'B');
    const {
      imageSource: afterSource,
      handleImageError: handleAfterError,
    } = useImageWithFallback(afterUrl, 'A');

    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
      >
        <View style={[styles.postCard, { 
          backgroundColor: colors.card,
          shadowColor: isDarkMode ? '#000' : '#888',
          shadowOpacity: isDarkMode ? 0.4 : 0.2,
          borderColor: isDarkMode ? colors.border : 'transparent'
        }]}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.postAuthor}>
            <Image
              source={imageSource}
              style={styles.authorAvatar}
              onError={handleImageError}
            />
            <View>
              <Text style={[styles.authorName, { color: colors.text }]}>
                {post.user?.name || t('anonymous')}
              </Text>
              <Text style={[styles.postTime, { color: colors.text + '80' }]}>
                {getTimeAgo(post.created_at)}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Post Content */}
        <View style={styles.postContent}>
          {post.title && (
            <Text style={[styles.postTitle, { color: colors.text }]}>
              {post.title}
            </Text>
          )}

          <Text style={[styles.postText, { color: colors.text }]}>
            {post.content || post.description || ''}
          </Text>

          {(beforeUrl || afterUrl) && (
            <View style={styles.beforeAfterRow}>
              {beforeUrl && (
                <View style={styles.beforeAfterImageWrapper}>
                  <Image
                    source={beforeSource}
                    style={styles.beforeAfterImage}
                    resizeMode="cover"
                    onError={handleBeforeError}
                  />
                  <Text style={styles.beforeAfterLabel}>{t('before') || 'Before'}</Text>
                </View>
              )}
              {afterUrl && (
                <View style={styles.beforeAfterImageWrapper}>
                  <Image
                    source={afterSource}
                    style={styles.beforeAfterImage}
                    resizeMode="cover"
                    onError={handleAfterError}
                  />
                  <Text style={styles.beforeAfterLabel}>{t('after') || 'After'}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Post Actions */}
        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleReaction(postId, 1)}
          >
            <Ionicons
              name={isUpvoted ? 'thumbs-up' : 'thumbs-up-outline'}
              size={22}
              color={isUpvoted ? colors.primary : colors.text}
            />
            <Text style={[styles.actionText, { color: colors.text }]}>
              {post.positive_reactions_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleReaction(postId, 2)}
          >
            <Ionicons
              name={isDownvoted ? 'thumbs-down' : 'thumbs-down-outline'}
              size={22}
              color={isDownvoted ? colors.notification : colors.text}
            />
            <Text style={[styles.actionText, { color: colors.text }]}>
              {post.negative_reactions_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>
              {post.comments_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleFavorite(postId)}
          >
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorited ? '#e74c3c' : colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => sharePost(post)}
          >
            <Ionicons name="share-social-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Flash Message */}
        {flashMessage && (
          <View
            style={[
              styles.flashMessage,
              {
                backgroundColor:
                  flashMessage.type === 'success'
                    ? colors.primary + '20'
                    : colors.notification + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.flashText,
                {
                  color:
                    flashMessage.type === 'success'
                      ? colors.primary
                      : colors.notification,
                },
              ]}
            >
              {flashMessage.text}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )};
  // Render a single post using a component
  const renderPost = useCallback(
    ({ item }) => {
      const post = item;
      const postId = post.id;
      const isFavorited = !!favoritedByPost[String(postId)];
      const isUpvoted = reactionTypeByPost[postId] === 1;
      const isDownvoted = reactionTypeByPost[postId] === 2;
      const flashMessage = reactionFlashByPost[postId];
      return (
        <PostItem
          post={post}
          colors={colors}
          t={t}
          isFavorited={isFavorited}
          isUpvoted={isUpvoted}
          isDownvoted={isDownvoted}
          flashMessage={flashMessage}
          toggleReaction={toggleReaction}
          toggleFavorite={toggleFavorite}
          sharePost={sharePost}
          navigation={navigation}
        />
      );
    },
    [
      favoritedByPost,
      reactionTypeByPost,
      reactionFlashByPost,
      colors,
      t,
      toggleReaction,
      toggleFavorite,
      sharePost,
      navigation,
    ]
  );
  
  return (
    <View style={styles.postsContainer}>
      <View style={styles.postsHeader}>
        <Text style={[styles.postsTitle, { color: colors.text }]}>
          {t('posts')}
        </Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>{t('loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.postsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh || handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={colors.text + '50'} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                {t('no_posts_found')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};
// RightSide removed – polls feature disabled

const HomeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isDarkMode } = useThemeContext();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.homeMain}>
        <Posts 
          colors={colors} 
          t={t} 
          navigation={navigation} 
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
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
  homeMain: {
    flex: 1,
  },
  // Posts Styles
  postsContainer: {
    flex: 1,
    marginVertical: 10,
  },
  postsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  postsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  postsList: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  postCard: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 0.5,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  authorName: {
    fontWeight: '600',
    fontSize: 14,
  },
  postTime: {
    fontSize: 12,
  },
  moreButton: {
    padding: 5,
  },
  postContent: {
    marginBottom: 15,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  postText: {
    fontSize: 14,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 10,
  },
  beforeAfterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  beforeAfterImageWrapper: {
    width: '48%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#eee',
  },
  beforeAfterImage: {
    width: '100%',
    height: '100%',
  },
  beforeAfterLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
  },
  flashMessage: {
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  flashText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
  },
  // Right Side Styles
  rightSide: {
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    marginVertical: 10,
  },
  pollHeader: {
    marginBottom: 15,
  },
  pollTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pollCreator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  creatorName: {
    fontWeight: '600',
    fontSize: 14,
  },
  pollTime: {
    fontSize: 12,
  },
  pollQuestion: {
    marginBottom: 15,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pollOptions: {
    marginBottom: 15,
  },
  pollOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  voteCount: {
    fontSize: 12,
  },
  percentageContainer: {
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    position: 'relative',
    marginTop: 5,
  },
  percentageFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  percentageText: {
    position: 'absolute',
    right: 0,
    top: 8,
    fontSize: 10,
  },
  totalVotes: {
    alignItems: 'center',
  },
  totalVotesText: {
    fontSize: 12,
  },
});

export default HomeScreen;
