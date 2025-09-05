import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  Linking,
  Platform,
  Animated
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useI18n } from '../i18n';
import { useThemeContext } from '../theme/ThemeContext';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get('window');

// WhyBerllog Section Component
const WhyBerllogSection = ({ colors, t, animValues }) => {
  return (
    <View style={[styles.section, styles.whyBerllogSection]}>
      <Animated.View style={[styles.sectionContent, {
        opacity: animValues.fadeIn,
        transform: [{ translateY: animValues.translateY }]
      }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('why_berllog_title')}
        </Text>
        <Text style={[styles.sectionText, { color: colors.text + 'DD' }]}>
          {t('why_berllog_content')}
        </Text>
      </Animated.View>
      
      <Animated.View style={[styles.middleImageContainer, {
        opacity: animValues.fadeIn,
        transform: [{ scale: animValues.scale }]
      }]}>
        <Image 
          // source={require('../../assets/adaptive-icon.png')} 
          style={styles.middleImage} 
          resizeMode="contain"
        />
      </Animated.View>
      
      <Animated.View style={{
        opacity: animValues.fadeIn,
        transform: [{ translateY: animValues.translateY2 }]
      }}>
        <Text style={[styles.highlightText, { color: colors.primary }]}>
          {t('every_contribution')}
        </Text>
      </Animated.View>
    </View>
  );
};

// Download Section Component
const DownloadSection = ({ colors, t, animValues }) => {
  const handleDownload = (platform) => {
    // These URLs should be replaced with actual app store links
    const urls = {
      ios: 'https://apps.apple.com/app/berllog/id123456789',
      android: 'https://play.google.com/store/apps/details?id=com.berllog.app'
    };
    
    Linking.openURL(urls[platform]).catch(err => {
      console.error('Failed to open URL:', err);
    });
  };
  
  return (
    <View style={[styles.section, styles.downloadSection]}>
      <View style={styles.downloadContainer}>
        <Animated.View style={[styles.downloadContent, {
          opacity: animValues.fadeIn,
          transform: [{ translateX: animValues.translateXLeft }]
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('download_app_title')}
          </Text>
          <Text style={[styles.sectionText, { color: colors.text + 'DD' }]}>
            {t('download_app_content')}
          </Text>
          
          <View style={styles.storeButtonsContainer}>
            <TouchableOpacity 
              style={[styles.storeButton, { backgroundColor: colors.card }]}
              onPress={() => handleDownload('ios')}
            >
              <Ionicons name="logo-apple" size={24} color={colors.text} />
              <Text style={[styles.storeButtonText, { color: colors.text }]}>App Store</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.storeButton, { backgroundColor: colors.card }]}
              onPress={() => handleDownload('android')}
            >
              <Ionicons name="logo-google-playstore" size={24} color={colors.text} />
              <Text style={[styles.storeButtonText, { color: colors.text }]}>Play Store</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        
        <Animated.View style={[styles.phoneImageContainer, {
          opacity: animValues.fadeIn,
          transform: [{ translateX: animValues.translateXRight }]
        }]}>
          <View style={[styles.phoneBg, { backgroundColor: colors.card }]}>
            <Image 
              // source={require('../../assets/adaptive-icon.png')} 
              style={styles.phoneImage} 
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

// Circle Stats Component
const CircleStats = ({ colors, t, animValues }) => {
  // Sample stats data - in a real app, this would come from an API
  const stats = [
    { icon: 'people', number: '5000+', title: t('circle_users') },
    { icon: 'public', number: '30+', title: t('circle_countries') },
    { icon: 'location-city', number: '100+', title: t('circle_cities') },
    { icon: 'delete-sweep', number: '1000+', title: t('circle_cleanups') }
  ];
  
  return (
    <View style={[styles.section, styles.circlesSection]}>
      <View style={styles.circlesContainer}>
        {stats.map((stat, index) => (
          <Animated.View 
            key={index} 
            style={[styles.circleItem, {
              opacity: animValues.fadeIn,
              transform: [{ translateY: Animated.multiply(animValues.translateY, new Animated.Value(1 + index * 0.2)) }]
            }]}
          >
            <View style={[styles.circleIconBorder, { borderColor: colors.primary }]}>
              <View style={[styles.circleIcon, { backgroundColor: colors.primary + '20' }]}>
                <MaterialIcons name={stat.icon} size={28} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.circleNumber, { color: colors.text }]}>{stat.number}</Text>
            <Text style={[styles.circleTitle, { color: colors.text + 'AA' }]}>{stat.title}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

// Center Section Component
const CenterSection = ({ colors, t, animValues }) => {
  return (
    <View style={[styles.section, styles.centerSection]}>
      <View style={styles.centerContainer}>
        <Animated.View style={[styles.centerContent, {
          opacity: animValues.fadeIn,
          transform: [{ translateX: animValues.translateXLeft }]
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('center_title')}
          </Text>
          <Text style={[styles.sectionText, { color: colors.text + 'DD' }]}>
            {t('center_content')}
          </Text>
        </Animated.View>
        
        {/* <Animated.View style={[styles.centerImagesContainer, {
          opacity: animValues.fadeIn,
          transform: [{ translateX: animValues.translateXRight }]
        }]}>
          <View style={[styles.circleImageBg, { backgroundColor: colors.primary + '20' }]} />
          <View style={[styles.recycleBinContainer, { backgroundColor: colors.card }]}>
            <FontAwesome5 name="recycle" size={32} color={colors.primary} />
          </View>
          <View style={[styles.greenContainer, { backgroundColor: colors.card }]}>
            <MaterialIcons name="eco" size={32} color={colors.primary} />
          </View>
          <View style={[styles.treeIconContainer, { backgroundColor: colors.primary + '30' }]}>
            <FontAwesome5 name="tree" size={28} color={colors.primary} />
          </View>
        </Animated.View> */}
      </View>
    </View>
  );
};

const AboutScreen = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isDarkMode } = useThemeContext();
  
  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const translateY2 = useRef(new Animated.Value(30)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const translateXLeft = useRef(new Animated.Value(-50)).current;
  const translateXRight = useRef(new Animated.Value(50)).current;
  
  // Animation values object to pass to components
  const animValues = {
    fadeIn,
    translateY,
    translateY2,
    scale,
    translateXLeft,
    translateXRight
  };
  
  // Run animations when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateY2, {
        toValue: 0,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(translateXLeft, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateXRight, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: isDarkMode ? colors.background : '#f7f9fc' }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <WhyBerllogSection colors={colors} t={t} animValues={animValues} />
      <DownloadSection colors={colors} t={t} animValues={animValues} />
      <CircleStats colors={colors} t={t} animValues={animValues} />
      <CenterSection colors={colors} t={t} animValues={animValues} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  section: {
    padding: 20,
    marginBottom: 20,
  },
  sectionContent: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  
  // WhyBerllog Section Styles
  whyBerllogSection: {
    alignItems: 'center',
  },
  middleImageContainer: {
    width: width * 0.7,
    height: width * 0.5,
    marginVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleImage: {
    width: '100%',
    height: '100%',
  },
  highlightText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
  },
  
  // Download Section Styles
  downloadSection: {
    paddingVertical: 30,
  },
  downloadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  downloadContent: {
    flex: 1,
    minWidth: 300,
    marginBottom: 20,
  },
  storeButtonsContainer: {
    flexDirection: 'row',
    marginTop: 24,
    justifyContent: 'center',
  },
  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 8,
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
  storeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  phoneImageContainer: {
    flex: 1,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneBg: {
    width: 180,
    height: 320,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  phoneImage: {
    width: 150,
    height: 280,
  },
  
  // Circles Section Styles
  circlesSection: {
    paddingVertical: 30,
  },
  circlesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  circleItem: {
    alignItems: 'center',
    width: width > 600 ? '25%' : '50%',
    marginBottom: 30,
  },
  circleIconBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  circleIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  circleTitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Center Section Styles
  centerSection: {
    paddingVertical: 30,
  },
  centerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    minWidth: 300,
    marginBottom: 20,
  },
  centerImagesContainer: {
    flex: 1,
    minWidth: 200,
    height: 300,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleImageBg: {
    width: 200,
    height: 200,
    borderRadius: 100,
    position: 'absolute',
  },
  recycleBinContainer: {
    position: 'absolute',
    top: 40,
    left: 30,
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
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
  greenContainer: {
    position: 'absolute',
    bottom: 60,
    right: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
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
  treeIconContainer: {
    position: 'absolute',
    top: 120,
    right: 80,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AboutScreen;
