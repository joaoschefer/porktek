// src/navigation/MainTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeStack from './HomeStack';
import CalendarScreen from '../screens/CalendarScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Início"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';
          if (route.name === 'Calendário') iconName = 'calendar-month';
          else if (route.name === 'Início') iconName = 'home';
          else if (route.name === 'Config') iconName = 'cog';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#D2691E',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 60 + (insets.bottom || 0),
          paddingBottom: (insets.bottom || 10),
          paddingTop: 8,
        },
      })}
    >
      <Tab.Screen name="Calendário" component={CalendarScreen} />
      <Tab.Screen name="Início" component={HomeStack} />
      <Tab.Screen name="Config" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
