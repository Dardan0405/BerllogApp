import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useI18n } from '../i18n';
import { useThemeContext } from '../theme/ThemeContext';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';

// API configuration
const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://127.0.0.1:8000';
const API_CONFIG = {
  BASE_URL: RAW_BASE.replace(/\/$/, ''),
  TYPES_PATH: '/api/reaction-types',
};

// Function to determine icon based on reaction type
const getReactionIcon = (type, size = 24, color) => {
  if (!type) return null;
  
  const iconType = type.toLowerCase();
  if (iconType === 'negative') {
    return <MaterialIcons name="thumb-down" size={size} color={color} />;
  }
  return <MaterialIcons name="thumb-up" size={size} color={color} />;
};

// Function to get localized name for reaction type
const getLocalizedName = (t, item) => {
  const raw = (item?.name || '').toLowerCase();
  if (raw === 'upvote' || item?.id === 1) return t('reaction_type.upvote');
  if (raw === 'downvote' || item?.id === 2) return t('reaction_type.downvote');
  return item?.name || '—';
};

// Reaction Type Card Component
const ReactionCard = ({ item, colors, colorScheme }) => {
  const { t } = useI18n();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  // Get type label
  const labelType = useMemo(() => {
    const typeStr = (item?.type || '').toLowerCase();
    return typeStr === 'negative' 
      ? t('reaction_type.negative') 
      : t('reaction_type.positive');
  }, [item, t]);
  
  // Animation effect
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
  
  // Determine card color based on type
  const cardBgColor = useMemo(() => {
    const isNegative = (item?.type || '').toLowerCase() === 'negative';
    if (colorScheme === 'dark') {
      return isNegative 
        ? 'rgba(255, 59, 48, 0.15)' 
        : 'rgba(52, 199, 89, 0.15)';
    }
    return isNegative 
      ? 'rgba(255, 59, 48, 0.08)' 
      : 'rgba(52, 199, 89, 0.08)';
  }, [item, colorScheme]);
  
  // Determine icon color based on type
  const iconColor = useMemo(() => {
    const isNegative = (item?.type || '').toLowerCase() === 'negative';
    return isNegative ? colors.notification : colors.primary;
  }, [item, colors]);

  return (
    <Animated.View 
      style={[
        styles.reactionCard,
        { 
          backgroundColor: cardBgColor,
          borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      <View style={styles.reactionIconContainer}>
        {getReactionIcon(item?.type, 28, iconColor)}
      </View>
      <View style={styles.reactionContent}>
        <Text style={[styles.reactionTitle, { color: colors.text }]}>
          {getLocalizedName(t, item)}
        </Text>
        <View style={styles.reactionMeta}>
          <View style={[styles.chip, { 
            backgroundColor: iconColor + '20',
            borderColor: iconColor + '40'
          }]}>
            <Text style={[styles.chipText, { color: iconColor }]}>
              {labelType}
            </Text>
          </View>
          
          {item?.children?.length > 0 && (
            <View style={[styles.chip, { 
              backgroundColor: colors.text + '10',
              borderColor: colors.text + '20',
              marginLeft: 8
            }]}>
              <Text style={[styles.chipText, { color: colors.text }]}>
                {t('reactions_page.children_count', { count: item.children.length })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

// Filter buttons component
const FilterButtons = ({ active, onChange, colors }) => {
  const { t } = useI18n();
  
  return (
    <View style={styles.filterContainer}>
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          active === 'all' && [styles.activeFilter, { borderColor: colors.primary }]
        ]}
        onPress={() => onChange('all')}
      >
        <MaterialIcons 
          name="filter-list" 
          size={18} 
          color={active === 'all' ? colors.primary : colors.text} 
          style={styles.filterIcon} 
        />
        <Text style={[
          styles.filterText, 
          { color: active === 'all' ? colors.primary : colors.text }
        ]}>
          {t('reactions_page.filter.all')}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          active === 'positive' && [styles.activeFilter, { borderColor: colors.primary }]
        ]}
        onPress={() => onChange('positive')}
      >
        <MaterialIcons 
          name="thumb-up" 
          size={18} 
          color={active === 'positive' ? colors.primary : colors.text} 
          style={styles.filterIcon} 
        />
        <Text style={[
          styles.filterText, 
          { color: active === 'positive' ? colors.primary : colors.text }
        ]}>
          {t('reactions_page.filter.positive')}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          active === 'negative' && [styles.activeFilter, { borderColor: colors.primary }]
        ]}
        onPress={() => onChange('negative')}
      >
        <MaterialIcons 
          name="thumb-down" 
          size={18} 
          color={active === 'negative' ? colors.primary : colors.text} 
          style={styles.filterIcon} 
        />
        <Text style={[
          styles.filterText, 
          { color: active === 'negative' ? colors.primary : colors.text }
        ]}>
          {t('reactions_page.filter.negative')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const ReactionTypesScreen = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isDarkMode } = useThemeContext();
  const colorScheme = isDarkMode ? 'dark' : 'light';
  
  const [reactionTypes, setReactionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  
  // Animation for header
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;
  
  // Filter reaction types based on selected filter
  const filteredTypes = useMemo(() => {
    if (filter === 'all') return reactionTypes;
    return reactionTypes.filter(item => 
      (item?.type || '').toLowerCase() === filter.toLowerCase()
    );
  }, [reactionTypes, filter]);
  
  // Fetch reaction types from API
  const fetchReactionTypes = useCallback(async () => {
    try {
      setError('');
      if (!refreshing) setLoading(true);
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}${API_CONFIG.TYPES_PATH}`);
      const typesData = response.data?.types || response.data?.data || [];
      
      setReactionTypes(Array.isArray(typesData) ? typesData : []);
    } catch (err) {
      console.error('Failed to fetch reaction types:', err);
      setError(t('reactions_page.load_failed') || 'Failed to load reaction types');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, t]);
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReactionTypes();
  }, [fetchReactionTypes]);
  
  // Fetch reaction types when component mounts
  useEffect(() => {
    fetchReactionTypes();
    
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
  }, [fetchReactionTypes]);
  
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
          {t('reactions_page.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.text + 'CC' }]}>
          {t('reactions_page.subtitle')}
        </Text>
      </Animated.View>
      
      {/* Filters */}
      <FilterButtons 
        active={filter} 
        onChange={setFilter} 
        colors={colors} 
      />
      
      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t('reactions_page.loading')}
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
      ) : filteredTypes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="emoticon-sad-outline" size={64} color={colors.text + '50'} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {t('reactions_page.no_items')}
          </Text>
        </View>
      ) : (
        <View style={styles.reactionsGrid}>
          {filteredTypes.map((item) => (
            <ReactionCard
              key={item.id}
              item={item}
              colors={colors}
              colorScheme={colorScheme}
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
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  filterIcon: {
    marginRight: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
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
  reactionsGrid: {
    flex: 1,
  },
  reactionCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  reactionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  reactionContent: {
    flex: 1,
    justifyContent: 'center',
  },
  reactionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  reactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ReactionTypesScreen;
