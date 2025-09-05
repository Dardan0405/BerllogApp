import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  ActivityIndicator, 
  SafeAreaView,
  Dimensions,
  RefreshControl,
  Linking,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useI18n } from '../i18n';
import { useThemeContext } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axios from 'axios';
import MapView, { Marker, Callout } from 'react-native-maps';

// API configuration (aligned with RankingScreen)
const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://127.0.0.1:8000';
const API_CONFIG = {
  BASE_URL: RAW_BASE.replace(/\/$/, ''),
};

// Helper to normalize image URLs
const processImageUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const path = String(url).startsWith('/') ? String(url) : `/${String(url)}`;
  return `${API_CONFIG.BASE_URL}${path}`;
};

// Default map region
const DEFAULT_REGION = {
  latitude: 42.6026,  // Center of Balkans
  longitude: 20.9030,
  latitudeDelta: 15,  // Wider zoom to show all countries
  longitudeDelta: 15,
};

const MapScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isDarkMode } = useThemeContext();
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // State variables
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortRange, setSortRange] = useState('AllTimes');
  const [userLocation, setUserLocation] = useState(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [mapReady, setMapReady] = useState(false);

  // Get user's location permission
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        Alert.alert(
          t('location_permission_required'),
          t('location_permission_message'),
          [
            {
              text: t('cancel'),
              style: 'cancel',
            },
            {
              text: t('open_settings'),
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  // Handle location button press
  const handleLocationPress = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setRegion(DEFAULT_REGION);
      return;
    }

    try {
      setLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(newLocation);
      setRegion({
        ...newLocation,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(t('error'), t('error_getting_location'));
    } finally {
      setLoading(false);
    }
  };

  // Initial location setup
  useEffect(() => {
    let isMounted = true;

    const initLocation = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setRegion(DEFAULT_REGION);
        setLoading(false);
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          timeInterval: 10000,
          distanceInterval: 100,
        });

        if (isMounted) {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setUserLocation(newLocation);
          setRegion({
            ...newLocation,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        }
      } catch (error) {
        console.error('Error getting initial location:', error);
        if (isMounted) {
          setRegion(DEFAULT_REGION);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  // Helper function to get image URL
  const getImageUrl = (imagePath, isUserAvatar = false) => {
    if (!imagePath) return null;
    
    // If the image is already a full URL, return it directly
    if (/^https?:\/\//i.test(imagePath)) {
      return imagePath;
    }
    
    // Clean up the path
    const cleaned = String(imagePath).replace(/^\/+/g, '');
    
    // Handle different image path formats
    if (cleaned.startsWith('garbage_post_images/')) {
      return `${API_CONFIG.BASE_URL}/storage/${cleaned}`;
    }
    
    if (cleaned.startsWith('storage/')) {
      return `${API_CONFIG.BASE_URL}/${cleaned}`;
    }
    
    if (cleaned.startsWith('avatar/')) {
      return `${API_CONFIG.BASE_URL}/storage/${cleaned}`;
    }
    
    return `${API_CONFIG.BASE_URL}/storage/${cleaned}`;
  };

  // Fetch posts from API
  const fetchPosts = async () => {
    try {
      setPostsError('');
      if (!refreshing) setPostsLoading(true);
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/garbage-posts`);
      
      // Handle different API response structures
      let responseData;
      if (response.data?.garbagePosts?.data) {
        // Structure: { garbagePosts: { data: [...] } }
        responseData = response.data.garbagePosts.data;
      } else if (Array.isArray(response.data)) {
        // Structure: direct array
        responseData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        // Structure: { data: [...] }
        responseData = response.data.data;
      } else {
        // Fallback
        responseData = [];
        console.warn('Unexpected API response structure:', JSON.stringify(response.data).substring(0, 100) + '...');
      }
      
      // Ensure we have an array
      const data = Array.isArray(responseData) ? responseData : [];
      
      // Process each post with safe access to properties
      const processed = data.map((post) => {
        try {
          // Safely extract image paths
          const beforeImage = post.images?.find(img => img?.type === 'before')?.image_path;
          const afterImage = post.images?.find(img => img?.type === 'after')?.image_path;
          const userAvatar = post.user?.avatar;
          
          // Parse coordinates safely
          let lat = null;
          let lng = null;
          
          if (post.latitude && !isNaN(parseFloat(post.latitude))) {
            lat = parseFloat(post.latitude);
          } else if (post.lat && !isNaN(parseFloat(post.lat))) {
            lat = parseFloat(post.lat);
          }
          
          if (post.longitude && !isNaN(parseFloat(post.longitude))) {
            lng = parseFloat(post.longitude);
          } else if (post.lng && !isNaN(parseFloat(post.lng))) {
            lng = parseFloat(post.lng);
          }
          
          return {
            ...post,
            id: post.id ? String(post.id) : `temp_${Math.random().toString(36).substring(2, 9)}`,
            beforePicture: beforeImage ? getImageUrl(beforeImage) : null,
            afterPicture: afterImage ? getImageUrl(afterImage) : null,
            user: {
              ...post.user,
              name: post.user?.name || t('anonymous'),
              avatar: userAvatar ? getImageUrl(userAvatar, true) : null
            },
            lat: lat,
            lng: lng,
            createdAt: post.created_at || post.createdAt || new Date().toISOString(),
            images: post.images || [],
            description: post.description || t('no_description')
          };
        } catch (postError) {
          console.error('Error processing post:', postError, post);
          // Return a minimal valid post object
          return {
            id: post.id ? String(post.id) : `temp_${Math.random().toString(36).substring(2, 9)}`,
            lat: null,
            lng: null,
            description: t('error_processing_post'),
            user: { name: t('anonymous') },
            createdAt: new Date().toISOString(),
            images: []
          };
        }
      }).filter(post => post.lat && post.lng); // Only include posts with valid coordinates
      
      setPosts(processed);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setPostsError(t('failed_to_load_map'));
    } finally {
      setPostsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  // Filter posts based on search query and time range
  const nowTs = Date.now();
  const withinRange = (dateStr) => {
    if (!dateStr) return sortRange === 'AllTimes';
    const ts = new Date(dateStr).getTime();
    if (isNaN(ts)) return true;
    if (sortRange === '24H') return nowTs - ts <= 24 * 60 * 60 * 1000;
    if (sortRange === 'LastWeek') return nowTs - ts <= 7 * 24 * 60 * 60 * 1000;
    return true; // AllTimes
  };

  const filteredPosts = posts && posts.length > 0 
    ? posts.filter(post => {
        // Filter by timeframe
        if (!withinRange(post.createdAt || post.created_at)) {
          return false;
        }
        
        // Filter by search query
        if (!searchQuery) return true;
        
        const query = searchQuery.toLowerCase().trim();
        const description = (post.description || '').toLowerCase();
        const userName = (post.user?.name || '').toLowerCase();
        return description.includes(query) || userName.includes(query);
      })
    : [];

  // Handle list item press
  const handleListItemPress = (post) => {
    setSelectedPost(post);
  };

  // Haversine distance in km
  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (v) => (v * Math.PI) / 180;
    if (
      [lat1, lon1, lat2, lon2].some(
        (v) => typeof v !== 'number' || isNaN(v)
      )
    ) return null;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Render map marker
  const renderMarker = (post) => {
    try {
      // Validate post data
      if (!post) {
        console.warn('MapScreen: Null or undefined post data for marker');
        return null;
      }
      
      // Ensure we have valid coordinates
      if (!post.lat || !post.lng || isNaN(parseFloat(post.lat)) || isNaN(parseFloat(post.lng))) {
        console.warn('MapScreen: Invalid coordinates for post:', post.id, post.lat, post.lng);
        return null;
      }
    } catch (error) {
      console.error('MapScreen: Error validating marker data:', error);
      return null;
    }
    
    const hasImages = Boolean(post.beforePicture || post.afterPicture);
    const isSelected = selectedPost?.id === post.id;
      
      // Safely parse coordinates
      const latitude = parseFloat(post.lat);
      const longitude = parseFloat(post.lng);
      
      const handlePress = () => {
        try {
          // Create a safe post object with fallbacks for all fields
          const safePost = {
            id: post?.id || 'unknown',
            lat: latitude,
            lng: longitude,
            description: post?.description || t('no_description'),
            user: {
              name: post?.user?.name || t('anonymous'),
              avatar: post?.user?.avatar || null
            },
            beforePicture: post?.beforePicture || null,
            afterPicture: post?.afterPicture || null,
            createdAt: post?.createdAt || post?.created_at || new Date().toISOString(),
            images: post?.images || []
          };

          // Show modal with post details
          setSelectedPost(safePost);
          setModalVisible(true);
        } catch (error) {
          console.error('Error handling marker press:', error);
          // Set a minimal safe post object if something goes wrong
          const errorPost = {
            id: 'error',
            lat: latitude,
            lng: longitude,
            description: t('error_loading_post'),
            user: { name: t('error') },
            beforePicture: null,
            afterPicture: null,
            createdAt: new Date().toISOString()
          };
          setSelectedPost(errorPost);
          setModalVisible(true);
        }
      };
      
      return (
        <Marker
          key={post.id}
          coordinate={{
            latitude,
            longitude
          }}
          onPress={handlePress}
        >
        <View style={[
          styles.markerContainer,
          isSelected && styles.selectedMarkerContainer
        ]}>
          <View style={[
            styles.markerDot,
            isSelected && styles.selectedMarkerDot,
            { backgroundColor: isSelected ? colors.primary : colors.primary }
          ]}>
            {hasImages && (
              <Ionicons name="images" size={12} color="#fff" />
            )}
          </View>
        </View>
      </Marker>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('map')}</Text>
        <View style={styles.searchContainer}>
         
        </View>
      </View>

      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <MapView
            style={styles.map}
            initialRegion={region}
            onRegionChangeComplete={setRegion}
            showsUserLocation={!!userLocation}
            showsMyLocationButton={false}
            loadingEnabled={true}
            loadingIndicatorColor={colors.primary}
            loadingBackgroundColor={colors.background}
          >
            {filteredPosts.map(post => renderMarker(post))}
            
            {userLocation && (
              <Marker
                coordinate={{
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude
                }}
                pinColor={colors.primary}
              >
                <View style={styles.currentLocationMarker}>
                  <View style={[styles.currentLocationPulse, { borderColor: colors.primary }]} />
                  <View style={[styles.currentLocationDot, { backgroundColor: colors.primary }]} />
                </View>
              </Marker>
            )}
          </MapView>
        )}
      </View>

      <View style={styles.footer}>
        
        
        <TouchableOpacity
          style={[styles.myLocationButton, { backgroundColor: colors.card }]}
          onPress={() => {
            if (userLocation) {
              setRegion({
                ...region,
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              });
            }
          }}
        >
          <Ionicons name="navigate" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Modal for post details */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedPost(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('post_details')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setSelectedPost(null);
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {selectedPost && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.postHeader}>
                  <View style={styles.authorInfo}>
                    {selectedPost.user?.avatar && (
                      <Image
                        source={{ uri: selectedPost.user.avatar }}
                        style={styles.authorAvatar}
                        // defaultSource={require('../../assets/adaptive-icon.png')}
                      />
                    )}
                    <View style={styles.authorDetails}>
                      <Text style={[styles.authorName, { color: colors.text }]}>
                        {selectedPost.user?.name || t('anonymous')}
                      </Text>
                      <Text style={[styles.postDate, { color: colors.textSecondary || (isDarkMode ? '#9CA3AF' : '#6B7280') }]}>
                        {selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleDateString() : ''}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Text style={[styles.postDescription, { color: colors.text }]}>
                  {selectedPost.description || t('no_description')}
                </Text>
                
                {(selectedPost.beforePicture || selectedPost.afterPicture) && (
                  <View style={styles.imagesContainer}>
                    {selectedPost.beforePicture && (
                      <View style={styles.imageSection}>
                        <Text style={[styles.imageLabel, { color: colors.text }]}>
                          {t('before')}
                        </Text>
                        <Image
                          source={{ uri: selectedPost.beforePicture }}
                          style={styles.postImage}
                          resizeMode="cover"
                          onError={(e) => console.log('Before image load error:', e.nativeEvent.error)}
                        />
                      </View>
                    )}
                    {selectedPost.afterPicture && (
                      <View style={styles.imageSection}>
                        <Text style={[styles.imageLabel, { color: colors.text }]}>
                          {t('after')}
                        </Text>
                        <Image
                          source={{ uri: selectedPost.afterPicture }}
                          style={styles.postImage}
                          resizeMode="cover"
                          onError={(e) => console.log('After image load error:', e.nativeEvent.error)}
                        />
                      </View>
                    )}
                  </View>
                )}
                
                <View style={styles.locationInfo}>
                  <Ionicons name="location" size={16} color={colors.primary} />
                  <Text style={[styles.locationText, { color: colors.textSecondary || (isDarkMode ? '#9CA3AF' : '#6B7280') }]}>
                    {selectedPost.lat?.toFixed(4)}, {selectedPost.lng?.toFixed(4)}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');
const isTablet = width > 600;

const styles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // Header styles
  header: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  
  // Map container
  mapContainer: {
    flex: isTablet ? 2 : 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  
  // Loading state
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 5,
  },
  
  // Footer with filters
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  sortButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  activeSortButton: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  myLocationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  
  // Marker styles
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMarkerContainer: {
    zIndex: 1000,
  },
  markerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  selectedMarkerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  
  // Callout styles
  calloutContainer: {
    width: 280,
    padding: 0,
    backgroundColor: 'transparent',
  },
  calloutContent: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutHeader: {
    marginBottom: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  calloutSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  calloutImages: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  calloutImageContainer: {
    flex: 1,
    marginHorizontal: 2,
  },
  imageLabel: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
    opacity: 0.8,
  },
  calloutImage: {
    width: '100%',
    height: 80,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  viewDetailsButton: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewDetailsButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  calloutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.7,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  directionsText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Current location marker
  currentLocationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  currentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  
  // Error and empty states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePickerButton: {
    backgroundColor: '#4CAF50',
  },
  pickerButtonText: {
    fontSize: 14,
  },
  activePickerButtonText: {
    fontWeight: '600',
  },
  countryButtons: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  countryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCountryButton: {
    backgroundColor: '#4CAF50',
  },
  countryButtonText: {
    fontSize: 14,
  },
  activeCountryButtonText: {
    fontWeight: '600',
  },
  content: {
    flex: 1,
    flexDirection: isTablet ? 'row' : 'column',
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  selectedPostInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedPostContent: {
    flex: 1,
  },
  selectedPostTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedPostSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  sidebar: {
    flex: isTablet ? 1 : 1,
    maxHeight: isTablet ? '100%' : height * 0.4,
    borderTopLeftRadius: isTablet ? 0 : 16,
    borderTopRightRadius: isTablet ? 0 : 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    padding: 0,
  },
  listContainer: {
    padding: 12,
  },
  listItem: {
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
  },
  selectedListItem: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#eee',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  listItemDetails: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  listItemSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  distancePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  countChip: {
    fontSize: 16,
    fontWeight: '400',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  postHeader: {
    marginBottom: 16,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  postDate: {
    fontSize: 14,
    marginTop: 2,
  },
  postDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  imagesContainer: {
    marginBottom: 16,
  },
  imageSection: {
    marginBottom: 12,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 8,
  },
});

export default MapScreen;
