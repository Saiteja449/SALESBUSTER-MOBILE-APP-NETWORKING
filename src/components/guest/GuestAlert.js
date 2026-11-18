import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from '../common/AppText';
import BrandGradientBackground from '../common/BrandGradientBackground';
import { Fonts } from '../../styles/Fonts';
import { getFriendlyErrorMessage } from '../../utils/formatters';

const sanitizeAlertTitle = (title) => {
  if (!title || typeof title !== 'string') return 'Notice';
  const trimmed = title.trim();
  if (/^error$/i.test(trimmed)) return 'Unable to Complete';
  if (/status code/i.test(trimmed)) return 'Notice';
  return trimmed;
};

/** Themed replacement for native Alert.alert in guest flows. */
export const useGuestAlert = () => {
  const [config, setConfig] = useState(null);

  const showGuestAlert = useCallback(
    (title, message, buttons = [{ text: 'OK' }]) => {
      const sanitizedTitle = sanitizeAlertTitle(title);
      const sanitizedMessage = getFriendlyErrorMessage(
        message,
        'Something went wrong. Please check your details and try again.'
      );
      setConfig({
        title: sanitizedTitle,
        message: sanitizedMessage,
        buttons: buttons?.length ? buttons : [{ text: 'OK' }],
      });
    },
    []
  );

  const dismiss = useCallback((button) => {
    setConfig(null);
    button?.onPress?.();
  }, []);

  const guestAlertModal = (
    <Modal
      visible={Boolean(config)}
      transparent
      animationType="fade"
      onRequestClose={() => dismiss()}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.accent} />
          <Text style={styles.title}>{config?.title}</Text>
          <Text style={styles.message}>{config?.message}</Text>
          <View style={[styles.actions, config?.buttons?.length > 2 && styles.actionsStacked]}>
            {config?.buttons?.map((button, index) => {
              const destructive = button.style === 'destructive';
              const cancel = button.style === 'cancel';
              return (
                <TouchableOpacity
                  key={`${button.text}-${index}`}
                  style={[
                    styles.button,
                    config.buttons.length === 1 && styles.singleButton,
                    destructive && styles.destructiveButton,
                    cancel && styles.cancelButton,
                  ]}
                  onPress={() => dismiss(button)}
                  activeOpacity={0.82}
                >
                  {!destructive && !cancel && (
                    <BrandGradientBackground id={`alert_btn_grad_${index}`} borderRadius={12} />
                  )}
                  <Text style={[
                    styles.buttonText,
                    cancel && styles.cancelText,
                    destructive && styles.buttonText,
                  ]}>{button.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );

  return { showGuestAlert, guestAlertModal };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 5, 15, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#17162A',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#363252',
    overflow: 'hidden',
  },
  accent: {
    height: 3,
    backgroundColor: '#8B5CF6',
    marginHorizontal: -22,
    marginTop: -22,
    marginBottom: 18,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: Fonts.family.bold,
    marginBottom: 8,
  },
  message: {
    color: '#B9B5CD',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.family.regular,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  actionsStacked: {
    flexDirection: 'column-reverse',
  },
  button: {
    minWidth: 92,
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#4013C7',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleButton: {
    minWidth: 104,
  },
  cancelButton: {
    backgroundColor: '#28263D',
    borderWidth: 1,
    borderColor: '#44415D',
  },
  destructiveButton: {
    backgroundColor: '#B4233C',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
  },
  cancelText: {
    color: '#D0CCDF',
  },
});

export default useGuestAlert;
