import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get API URL based on environment
const getApiUrl = () => {
  const ENV = process.env.NODE_ENV || 'development';
  
  if (ENV === 'development') {
    // Use local development URL
    if (Platform.OS === 'web') {
      return 'http://localhost:3000';
    } else {
      // For Expo Go on physical devices
      const debuggerHost = Constants.manifest?.debuggerHost;
      if (debuggerHost) {
        const hostUri = debuggerHost.split(':')[0];
        return `http://${hostUri}:3000`;
      }
      return 'http://10.0.2.2:3000'; // Android emulator default
    }
  } else {
    // Production URL
    return 'https://api.berllog.com';
  }
};

// Custom hook to fetch posts data
const usePostsDatas = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/garbage-posts`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process the posts data - normalize image URLs
        const processedPosts = data.map(post => {
          // Process image URLs to ensure they are absolute
          const processImageUrl = (url) => {
            if (!url) return null;
            if (url.startsWith('http')) return url;
            return `${apiUrl}${url}`;
          };

          return {
            ...post,
            beforePicture: processImageUrl(post.beforePicture),
            afterPicture: processImageUrl(post.afterPicture),
            // Ensure lat and lng are valid numbers
            lat: post.lat ? parseFloat(post.lat) : null,
            lng: post.lng ? parseFloat(post.lng) : null
          };
        });
        
        setPosts(processedPosts);
        setError(null);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return posts;
};

export default usePostsDatas;
