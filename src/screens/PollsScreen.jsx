import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { useI18n } from '../i18n';
import { useThemeContext } from '../theme/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';

// API configuration
const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://127.0.0.1:8000';
const API_CONFIG = {
  BASE_URL: RAW_BASE.replace(/\/$/, ''),
};

// Helper function to get the correct image URL format
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

// Poll option component
const PollOption = ({ option, isSelected, onPress, voteCount, colors, colorScheme }) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Calculate percentage if vote count is available
  const percentage = voteCount > 0 ? Math.round((option.vote_count / voteCount) * 100) : 0;
  
  return (
    <Animated.View 
      style={[
        styles.optionContainer,
        { 
          backgroundColor: isSelected ? colors.primary + '20' : colorScheme === 'dark' ? colors.card : '#fff',
          borderColor: isSelected ? colors.primary : colors.border,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.optionContent} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.optionTextContainer}>
          <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={2}>
            {option.option_text}
          </Text>
          {voteCount > 0 && (
            <Text style={[styles.votePercentage, { color: colors.primary }]}>
              {percentage}%
            </Text>
          )}
        </View>
        
        {/* Vote button */}
        <View style={[styles.voteButton, { 
          backgroundColor: isSelected ? colors.primary : 'transparent',
          borderColor: colors.primary
        }]}>
          <Text style={[styles.voteButtonText, { 
            color: isSelected ? '#fff' : colors.primary 
          }]}>
            {isSelected ? '✓' : 'Vote'}
          </Text>
        </View>
      </TouchableOpacity>
      
      {/* Progress bar */}
      {voteCount > 0 && (
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${percentage}%`,
                backgroundColor: colors.primary + '80',
              }
            ]} 
          />
        </View>
      )}
      
      {/* Vote count */}
      {voteCount > 0 && (
        <View style={styles.voteCountContainer}>
          <Ionicons name="people-outline" size={14} color={colors.text + '80'} />
          <Text style={[styles.voteCount, { color: colors.text + '80' }]}>
            {option.vote_count} votes
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

// Poll card component
const PollCard = ({ poll, onVote, userVotes, colors, colorScheme, t }) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Calculate total votes
  const totalVotes = poll.options.reduce((sum, option) => sum + (option.vote_count || 0), 0);
  
  // Check if user has voted on this poll
  const userVote = userVotes[poll.id];
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Animated.View 
      style={[
        styles.pollCard,
        { 
          backgroundColor: colorScheme === 'dark' ? colors.card : '#fff',
          borderColor: colors.border,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
          ...Platform.select({
            ios: {
              shadowColor: colorScheme === 'dark' ? '#000' : '#000',
              shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
            },
            android: {
              elevation: colorScheme === 'dark' ? 6 : 3,
            },
          }),
        }
      ]}
    >
      {/* Poll creator info */}
      <View style={styles.creatorContainer}>
        <View style={styles.creatorInfo}>
          {poll.Picture ? (
            <Image 
              source={{ uri: poll.Picture }} 
              style={styles.creatorAvatar}
              // defaultSource={require('../../assets/adaptive-icon.png')}
            />
          ) : (
            <View style={[styles.creatorAvatarFallback, { backgroundColor: colors.primary + '30' }]}>
              <Text style={[styles.creatorInitial, { color: colors.primary }]}>
                {poll.name ? poll.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          <View style={styles.creatorMeta}>
            <Text style={[styles.creatorName, { color: colors.text }]}>
              {poll.name || t('anonymous')}
            </Text>
            <Text style={[styles.pollTime, { color: colors.text + '80' }]}>
              {poll.time}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      {/* Poll question */}
      <Text style={[styles.pollQuestion, { color: colors.text }]}>
        {poll.question}
      </Text>
      
      {/* Poll options */}
      <View style={styles.optionsContainer}>
        {poll.options.map((option) => (
          <PollOption
            key={option.id}
            option={option}
            isSelected={userVote?.optionId === option.id}
            onPress={() => onVote(poll.id, option)}
            voteCount={totalVotes}
            colors={colors}
            colorScheme={colorScheme}
          />
        ))}
      </View>
      
      {/* Poll footer */}
      <View style={[styles.pollFooter, { borderTopColor: colors.border }]}>
        <View style={styles.pollStats}>
          <Ionicons name="stats-chart-outline" size={16} color={colors.text + '80'} style={styles.statsIcon} />
          <Text style={[styles.totalVotes, { color: colors.text + '80' }]}>
            {totalVotes} {t('votes')}
          </Text>
          <View style={[styles.dateDivider, { backgroundColor: colors.text + '40' }]} />
          <Text style={[styles.pollDate, { color: colors.text + '80' }]}>
            {formatDate(poll.date)}
          </Text>
        </View>
        
        {userVote?.message && (
          <View style={[styles.voteMessage, { 
            backgroundColor: userVote.type === 'success' ? colors.primary + '20' : colors.notification + '20',
            borderColor: userVote.type === 'success' ? colors.primary + '40' : colors.notification + '40'
          }]}>
            <Text style={[styles.voteMessageText, { 
              color: userVote.type === 'success' ? colors.primary : colors.notification 
            }]}>
              {userVote.message}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const PollsScreen = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isDarkMode } = useThemeContext();
  const colorScheme = isDarkMode ? 'dark' : 'light';
  
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // User votes state
  const [userVotes, setUserVotes] = useState({});
  const LOCAL_VOTES_KEY = 'user_poll_votes';
  
  // Animation for header
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;

  // Fetch polls from API
  const fetchPolls = useCallback(async () => {
    try {
      setError('');
      if (!refreshing) setLoading(true);
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/polls`);
      const pollsData = response.data?.polls || response.data?.data || [];
      
      // Process polls data
      const processedPolls = pollsData.map(poll => {
        const publishedAt = poll.published_at || poll.created_at;
        
        // Calculate total votes
        const totalVotes = poll.total_votes !== undefined ? poll.total_votes : (
          Array.isArray(poll.options)
            ? poll.options.reduce((sum, o) => sum + (o.vote_count || o.votes || 0), 0)
            : 0
        );
        
        // Build avatar URL
        const avatarPath = poll?.creator?.avatar || '';
        let pictureUrl = null;
        
        if (avatarPath) {
          pictureUrl = getImageUrl(avatarPath, API_CONFIG.BASE_URL, true);
        }
        
        return {
          id: poll.id,
          question: poll.question,
          options: Array.isArray(poll.options)
            ? poll.options.map(o => ({
                id: o.id,
                option_text: o.option_text,
                vote_count: o.vote_count ?? o.votes ?? 0,
              }))
            : [],
          Picture: pictureUrl,
          name: poll.creator?.name || '',
          time: publishedAt ? new Date(publishedAt).toLocaleString() : '',
          date: publishedAt ? new Date(publishedAt).toLocaleDateString() : '',
          allvotes: `${totalVotes} ${t('votes')}`,
        };
      });
      
      setPolls(processedPolls);
    } catch (err) {
      console.error('Failed to fetch polls:', err);
      setError(t('failed_to_load_polls') || 'Failed to load polls');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, t]);

  // Load saved votes from local storage
  useEffect(() => {
    const loadSavedVotes = async () => {
      try {
        const savedVotes = await AsyncStorage.getItem(LOCAL_VOTES_KEY);
        if (savedVotes) {
          setUserVotes(JSON.parse(savedVotes));
        }
      } catch (error) {
        console.error('Failed to load saved votes:', error);
      }
    };
    
    loadSavedVotes();
  }, []);

  // Fetch polls when component mounts
  useEffect(() => {
    fetchPolls();
    
    // Animate header
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslate, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, [fetchPolls]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPolls();
  }, [fetchPolls]);

  // Handle voting
  const handleVote = async (pollId, option) => {
    // Get authentication token
    const token = null; // Replace with your auth token retrieval logic
    
    if (!token) {
      setUserVotes(prev => ({
        ...prev,
        [pollId]: { 
          ...prev[pollId],
          message: t('auth_required') || 'You must be signed in to vote',
          type: 'error'
        }
      }));
      return;
    }
    
    try {
      const currentVote = userVotes[pollId];
      
      if (currentVote?.voteId) {
        // Remove vote
        const url = `${API_CONFIG.BASE_URL}/api/users/votes/${currentVote.voteId}`;
        await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
        
        setUserVotes(prev => {
          const next = { 
            ...prev, 
            [pollId]: { 
              message: t('vote_removed') || 'Vote removed',
              type: 'success' 
            } 
          };
          
          // Save to local storage
          try {
            const updatedVotes = { ...prev };
            delete updatedVotes[pollId];
            AsyncStorage.setItem(LOCAL_VOTES_KEY, JSON.stringify(updatedVotes));
          } catch (error) {
            console.error('Failed to save votes:', error);
          }
          
          return next;
        });
      } else {
        // Add vote
        const url = `${API_CONFIG.BASE_URL}/api/users/votes`;
        const response = await axios.post(
          url, 
          { poll_id: pollId, option_id: option.id }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const voteId = response?.data?.vote?.id;
        
        setUserVotes(prev => {
          const next = { 
            ...prev, 
            [pollId]: { 
              optionId: option.id, 
              voteId, 
              message: t('vote_submitted') || 'Vote submitted',
              type: 'success' 
            } 
          };
          
          // Save to local storage
          try {
            AsyncStorage.setItem(LOCAL_VOTES_KEY, JSON.stringify(next));
          } catch (error) {
            console.error('Failed to save votes:', error);
          }
          
          return next;
        });
      }
      
      // Refresh polls to get updated vote counts
      fetchPolls();
    } catch (error) {
      console.error('Failed to vote:', error);
      
      const isDelete = !!userVotes[pollId]?.voteId;
      setUserVotes(prev => ({
        ...prev,
        [pollId]: { 
          ...prev[pollId],
          message: isDelete 
            ? (t('vote_remove_failed') || 'Failed to remove vote')
            : (t('vote_submit_failed') || 'Failed to submit vote'),
          type: 'error'
        }
      }));
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colorScheme === 'dark' ? colors.background : '#f7f9fc' }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <Animated.View style={[
        styles.header,
        { 
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslate }] 
        }
      ]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('polls')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.text + 'CC' }]}>
          {t('polls_subtitle') || 'Vote and share your opinion'}
        </Text>
      </Animated.View>
      
      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t('loading_polls') || 'Loading polls...'}
          </Text>
        </View>
      ) : error ? (
        <View style={[styles.errorContainer, { 
          backgroundColor: colorScheme === 'dark' ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 59, 48, 0.1)',
          borderColor: colorScheme === 'dark' ? 'rgba(255, 59, 48, 0.3)' : 'rgba(255, 59, 48, 0.2)'
        }]}>
          <Ionicons name="alert-circle" size={24} color={colors.notification} />
          <Text style={[styles.errorText, { color: colors.notification }]}>{error}</Text>
        </View>
      ) : polls.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="poll" size={64} color={colors.text + '50'} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {t('no_polls') || 'No polls available'}
          </Text>
        </View>
      ) : (
        <View style={styles.pollsContainer}>
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              onVote={handleVote}
              userVotes={userVotes}
              colors={colors}
              colorScheme={colorScheme}
              t={t}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  errorText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 15,
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
  pollsContainer: {
    flex: 1,
  },
  pollCard: {
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  creatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  creatorAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorInitial: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  creatorMeta: {
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  pollTime: {
    fontSize: 12,
  },
  moreButton: {
    padding: 8,
  },
  pollQuestion: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingBottom: 16,
    lineHeight: 24,
  },
  optionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  optionContainer: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    lineHeight: 22,
  },
  votePercentage: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  voteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  voteCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
  },
  voteCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  pollFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  pollStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsIcon: {
    marginRight: 4,
  },
  totalVotes: {
    fontSize: 14,
  },
  dateDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  pollDate: {
    fontSize: 14,
  },
  voteMessage: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  voteMessageText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default PollsScreen;
