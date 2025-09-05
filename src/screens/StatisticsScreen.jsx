import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  TouchableOpacity
} from "react-native";
import { useThemeContext } from "../theme/ThemeContext";
import { useTheme } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useI18n } from "../i18n";
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

// Helper function to get initials from name
const getInitial = (name) => {
  return name ? name.charAt(0).toUpperCase() : 'U';
};

// API configuration
const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://127.0.0.1:8000';
const API_CONFIG = {
  BASE_URL: RAW_BASE.replace(/\/$/, ''),
};

const StatCard = ({ icon: Icon, iconName, label, value, loading, colors, colorScheme }) => {
  // Animation for card appearance
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

  // Theme-specific styles
  const cardShadowOpacity = colorScheme === 'dark' ? 0.3 : 0.1;
  const gradientColors = colorScheme === 'dark' 
    ? [colors.primary + '30', colors.primary + '15']
    : [colors.primary + '20', colors.primary + '10'];

  return (
    <Animated.View 
      style={[
        styles.statCard, 
        { 
          backgroundColor: colors.card,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
          ...Platform.select({
            ios: {
              shadowOpacity: cardShadowOpacity,
            },
            android: {
              elevation: colorScheme === 'dark' ? 6 : 4,
            },
          }),
        }
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.statIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Icon name={iconName} color={colors.primary} size={24} />
      </LinearGradient>
      <View style={styles.statMeta}>
        <Text style={[styles.statLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.statValue, { color: colors.primary }]}>
          {loading ? "—" : value}
        </Text>
      </View>
    </Animated.View>
  );
};

const LastUserCard = ({ user, loading, colors, colorScheme }) => {
  const { t } = useI18n();
  
  // Animation for card appearance
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

  // Theme-specific styles
  const cardShadowOpacity = colorScheme === 'dark' ? 0.4 : 0.1;
  const cardBorderColor = colorScheme === 'dark' ? colors.border : colors.border;

  return (
    <Animated.View 
      style={[
        styles.lucCard, 
        { 
          backgroundColor: colors.card,
          borderColor: cardBorderColor,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
          ...Platform.select({
            ios: {
              shadowOpacity: cardShadowOpacity,
              shadowColor: colorScheme === 'dark' ? '#000' : '#000',
            },
            android: {
              elevation: colorScheme === 'dark' ? 8 : 4,
            },
          }),
        }
      ]}
      accessibilityLabel={t('statistics_page.aria.newest_user_card')}
    >
      <View style={styles.lucHeader}>
        <View style={styles.lucAvatarContainer}>
          <LinearGradient
            colors={colorScheme === 'dark' ? [colors.primary + '40', colors.primary + '20'] : [colors.primary + '30', colors.primary + '10']}
            style={styles.lucAvatarGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {!loading && user?.avatar ? (
              <Image 
                source={{ uri: user.avatar.startsWith('http') ? user.avatar : `${API_CONFIG.BASE_URL}${user.avatar}` }} 
                style={styles.avatarImage} 
              />
            ) : (
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {getInitial(user?.name || user?.username || 'U')}
              </Text>
            )}
          </LinearGradient>
        </View>
        <View style={styles.lucMeta}>
          <Text style={[styles.lucName, { color: colors.text }]}>
            {loading ? "—" : user?.name || user?.username || "—"}
          </Text>
          <Text style={[styles.lucEmail, { color: colors.text }]}>
            {loading ? "—" : user?.email || "—"}
          </Text>
          <View style={[styles.lucBadge, { backgroundColor: colorScheme === 'dark' ? '#3D2E00' : '#FFF8E1' }]}>
            <FontAwesome5 name="star" size={10} color="#FFC107" style={styles.lucBadgeIcon} />
            <Text style={[styles.lucBadgeText, { color: colorScheme === 'dark' ? '#FFC107' : '#FF8F00' }]}>
              {t('statistics_page.newest_member')}
            </Text>
          </View>
        </View>
      </View>
      <View style={[styles.lucFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.lucLabel, { color: colors.text }]}>
          {useI18n().t('statistics_page.joined')}:
        </Text>
        <Text style={[styles.lucDate, { color: colors.text }]}>
          {loading ? "—" : user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
        </Text>
      </View>
    </Animated.View>
  );
};

const StatisticsScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { t } = useI18n();
  const { colors } = useTheme();
  const { isDarkMode } = useThemeContext();
  const colorScheme = isDarkMode ? 'dark' : 'light';
  
  // Animation for header
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;

  // Fetch statistics from API
  const fetchStats = useCallback(async () => {
    try {
      setError('');
      if (!refreshing) setLoading(true);
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/statistics`);
      setData(response.data?.data || response.data || null);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
      setError(t('statistics_page.load_failed') || 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, t]);

  // Fetch statistics when component mounts
  useEffect(() => {
    fetchStats();
    
    // Animate header when component mounts
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
  }, [fetchStats]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  // Define theme-specific colors
  const themeStyles = {
    backgroundColor: colorScheme === 'dark' ? colors.background : '#f7f9fc',
    cardShadowColor: colorScheme === 'dark' ? '#000' : '#000',
    cardShadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: themeStyles.backgroundColor }]}
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
      <View style={styles.content}>
        <Animated.View style={[
          styles.header,
          { 
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslate }] 
          }
        ]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('statistics_page.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text + 'CC' }]}>
            {t('statistics_page.subtitle')}
          </Text>
        </Animated.View>
        
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              {t('statistics_page.loading') || 'Loading statistics...'}
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
        ) : (
          <View>
            <View style={styles.statsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityLabel={t('statistics_page.aria.key_stats')}>
                {t('statistics_page.key_metrics') || 'Key Metrics'}
              </Text>
              <View style={styles.statsContainer}>
                <StatCard 
                  icon={Ionicons}
                  iconName="people"
                  label={t('statistics_page.users')} 
                  value={data?.userCount || 0} 
                  loading={loading} 
                  colors={colors} 
                  colorScheme={colorScheme}
                />
                <StatCard 
                  icon={MaterialCommunityIcons}
                  iconName="post"
                  label={t('statistics_page.posts')} 
                  value={data?.postCount || 0} 
                  loading={loading} 
                  colors={colors} 
                  colorScheme={colorScheme}
                />
                <StatCard 
                  icon={FontAwesome5}
                  iconName="globe-americas"
                  label={t('statistics_page.countries')} 
                  value={data?.countryCount || 0} 
                  loading={loading} 
                  colors={colors} 
                  colorScheme={colorScheme}
                />
                <StatCard 
                  icon={MaterialCommunityIcons}
                  iconName="city-variant"
                  label={t('statistics_page.cities')} 
                  value={data?.cityCount || 0} 
                  loading={loading} 
                  colors={colors} 
                  colorScheme={colorScheme}
                />
              </View>
            </View>

            <View style={styles.lastUserSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityLabel={t('statistics_page.aria.latest_user')}>
                {t('statistics_page.newest_member')}
              </Text>
              <LastUserCard 
                user={data?.lastUser} 
                loading={loading} 
                colors={colors} 
                colorScheme={colorScheme}
              />
              
              {/* Activity summary card */}
              {data?.activitySummary && (
                <View style={[
                  styles.activityCard, 
                  { 
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    ...Platform.select({
                      ios: {
                        shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
                        shadowColor: colorScheme === 'dark' ? '#000' : '#000',
                      },
                      android: {
                        elevation: colorScheme === 'dark' ? 6 : 3,
                      },
                    }),
                  }
                ]}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>
                    {t('statistics_page.recent_activity') || 'Recent Activity'}
                  </Text>
                  <View style={styles.activityMetrics}>
                    <View style={styles.activityMetric}>
                      <Text style={[styles.activityValue, { color: colors.primary }]}>
                        {data?.activitySummary?.lastWeek || 0}
                      </Text>
                      <Text style={[styles.activityLabel, { color: colors.text }]}>
                        {t('statistics_page.last_week') || 'Last Week'}
                      </Text>
                    </View>
                    <View style={[styles.activityDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                    <View style={styles.activityMetric}>
                      <Text style={[styles.activityValue, { color: colors.primary }]}>
                        {data?.activitySummary?.lastMonth || 0}
                      </Text>
                      <Text style={[styles.activityLabel, { color: colors.text }]}>
                        {t('statistics_page.last_month') || 'Last Month'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
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
  content: {
    flex: 1,
  },
  header: {
    marginBottom: 30,
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
  statsSection: {
    marginBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
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
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statMeta: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  lastUserSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  lastUserCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  lucHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  lucAvatarContainer: {
    marginRight: 16,
  },
  lucAvatarGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  lucMeta: {
    flex: 1,
  },
  lucName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  lucEmail: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  lucBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  lucBadgeIcon: {
    marginRight: 4,
  },
  lucBadgeText: {
    fontSize: 12,
    color: '#FF8F00',
    fontWeight: '500',
  },
  lucFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  lucLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  lucDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityCard: {
    borderRadius: 16,
    padding: 20,
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
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  activityMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  activityMetric: {
    alignItems: 'center',
  },
  activityValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  activityDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },
});

export default StatisticsScreen;
