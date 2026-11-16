import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../common/AppText';
import {
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  XIcon,
} from '../../icons/Icons';
import { Fonts } from '../../styles/Fonts';
import { CalendarView } from './DatePicker';
import { TimeWheelView } from './TimePicker';
import {
  clampTimeToRange,
  formatDisplayDate,
  formatLocalDateISO,
  formatTimeString,
  getPickerTheme,
  isSameDay,
  parseLocalDate,
  parseTimeValue,
  snapMinuteToInterval,
} from '../../utils/pickerUtils';

const DateTimePicker = ({
  visible: controlledVisible,
  onClose,
  value,
  onChange,
  minimumDateTime,
  maximumDateTime,
  minuteInterval = 5,
  format = '12h',
  required = false,
  placeholder = 'Select date & time',
  title = 'Schedule Date & Time',
  locale = 'en-US',
  theme = 'light',
  style,
}) => {
  const insets = useSafeAreaInsets();
  const palette = useMemo(() => getPickerTheme(theme), [theme]);

  const isControlled = controlledVisible !== undefined;
  const [internalVisible, setInternalVisible] = useState(false);
  const visible = isControlled ? controlledVisible : internalVisible;

  const [activeTab, setActiveTab] = useState('date'); // 'date' | 'time'
  const [draftDate, setDraftDate] = useState(formatLocalDateISO(new Date()));
  const [draftHour24, setDraftHour24] = useState(10);
  const [draftMinute, setDraftMinute] = useState(0);

  const slideAnim = useRef(new Animated.Value(24)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const minDateObj = useMemo(
    () => (minimumDateTime ? new Date(minimumDateTime) : null),
    [minimumDateTime]
  );
  const maxDateObj = useMemo(
    () => (maximumDateTime ? new Date(maximumDateTime) : null),
    [maximumDateTime]
  );

  useEffect(() => {
    if (!visible) return;
    setActiveTab('date');

    let initDate = formatLocalDateISO(new Date());
    let initHour = 10;
    let initMin = 0;

    if (value instanceof Date && !isNaN(value.getTime())) {
      initDate = formatLocalDateISO(value);
      initHour = value.getHours();
      initMin = snapMinuteToInterval(value.getMinutes(), minuteInterval);
    } else if (typeof value === 'string' && value.trim()) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        initDate = formatLocalDateISO(parsed);
        initHour = parsed.getHours();
        initMin = snapMinuteToInterval(parsed.getMinutes(), minuteInterval);
      }
    } else if (value && typeof value === 'object') {
      if (value.date) {
        const d = parseLocalDate(value.date);
        if (d) initDate = formatLocalDateISO(d);
      }
      if (value.time) {
        const t = parseTimeValue(value.time);
        if (t) {
          initHour = t.hour24;
          initMin = snapMinuteToInterval(t.minute, minuteInterval);
        }
      }
    }

    setDraftDate(initDate);
    setDraftHour24(initHour);
    setDraftMinute(initMin);

    slideAnim.setValue(24);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 210,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 210,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, value, minuteInterval, slideAnim, opacityAnim]);

  const effectiveMinTime = useMemo(() => {
    if (!minDateObj || isNaN(minDateObj.getTime())) return null;
    if (draftDate && isSameDay(draftDate, minDateObj)) {
      return `${String(minDateObj.getHours()).padStart(2, '0')}:${String(minDateObj.getMinutes()).padStart(2, '0')}`;
    }
    return null;
  }, [minDateObj, draftDate]);

  const effectiveMaxTime = useMemo(() => {
    if (!maxDateObj || isNaN(maxDateObj.getTime())) return null;
    if (draftDate && isSameDay(draftDate, maxDateObj)) {
      return `${String(maxDateObj.getHours()).padStart(2, '0')}:${String(maxDateObj.getMinutes()).padStart(2, '0')}`;
    }
    return null;
  }, [maxDateObj, draftDate]);

  useEffect(() => {
    const clamped = clampTimeToRange(
      draftHour24,
      draftMinute,
      effectiveMinTime,
      effectiveMaxTime
    );
    if (clamped.hour24 !== draftHour24 || clamped.minute !== draftMinute) {
      setDraftHour24(clamped.hour24);
      setDraftMinute(snapMinuteToInterval(clamped.minute, minuteInterval));
    }
  }, [
    effectiveMinTime,
    effectiveMaxTime,
    draftHour24,
    draftMinute,
    minuteInterval,
  ]);

  const closeModal = () => {
    if (isControlled) {
      onClose?.();
    } else {
      setInternalVisible(false);
    }
  };

  const handleConfirm = () => {
    const dateStr = draftDate || formatLocalDateISO(new Date());
    const timeStr = formatTimeString(draftHour24, draftMinute, format);
    const localDate = parseLocalDate(dateStr);
    const combined = new Date(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
      draftHour24,
      draftMinute,
      0,
      0
    );

    if (value instanceof Date) {
      onChange?.(combined);
    } else {
      onChange?.({
        date: dateStr,
        time: timeStr,
        dateTime: combined,
      });
    }
    closeModal();
  };

  const handleClear = () => {
    if (required) return;
    if (value instanceof Date) {
      onChange?.(null);
    } else {
      onChange?.({ date: '', time: '', dateTime: null });
    }
    closeModal();
  };

  const formattedTime = formatTimeString(draftHour24, draftMinute, format);
  const formattedDate = draftDate
    ? formatDisplayDate(draftDate, locale)
    : 'No date';

  const renderModal = () => (
    <Modal
      visible={Boolean(visible)}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeModal}
    >
      <View style={[styles.overlay, { backgroundColor: palette.overlay }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeModal}
          accessibilityLabel="Close date and time picker"
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.sheetBg,
              borderColor: palette.border,
              paddingBottom: Math.max(insets.bottom, 16),
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: palette.handle }]} />

          <View style={[styles.header, { borderBottomColor: palette.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: palette.textSecondary }]}>
                {title}
              </Text>
              <Text
                style={[styles.selectedPreview, { color: palette.text }]}
                numberOfLines={1}
              >
                {formattedDate} • {formattedTime}
              </Text>
            </View>
            <TouchableOpacity
              onPress={closeModal}
              style={[
                styles.closeBtn,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <XIcon size={16} color={palette.textSecondary} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.tabRow,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => setActiveTab('date')}
              style={[
                styles.tabBtn,
                activeTab === 'date' && { backgroundColor: palette.primary },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Select Date step"
              accessibilityState={{ selected: activeTab === 'date' }}
            >
              <CalendarIcon
                size={14}
                color={
                  activeTab === 'date'
                    ? palette.primaryText
                    : palette.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'date'
                        ? palette.primaryText
                        : palette.textSecondary,
                  },
                ]}
              >
                Date
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('time')}
              style={[
                styles.tabBtn,
                activeTab === 'time' && { backgroundColor: palette.primary },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Select Time step"
              accessibilityState={{ selected: activeTab === 'time' }}
            >
              <ClockIcon
                size={14}
                color={
                  activeTab === 'time'
                    ? palette.primaryText
                    : palette.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'time'
                        ? palette.primaryText
                        : palette.textSecondary,
                  },
                ]}
              >
                Time
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {activeTab === 'date' ? (
              <CalendarView
                mode="single"
                selectedDate={draftDate}
                onSelectDate={(iso) => {
                  setDraftDate(iso);
                  setActiveTab('time');
                }}
                minimumDate={minDateObj}
                maximumDate={maxDateObj}
                locale={locale}
                palette={palette}
              />
            ) : (
              <TimeWheelView
                hour24={draftHour24}
                minute={draftMinute}
                onChangeTime={(h, m) => {
                  setDraftHour24(h);
                  setDraftMinute(m);
                }}
                format={format}
                minuteInterval={minuteInterval}
                minimumTime={effectiveMinTime}
                maximumTime={effectiveMaxTime}
                palette={palette}
              />
            )}
          </View>

          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <View>
              {!required && Boolean(value) && (
                <TouchableOpacity
                  onPress={handleClear}
                  style={[
                    styles.clearBtn,
                    { borderColor: palette.border, backgroundColor: palette.surface },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Clear date and time"
                >
                  <Text style={[styles.clearText, { color: palette.accent }]}>
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.footerRight}>
              <TouchableOpacity
                onPress={closeModal}
                style={[
                  styles.cancelBtn,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text
                  style={[styles.cancelText, { color: palette.textSecondary }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                style={[styles.confirmBtn, { backgroundColor: palette.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Confirm date and time"
              >
                <Text style={[styles.confirmText, { color: palette.primaryText }]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  if (isControlled) {
    return renderModal();
  }

  const triggerHasValue = Boolean(
    value instanceof Date ||
      (typeof value === 'string' && value.trim()) ||
      (value && typeof value === 'object' && (value.date || value.time))
  );
  const triggerText = triggerHasValue
    ? `${formattedDate} • ${formattedTime}`
    : placeholder;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.triggerBtn,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
          style,
        ]}
        onPress={() => setInternalVisible(true)}
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${triggerText}`}
      >
        <CalendarIcon size={16} color={palette.primary} />
        <Text
          style={[
            styles.triggerText,
            { color: triggerHasValue ? palette.text : palette.textMuted },
          ]}
          numberOfLines={1}
        >
          {triggerText}
        </Text>
        <ChevronRightIcon size={16} color={palette.textMuted} />
      </TouchableOpacity>
      {renderModal()}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '92%',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: Fonts.sizes.xs,
    fontFamily: Fonts.family.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  selectedPreview: {
    fontSize: Fonts.sizes.md,
    fontFamily: Fonts.family.bold,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginTop: 14,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabText: {
    fontSize: Fonts.sizes.sm,
    fontFamily: Fonts.family.semiBold,
  },
  body: {
    paddingVertical: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearText: {
    fontSize: Fonts.sizes.sm,
    fontFamily: Fonts.family.semiBold,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: Fonts.sizes.sm,
    fontFamily: Fonts.family.semiBold,
  },
  confirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  confirmText: {
    fontSize: Fonts.sizes.sm,
    fontFamily: Fonts.family.bold,
  },
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  triggerText: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    fontFamily: Fonts.family.medium,
  },
});

export default DateTimePicker;
