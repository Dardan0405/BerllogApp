import React, { useContext } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import RankingScreen from '../screens/RankingScreen';
import PollsScreen from '../screens/PollsScreen';
import EventsScreen from '../screens/EventsScreen';
import AboutScreen from '../screens/AboutScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import ReactionTypesScreen from '../screens/ReactionTypesScreen';
import PostDetailsScreen from '../screens/PostDetailsScreen';
import UserDetailsScreen from '../screens/UserDetailsScreen';
import MapScreen from '../screens/MapScreen';
import HeaderBar from '../ui/HeaderBar';
import DrawerContent from './DrawerContent';
import AuthNavigator from './AuthNavigator';
import { AuthContext } from '../auth/AuthContext';
import { useThemeContext } from '../theme/ThemeContext';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { token } = useContext(AuthContext);
  const { isDarkMode } = useThemeContext();

  return (
    <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
      {token ? (
        <Drawer.Navigator
          initialRouteName="Home"
          drawerContent={(props) => <DrawerContent {...props} />}
          screenOptions={{
            header: (props) => <HeaderBar {...props} />,
          }}
        >
          <Drawer.Screen name="Home" component={HomeStackNavigator} options={{ title: 'Berllog' }} />
          <Drawer.Screen name="Ranking" component={RankingStackNavigator} />
          <Drawer.Screen name="Polls" component={PollsScreen} />
          <Drawer.Screen name="Events" component={EventsScreen} />
          <Drawer.Screen name="Map" component={MapStackNavigator} />
          <Drawer.Screen name="Statistics" component={StatisticsStackNavigator} />
          <Drawer.Screen name="ReactionTypes" component={ReactionTypesScreen} />
          <Drawer.Screen name="About" component={AboutScreen} />
        </Drawer.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

// Create a shared stack for screens that need to be accessed from multiple places
const createScreenStack = (initialRouteName, initialRouteComponent) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen name={initialRouteName} component={initialRouteComponent} />
      <Stack.Screen 
        name="PostDetails" 
        component={PostDetailsScreen} 
        options={({ route }) => ({
          headerShown: true,
          title: 'Post Details'
        })}
      />
      <Stack.Screen 
        name="UserDetails" 
        component={UserDetailsScreen} 
        options={{
          headerShown: true,
          title: 'User Profile'
        }}
      />
    </Stack.Navigator>
  );
};

// Home stack navigator
const HomeStackNavigator = () => {
  return createScreenStack("HomeScreen", HomeScreen);
};

// Ranking stack navigator
const RankingStackNavigator = () => {
  return createScreenStack("RankingScreen", RankingScreen);
};

// Statistics stack navigator
const StatisticsStackNavigator = () => {
  return createScreenStack("StatisticsScreen", StatisticsScreen);
};

// Map stack navigator
const MapStackNavigator = () => {
  return createScreenStack("MapScreen", MapScreen);
};

export default AppNavigator;
