import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { ScrollView, Keyboard, Platform, StyleSheet } from 'react-native';

export const KeyboardScrollContext = createContext(null);

export const KeyboardAwareScrollView = React.forwardRef(
  ({ children, style, contentContainerStyle, extraHeight = 80, ...props }, ref) => {
    const internalScrollRef = useRef(null);
    const scrollRef = ref || internalScrollRef;
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

      const showSub = Keyboard.addListener(showEvent, (e) => {
        const height = e.endCoordinates?.height || 280;
        setKeyboardHeight(height);
      });

      const hideSub = Keyboard.addListener(hideEvent, () => {
        setKeyboardHeight(0);
      });

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);

    const scrollToInput = useCallback(
      (yCoord) => {
        if (typeof yCoord === 'number' && scrollRef.current) {
          scrollRef.current.scrollTo({
            y: Math.max(0, yCoord - extraHeight),
            animated: true,
          });
        }
      },
      [extraHeight, scrollRef]
    );

    const flatContent = StyleSheet.flatten(contentContainerStyle) || {};
    const basePaddingBottom = typeof flatContent.paddingBottom === 'number' ? flatContent.paddingBottom : 40;

    return (
      <KeyboardScrollContext.Provider value={{ scrollToInput, keyboardHeight, scrollRef }}>
        <ScrollView
          ref={scrollRef}
          style={style}
          contentContainerStyle={[
            flatContent,
            {
              flexGrow: 1,
              paddingBottom: basePaddingBottom + (keyboardHeight > 0 ? keyboardHeight + 40 : 0),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          {...props}
        >
          {children}
        </ScrollView>
      </KeyboardScrollContext.Provider>
    );
  }
);

KeyboardAwareScrollView.displayName = 'KeyboardAwareScrollView';
export default KeyboardAwareScrollView;

