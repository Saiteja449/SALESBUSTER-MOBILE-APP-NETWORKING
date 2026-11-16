import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Text from '../components/common/AppText';
import GuestHomeScreen from '../screens/guest/GuestHomeScreen';
import EventContactsScreen from '../screens/guest/EventContactsScreen';
import GuestAccountScreen from '../screens/guest/GuestAccountScreen';
import { Colors } from '../styles/Colors';
import { Fonts } from '../styles/Fonts';
import { MicIcon, UserIcon } from '../icons/Icons';

const Tab = createBottomTabNavigator();

const TabIcon = ({ icon, label, focused, activeColor = '#9333EA' }) => (
  <View style={styles.tabIconContainer}>
    <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
      {icon}
    </View>
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      style={[styles.tabLabel, focused && [styles.tabLabelFocused, { color: activeColor }]]}
    >
      {label}
    </Text>
    {focused && <View style={[styles.activeIndicator, { backgroundColor: activeColor }]} />}
  </View>
);

export const GuestTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="GuestHome"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="GuestHome"
        component={GuestHomeScreen}
      />
      <Tab.Screen
        name="EventContacts"
        component={EventContactsScreen}
      />
      <Tab.Screen
        name="GuestAccount"
        component={GuestAccountScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={
                <UserIcon
                  size={22}
                  color={focused ? '#9333EA' : Colors.tabInactive}
                />
              }
              label="Account / Upgrade"
              focused={focused}
              activeColor="#9333EA"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.borderLight,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    position: 'relative',
    minWidth: 70,
  },
  iconWrap: {
    padding: 2,
  },
  iconWrapFocused: {
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: Fonts.family.medium,
    color: Colors.tabInactive,
    marginTop: 2,
  },
  tabLabelFocused: {
    fontFamily: Fonts.family.semiBold,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 24,
    height: 3,
    borderRadius: 2,
  },
});

export default GuestTabNavigator;

