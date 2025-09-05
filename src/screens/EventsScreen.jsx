import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useI18n } from '../i18n';
import { MaterialIcons, Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// API configuration
const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://127.0.0.1:8000';
const API_CONFIG = {
  BASE_URL: RAW_BASE.replace(/\/$/, ''),
};

const STORAGE_KEY = '@berllog_saved_events';

const EventsScreen = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('recent'); // recent, oldest, alphabet
  const [showSortModal, setShowSortModal] = useState(false);
  
  const modalY = useRef(new Animated.Value(Dimensions.get('window').height)).current;


  // Fetch events from API
  const fetchEvents = async () => {
    try {
      setError('');
      if (!refreshing) setLoading(true);
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/events/upcoming?sort=${sortBy}`);
      
      // Extract events data from response
      const eventsData = response.data?.events || [];
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError(t('events_load_error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch events when component mounts or sortBy changes
  useEffect(() => {
    fetchEvents();
  }, [sortBy]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };


  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // Convert "YYYY-MM-DD HH:mm:ss" to ISO-friendly
    const d = new Date(dateStr.replace(' ', 'T'));
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Sort events client-side as fallback
  const sortedEvents = useMemo(() => {
    if (!events.length) return [];
    
    const copy = [...events];
    switch (sortBy) {
      case 'recent':
        return copy.sort((a, b) => new Date(a.date) - new Date(b.date));
      case 'oldest':
        return copy.sort((a, b) => new Date(b.date) - new Date(a.date));
      case 'alphabet':
        return copy.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      default:
        return copy;
    }
  }, [events, sortBy]);

  // Show sort modal
  const showSortOptions = () => {
    setShowSortModal(true);
    Animated.timing(modalY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Hide sort modal
  const hideSortOptions = () => {
    Animated.timing(modalY, {
      toValue: Dimensions.get('window').height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowSortModal(false));
  };

  // Select sort option
  const selectSortOption = (option) => {
    setSortBy(option);
    hideSortOptions();
  };

  // Render event item
  const renderEventItem = ({ item }) => {
    
    
    return (
      <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
        <View style={styles.eventDateContainer}>
          <MaterialIcons name="event" size={18} color={colors.primary} style={styles.eventIcon} />
          <Text style={[styles.eventDate, { color: colors.text }]}>
            {formatDate(item.date)}
          </Text>
        </View>
        
        <Text style={[styles.eventTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.eventDescription, { color: colors.text }]} numberOfLines={3}>
          {item.description}
        </Text>
        
        <View style={styles.eventLocation}>
          <MaterialIcons name="location-on" size={16} color={colors.text} style={styles.locationIcon} />
          <Text style={[styles.eventLocationText, { color: colors.text }]} numberOfLines={1}>
            {item.location || t('location_not_specified')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('upcoming_events')}
        </Text>
        
        <TouchableOpacity 
          style={[styles.sortButton, { borderColor: colors.border }]}
          onPress={showSortOptions}
          accessibilityLabel={t('sort_by')}
        >
          <MaterialCommunityIcons name="sort" size={20} color={colors.text} />
          <Text style={[styles.sortButtonText, { color: colors.text }]}>
            {t(sortBy)}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t('loading_events')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchEvents}
          >
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : sortedEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="calendar-o" size={48} color={colors.text} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {t('no_events')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedEvents}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEventItem}
          contentContainerStyle={styles.eventsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Sort Options Modal */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="none"
        onRequestClose={hideSortOptions}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={hideSortOptions}
        >
          <Animated.View 
            style={[
              styles.sortModal,
              { backgroundColor: colors.card, transform: [{ translateY: modalY }] }
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('sort_by')}
            </Text>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortBy === 'recent' && styles.selectedOption]}
              onPress={() => selectSortOption('recent')}
            >
              <Text style={[styles.sortOptionText, { color: colors.text }]}>
                {t('recent')}
              </Text>
              {sortBy === 'recent' && (
                <MaterialIcons name="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortBy === 'oldest' && styles.selectedOption]}
              onPress={() => selectSortOption('oldest')}
            >
              <Text style={[styles.sortOptionText, { color: colors.text }]}>
                {t('oldest')}
              </Text>
              {sortBy === 'oldest' && (
                <MaterialIcons name="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortBy === 'alphabet' && styles.selectedOption]}
              onPress={() => selectSortOption('alphabet')}
            >
              <Text style={[styles.sortOptionText, { color: colors.text }]}>
                {t('alphabet')}
              </Text>
              {sortBy === 'alphabet' && (
                <MaterialIcons name="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortButtonText: {
    marginHorizontal: 4,
    fontSize: 14,
  },
  eventsList: {
    padding: 12,
  },
  eventCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    marginRight: 6,
  },
  eventDate: {
    fontSize: 14,
  },
  bookmarkButton: {
    padding: 4,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventLocation: {
    fontSize: 14,
  },
  viewDetailsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
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
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 24,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sortModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  selectedOption: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  sortOptionText: {
    fontSize: 16,
  },
});

export default EventsScreen;
