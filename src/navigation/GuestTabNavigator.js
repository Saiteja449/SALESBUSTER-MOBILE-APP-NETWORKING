import React from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabActions } from '@react-navigation/native';
import Text from '../components/common/AppText';
import GuestHomeScreen from '../screens/guest/GuestHomeScreen';
import EventContactsScreen from '../screens/guest/EventContactsScreen';
import GuestAccountScreen from '../screens/guest/GuestAccountScreen';
import { Fonts } from '../styles/Fonts';
import { ContactsIcon, HomeIcon, ProfileCardIcon } from '../icons/Icons';

const Tab = createBottomTabNavigator();

const TAB_PRESENTATION = {
  GuestHome: { label: 'Home', Icon: HomeIcon },
  EventContacts: { label: 'Contacts', Icon: ContactsIcon },
  GuestAccount: { label: 'Profile', Icon: ProfileCardIcon },
};

const SmoothGuestTabBar = ({ state, descriptors, navigation }) => {
  const [barWidth, setBarWidth] = React.useState(Dimensions.get('window').width);
  const translateX = React.useRef(new Animated.Value(0)).current;
  const tabWidth = barWidth / state.routes.length;
  const activeTab = TAB_PRESENTATION[state.routes[state.index]?.name] || TAB_PRESENTATION.GuestHome;
  const ActiveIcon = activeTab.Icon;

  React.useEffect(() => {
    const animation = Animated.timing(translateX, {
      toValue: tabWidth * state.index,
      duration: 230,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [state.index, tabWidth, translateX]);

  return (
    <View
      style={styles.tabBar}
      onLayout={event => {
        const measuredWidth = event.nativeEvent.layout.width;
        if (measuredWidth > 0 && measuredWidth !== barWidth) {
          setBarWidth(measuredWidth);
        }
      }}
    >
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const presentation = TAB_PRESENTATION[route.name] || TAB_PRESENTATION.GuestHome;
          const Icon = presentation.Icon;
          const { options } = descriptors[route.key];
          const accessibilityLabel =
            options.tabBarAccessibilityLabel || options.title || presentation.label;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={accessibilityLabel}
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!focused && !event.defaultPrevented) {
                  navigation.dispatch(TabActions.jumpTo(route.name, route.params));
                }
              }}
              onLongPress={() =>
                navigation.emit({ type: 'tabLongPress', target: route.key })
              }
              style={styles.tabButton}
            >
              <View style={[styles.inactiveIcon, focused && styles.hiddenActiveIcon]}>
                <Icon size={26} color="#918DA6" focused={focused} />
              </View>
            </Pressable>
          );
        })}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.activePill,
            {
              width: tabWidth,
              transform: [{ translateX }],
            },
          ]}
        >
          <ActiveIcon size={24} color="#A879FF" focused />
          <Text numberOfLines={1} style={styles.activeLabel}>
            {activeTab.label}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const renderSmoothGuestTabBar = props => <SmoothGuestTabBar {...props} />;

export const GuestTabNavigator = () => (
  <Tab.Navigator
    initialRouteName="GuestHome"
    tabBar={renderSmoothGuestTabBar}
    screenOptions={{
      headerShown: false,
      // Keep tab changes instantaneous so the underlying navigator background
      // cannot flash through while scenes shift between tabs.
      animation: 'none',
      sceneStyle: { backgroundColor: '#0B0A1F' },
    }}
  >
    <Tab.Screen
      name="GuestHome"
      component={GuestHomeScreen}
      options={{ tabBarAccessibilityLabel: 'Home' }}
    />
    <Tab.Screen
      name="EventContacts"
      component={EventContactsScreen}
      options={{ tabBarAccessibilityLabel: 'Contacts' }}
    />
    <Tab.Screen
      name="GuestAccount"
      component={GuestAccountScreen}
      options={{ tabBarAccessibilityLabel: 'Profile' }}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0B0A1F',
    borderTopColor: '#26243A',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 92 : 78,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 20 : 6,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenActiveIcon: {
    opacity: 0,
  },
  activePill: {
    position: 'absolute',
    left: 0,
    top: 7,
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: 'transparent',
  },
  activeLabel: {
    color: '#A879FF',
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
    includeFontPadding: false,
  },
});

export default GuestTabNavigator;
