import React, { useMemo } from 'react';
import { Text as RNText, StyleSheet, Platform } from 'react-native';
import { Fonts } from '../../styles/Fonts';

const IS_ANDROID = Platform.OS === 'android';

const WEIGHT_TO_FAMILY = {
  '800': Fonts.family.extraBold,
  '900': Fonts.family.extraBold,
  extrabold: Fonts.family.extraBold,
  black: Fonts.family.extraBold,
  '700': Fonts.family.bold,
  bold: Fonts.family.bold,
  '600': Fonts.family.semiBold,
  semibold: Fonts.family.semiBold,
  '500': Fonts.family.medium,
  medium: Fonts.family.medium,
};

const FAMILY_STYLE_OVERRIDES = {
  [Fonts.family.regular]: IS_ANDROID
    ? { fontFamily: Fonts.family.regular, fontWeight: undefined }
    : { fontFamily: Fonts.family.regular },
  [Fonts.family.medium]: IS_ANDROID
    ? { fontFamily: Fonts.family.medium, fontWeight: undefined }
    : { fontFamily: Fonts.family.medium },
  [Fonts.family.semiBold]: IS_ANDROID
    ? { fontFamily: Fonts.family.semiBold, fontWeight: undefined }
    : { fontFamily: Fonts.family.semiBold },
  [Fonts.family.bold]: IS_ANDROID
    ? { fontFamily: Fonts.family.bold, fontWeight: undefined }
    : { fontFamily: Fonts.family.bold },
  [Fonts.family.extraBold]: IS_ANDROID
    ? { fontFamily: Fonts.family.extraBold, fontWeight: undefined }
    : { fontFamily: Fonts.family.extraBold },
};

const lookupFontFamily = (weight) => {
  if (!weight) return Fonts.family.regular;
  return WEIGHT_TO_FAMILY[String(weight).toLowerCase().trim()] || Fonts.family.regular;
};

export const resolveFontFamily = (flatStyle) => {
  if (flatStyle?.fontFamily) {
    return flatStyle.fontFamily;
  }
  return lookupFontFamily(flatStyle?.fontWeight);
};

export const resolveStyleFontFamily = (style) => {
  if (!style) return Fonts.family.regular;

  if (!Array.isArray(style)) {
    if (typeof style === 'object') {
      if (style.fontFamily) return style.fontFamily;
      return style.fontWeight ? lookupFontFamily(style.fontWeight) : Fonts.family.regular;
    }
    const flat = StyleSheet.flatten(style);
    return resolveFontFamily(flat);
  }

  let fontFamily;
  let fontWeight;
  for (let i = 0; i < style.length; i += 1) {
    const item = style[i];
    if (!item) continue;
    if (typeof item === 'number') {
      const flat = StyleSheet.flatten(style);
      return resolveFontFamily(flat);
    }
    if (Array.isArray(item)) {
      const nestedFlat = StyleSheet.flatten(style);
      return resolveFontFamily(nestedFlat);
    }
    if (typeof item === 'object') {
      if (item.fontFamily) fontFamily = item.fontFamily;
      if (item.fontWeight !== undefined) fontWeight = item.fontWeight;
    }
  }

  if (fontFamily) return fontFamily;
  return fontWeight ? lookupFontFamily(fontWeight) : Fonts.family.regular;
};

export const buildFontStyle = (baseStyle, style) => {
  if (!style) return baseStyle;
  const resolvedFamily = resolveStyleFontFamily(style);
  const override = FAMILY_STYLE_OVERRIDES[resolvedFamily];
  if (override) {
    return [baseStyle, style, override];
  }
  return IS_ANDROID && typeof resolvedFamily === 'string' && resolvedFamily.startsWith('Inter-')
    ? [baseStyle, style, { fontFamily: resolvedFamily, fontWeight: undefined }]
    : [baseStyle, style, { fontFamily: resolvedFamily }];
};

const AppText = React.memo(({ style, ...props }) => {
  const finalStyle = useMemo(
    () => buildFontStyle(styles.defaultText, style),
    [style]
  );

  return <RNText style={finalStyle} {...props} />;
});

AppText.displayName = 'AppText';

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: Fonts.family.regular,
  },
});

export { AppText };
export default AppText;
