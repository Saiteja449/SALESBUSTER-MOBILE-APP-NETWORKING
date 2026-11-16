import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Text from './AppText';
import { Fonts } from '../../styles/Fonts';
import { Colors } from '../../styles/Colors';

export const OrgOwnerTabBar = ({
  activeTab = 'networking',
  onSelectTab,
  tab1Label = 'Networking Hub',
  tab2Label = 'Sales Agent',
}) => {
  const windowWidth = Dimensions.get('window').width;
  const [containerWidth, setContainerWidth] = useState(windowWidth);

  const w = containerWidth || windowWidth;
  const h = 50; // Total height of the tabs
  const topPad = 6; // Padding above the tab top curve
  const botY = h;

  // Tab 1 geometry (Left)
  const w1 = w * 0.54;
  const t1_fl = 0;
  const t1_tl = w * 0.055;
  const t1_tr = w1 - w * 0.065;
  const t1_fr = w1;

  // Tab 2 geometry (Right)
  const w2_start = w * 0.46;
  const t2_fl = w2_start;
  const t2_tl = w2_start + w * 0.065;
  const t2_tr = w - w * 0.055;
  const t2_fr = w;

  // SVG Path for Tab 1 outline (from bottom-left to bottom-right)
  const path1Stroke =
    `M ${t1_fl},${botY} ` +
    `C ${t1_fl + 14},${botY} ${t1_tl - 8},${topPad} ${t1_tl + 14},${topPad} ` +
    `L ${t1_tr - 14},${topPad} ` +
    `C ${t1_tr + 8},${topPad} ${t1_fr - 14},${botY} ${t1_fr},${botY}`;

  // SVG Path for Tab 1 filled shape
  const path1Fill = `${path1Stroke} L ${t1_fr},${botY + 2} L ${t1_fl},${botY + 2} Z`;

  // SVG Path for Tab 2 outline (from bottom-left to bottom-right)
  const path2Stroke =
    `M ${t2_fl},${botY} ` +
    `C ${t2_fl + 14},${botY} ${t2_tl - 8},${topPad} ${t2_tl + 14},${topPad} ` +
    `L ${t2_tr - 14},${topPad} ` +
    `C ${t2_tr + 8},${topPad} ${t2_fr - 14},${botY} ${t2_fr},${botY}`;

  // SVG Path for Tab 2 filled shape
  const path2Fill = `${path2Stroke} L ${t2_fr},${botY + 2} L ${t2_fl},${botY + 2} Z`;

  const isTab1Active = activeTab === 'networking';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isTab1Active ? '#181738' : '#F1F5F9' },
      ]}
      onLayout={e => {
        const measured = e.nativeEvent.layout.width;
        if (measured && Math.abs(measured - containerWidth) > 2) {
          setContainerWidth(measured);
        }
      }}
    >
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        {/* If Tab 1 is active, draw Tab 2 first (behind) then Tab 1 (front) */}
        {isTab1Active ? (
          <>
            {/* Inactive Tab 2 (Behind) */}
            <Path d={path2Fill} fill="#11102C" />
            <Path
              d={path2Stroke}
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={1}
            />
            {/* Inactive Tab 2 Baseline */}
            <Path
              d={`M ${t2_fl},${botY} L ${t2_fr},${botY}`}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={1}
            />

            {/* Active Tab 1 (Front, seamlessly connecting into #0B0A1F below) */}
            <Path d={path1Fill} fill="#0B0A1F" />
            <Path
              d={path1Stroke}
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth={1}
            />
          </>
        ) : (
          <>
            {/* Inactive Tab 1 (Behind) */}
            <Path d={path1Fill} fill="#E2E8F0" />
            <Path
              d={path1Stroke}
              fill="none"
              stroke="#CBD5E1"
              strokeWidth={1}
            />
            {/* Inactive Tab 1 Baseline */}
            <Path
              d={`M ${t1_fl},${botY} L ${t1_fr},${botY}`}
              stroke="#E2E8F0"
              strokeWidth={1}
            />

            {/* Active Tab 2 (Front, seamlessly connecting into #FFFFFF Manager header below) */}
            <Path d={path2Fill} fill="#FFFFFF" />
            <Path
              d={path2Stroke}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={1}
            />
          </>
        )}
      </Svg>

      {/* Touch Buttons Overlay */}
      <View style={styles.touchRow}>
        <TouchableOpacity
          style={[styles.tabBtn, styles.tabBtnLeft]}
          onPress={() => onSelectTab && onSelectTab('networking')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.tabText,
              isTab1Active
                ? styles.tab1TextActive
                : styles.tab1TextInactiveDark,
            ]}
          >
            {tab1Label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, styles.tabBtnRight]}
          onPress={() => onSelectTab && onSelectTab('sales')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.tabText,
              !isTab1Active
                ? styles.tab2TextActive
                : styles.tabTextInactive,
            ]}
          >
            {tab2Label}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 50,
    backgroundColor: '#181738',
    overflow: 'hidden',
  },
  touchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  tabBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnLeft: {
    paddingLeft: 10,
  },
  tabBtnRight: {
    paddingRight: 10,
  },
  tabText: {
    fontSize: 14.5,
    letterSpacing: 0.2,
    textAlign: 'center',
    includeFontPadding: false,
  },
  tab1TextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.family.bold,
  },
  tab2TextActive: {
    color: '#5013C7',
    fontFamily: Fonts.family.bold,
  },
  tabTextInactive: {
    color: '#7E7A9B',
    fontFamily: Fonts.family.medium,
  },
  tab1TextInactiveDark: {
    color: '#64748B',
    fontFamily: Fonts.family.medium,
  },
});

export default OrgOwnerTabBar;
