import React, { useCallback, useContext, useMemo, useRef } from 'react';
import { TextInput as RNTextInput, StyleSheet } from 'react-native';
import { Fonts } from '../../styles/Fonts';
import { buildFontStyle } from './AppText';
import { KeyboardScrollContext } from './KeyboardAwareScrollView';

const AppTextInput = React.memo(
  React.forwardRef(({ style, onFocus, onLayout, ...props }, ref) => {
    const localRef = useRef(null);
    const inputRef = ref || localRef;
    const layoutYRef = useRef(0);
    const kbContext = useContext(KeyboardScrollContext);

    const finalStyle = useMemo(
      () => buildFontStyle(styles.defaultInput, style),
      [style]
    );

    const handleLayout = useCallback(
      (e) => {
        layoutYRef.current = e.nativeEvent?.layout?.y || 0;
        if (onLayout) onLayout(e);
      },
      [onLayout]
    );

    const handleFocus = useCallback(
      (e) => {
        if (kbContext?.scrollToInput) {
          if (inputRef.current && kbContext.scrollRef?.current) {
            try {
              inputRef.current.measureLayout(
                kbContext.scrollRef.current,
                (_x, y) => {
                  kbContext.scrollToInput(y);
                },
                () => {
                  if (layoutYRef.current > 0) {
                    kbContext.scrollToInput(layoutYRef.current);
                  }
                }
              );
            } catch (_err) {
              if (layoutYRef.current > 0) {
                kbContext.scrollToInput(layoutYRef.current);
              }
            }
          } else if (layoutYRef.current > 0) {
            kbContext.scrollToInput(layoutYRef.current);
          }
        }
        if (onFocus) onFocus(e);
      },
      [kbContext, inputRef, onFocus]
    );

    return (
      <RNTextInput
        ref={inputRef}
        style={finalStyle}
        onLayout={handleLayout}
        onFocus={handleFocus}
        {...props}
      />
    );
  })
);

AppTextInput.displayName = 'AppTextInput';

const styles = StyleSheet.create({
  defaultInput: {
    fontFamily: Fonts.family.regular,
  },
});

export { AppTextInput };
export default AppTextInput;

