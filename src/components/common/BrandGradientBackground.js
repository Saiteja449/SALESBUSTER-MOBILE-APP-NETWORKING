import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

export const BRAND_GRADIENT_START = '#4013C7';
export const BRAND_GRADIENT_END = '#9C40FA';

/**
 * BrandGradientBackground
 *
 * Renders the exact SalesBuster brand horizontal linear gradient:
 * #4013C7 (start, offset 0) -> #9C40FA (end, offset 1).
 *
 * Dynamically adapts to the host container's width/height via onLayout,
 * maintaining rounded corners and zero render flicker.
 */
export const BrandGradientBackground = ({
  id = 'brand_grad',
  borderRadius = 14,
  startColor = BRAND_GRADIENT_START,
  endColor = BRAND_GRADIENT_END,
  style,
}) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius,
          overflow: 'hidden',
          backgroundColor: startColor,
        },
        style,
      ]}
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (
          width > 0 &&
          height > 0 &&
          (Math.round(width) !== layout.width || Math.round(height) !== layout.height)
        ) {
          setLayout({ width: Math.round(width), height: Math.round(height) });
        }
      }}
    >
      {layout.width > 0 && layout.height > 0 && (
        <Svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={startColor} />
              <Stop offset="1" stopColor={endColor} />
            </LinearGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={layout.width}
            height={layout.height}
            rx={borderRadius}
            ry={borderRadius}
            fill={`url(#${id})`}
          />
        </Svg>
      )}
    </View>
  );
};

export default BrandGradientBackground;
