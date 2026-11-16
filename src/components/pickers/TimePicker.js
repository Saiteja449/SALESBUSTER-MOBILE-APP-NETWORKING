import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../common/AppText';
import { ChevronRightIcon, ClockIcon, XIcon } from '../../icons/Icons';
import { Fonts } from '../../styles/Fonts';
import {
  clampTimeToRange,
  formatTimeString,
  getMinuteOptions,
  getPickerTheme,
  isTimeOutOfRange,
  parseTimeValue,
  snapMinuteToInterval,
  to12HourParts,
  to24Hour,
} from '../../utils/pickerUtils';

const ITEM_HEIGHT = 44;

const QUICK_PRESETS = [
  { label: '09:00 AM', hour24: 9, minute: 0 },
  { label: '11:30 AM', hour24: 11, minute: 30 },
  { label: '02:00 PM', hour24: 14, minute: 0 },
  { label: '04:30 PM', hour24: 16, minute: 30 },
  { label: '06:00 PM', hour24: 18, minute: 0 },
];

/**
 * Reusable time selection wheel body shared between TimePicker and DateTimePicker.
 */
export const TimeWheelView = ({
  hour24,
  minute,
  onChangeTime,
  format = '12h',
  minuteInterval = 5,
  minimumTime,
  maximumTime,
  palette,
}) => {
  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);

  const is24h = format === '24h';
  const { hour12, period } = to12HourParts(hour24);

  const hoursList = useMemo(
    () =>
      is24h
        ? Array.from({ length: 24 }, (_, i) => i)
        : Array.from({ length: 12 }, (_, i) => i + 1),
    [is24h]
  );

  const minutesList = useMemo(
    () => getMinuteOptions(minuteInterval),
    [minuteInterval]
  );

  const activeHourValue = is24h ? hour24 : hour12;

  useEffect(() => {
    const hIndex = hoursList.indexOf(activeHourValue);
    if (hIndex >= 0) {
      setTimeout(() => {
        hourScrollRef.current?.scrollTo({
          y: Math.max(0, hIndex * ITEM_HEIGHT - ITEM_HEIGHT),
          animated: false,
        });
      }, 40);
    }
    const mIndex = minutesList.indexOf(minute);
    if (mIndex >= 0) {
      setTimeout(() => {
        minuteScrollRef.current?.scrollTo({
          y: Math.max(0, mIndex * ITEM_HEIGHT - ITEM_HEIGHT),
          animated: false,
        });
      }, 40);
    }
  }, [activeHourValue, minute, hoursList, minutesList]);

  const handleSelectHour = (hVal) => {
    const nextHour24 = is24h ? hVal : to24Hour(hVal, period);
    const clamped = clampTimeToRange(
      nextHour24,
      minute,
      minimumTime,
      maximumTime
    );
    const snappedMin = snapMinuteToInterval(clamped.minute, minuteInterval);
    onChangeTime(clamped.hour24, snappedMin);
  };

  const handleSelectMinute = (mVal) => {
    if (isTimeOutOfRange(hour24, mVal, minimumTime, maximumTime)) return;
    onChangeTime(hour24, mVal);
  };

  const handleSelectPeriod = (nextPeriod) => {
    const nextHour24 = to24Hour(hour12, nextPeriod);
    const clamped = clampTimeToRange(
      nextHour24,
      minute,
      minimumTime,
      maximumTime
    );
    const snappedMin = snapMinuteToInterval(clamped.minute, minuteInterval);
    onChangeTime(clamped.hour24, snappedMin);
  };

  const validPresets = useMemo(
    () =>
      QUICK_PRESETS.filter(
        (p) => !isTimeOutOfRange(p.hour24, p.minute, minimumTime, maximumTime)
      ),
    [minimumTime, maximumTime]
  );

  return (
    <View>
      <View style={styles.wheelRow}>
        {/* Hour Column */}
        <View style={styles.wheelCol}>
          <Text style={[styles.colLabel, { color: palette.textSecondary }]}>
            Hour
          </Text>
          <View
            style={[
              styles.wheelBox,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <ScrollView
              ref={hourScrollRef}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.wheelContent}
            >
              {hoursList.map((h) => {
                const candidateHour24 = is24h ? h : to24Hour(h, period);
                const allMinutesDisabled = minutesList.every((m) =>
                  isTimeOutOfRange(candidateHour24, m, minimumTime, maximumTime)
                );
                const selected = h === activeHourValue;
                return (
                  <TouchableOpacity
                    key={`h-${h}`}
                    disabled={allMinutesDisabled}
                    onPress={() => handleSelectHour(h)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Hour ${h}`}
                    accessibilityState={{
                      selected,
                      disabled: allMinutesDisabled,
                    }}
                    style={[
                      styles.wheelItem,
                      selected && { backgroundColor: palette.primary },
                      allMinutesDisabled && { opacity: 0.3 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.wheelItemText,
                        { color: palette.text },
                        selected && {
                          color: palette.primaryText,
                          fontFamily: Fonts.family.bold,
                        },
                      ]}
                    >
                      {String(h).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={styles.colonWrap}>
          <Text style={[styles.colonText, { color: palette.textSecondary }]}>
            :
          </Text>
        </View>

        {/* Minute Column */}
        <View style={styles.wheelCol}>
          <Text style={[styles.colLabel, { color: palette.textSecondary }]}>
            Min
          </Text>
          <View
            style={[
              styles.wheelBox,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <ScrollView
              ref={minuteScrollRef}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.wheelContent}
            >
              {minutesList.map((m) => {
                const disabled = isTimeOutOfRange(
                  hour24,
                  m,
                  minimumTime,
                  maximumTime
                );
                const selected = m === minute;
                return (
                  <TouchableOpacity
                    key={`m-${m}`}
                    disabled={disabled}
                    onPress={() => handleSelectMinute(m)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Minute ${String(m).padStart(2, '0')}`}
                    accessibilityState={{ selected, disabled }}
                    style={[
                      styles.wheelItem,
                      selected && { backgroundColor: palette.primary },
                      disabled && { opacity: 0.3 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.wheelItemText,
                        { color: palette.text },
                        selected && {
                          color: palette.primaryText,
                          fontFamily: Fonts.family.bold,
                        },
                      ]}
                    >
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* AM / PM Selector */}
        {!is24h && (
          <View style={styles.periodCol}>
            <Text style={[styles.colLabel, { color: palette.textSecondary }]}>
              Period
            </Text>
            <View style={styles.periodStack}>
              {['AM', 'PM'].map((p) => {
                const selected = period === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => handleSelectPeriod(p)}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityLabel={p}
                    accessibilityState={{ selected }}
                    style={[
                      styles.periodBtn,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                      },
                      selected && {
                        backgroundColor: palette.primary,
                        borderColor: palette.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        { color: palette.text },
                        selected && {
                          color: palette.primaryText,
                          fontFamily: Fonts.family.bold,
                        },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {validPresets.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
        >
          {validPresets.map((preset) => {
            const snappedMin = snapMinuteToInterval(
              preset.minute,
              minuteInterval
            );
            const active =
              hour24 === preset.hour24 && minute === snappedMin;
            const displayLabel = is24h
              ? formatTimeString(preset.hour24, snappedMin, '24h')
              : formatTimeString(preset.hour24, snappedMin, '12h');
            return (
              <TouchableOpacity
                key={preset.label}
                onPress={() => onChangeTime(preset.hour24, snappedMin)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: active
                      ? palette.primarySoft
                      : palette.surface,
                    borderColor: active
                      ? palette.primaryBorder
                      : palette.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Set time to ${displayLabel}`}
              >
                <Text
                  style={[
                    styles.presetText,
                    { color: active ? palette.primary : palette.textSecondary },
                  ]}
                >
                  {displayLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const TimePicker = ({
  visible: controlledVisible,
  onClose,
  value,
  selectedTime,
  onChange,
  onSelect,
  format = '12h',
  minuteInterval = 5,
  minimumTime,
  maximumTime,
  placeholder = 'Select time',
  required = false,
  title = 'Select Time',
  theme = 'light',
  style,
}) => {
  const insets = useSafeAreaInsets();
  const palette = useMemo(() => getPickerTheme(theme), [theme]);

  const isControlled = controlledVisible !== undefined;
  const [internalVisible, setInternalVisible] = useState(false);
  const visible = isControlled ? controlledVisible : internalVisible;

  const currentValue = value !== undefined ? value : selectedTime;
  const emitChange = onChange || onSelect;

  const [draftHour24, setDraftHour24] = useState(10);
  const [draftMinute, setDraftMinute] = useState(0);

  const slideAnim = useRef(new Animated.Value(24)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const parsed = parseTimeValue(currentValue);
    const initialHour = parsed ? parsed.hour24 : 10;
    const initialMin = parsed
      ? snapMinuteToInterval(parsed.minute, minuteInterval)
      : 0;
    const clamped = clampTimeToRange(
      initialHour,
      initialMin,
      minimumTime,
      maximumTime
    );
    setDraftHour24(clamped.hour24);
    setDraftMinute(snapMinuteToInterval(clamped.minute, minuteInterval));

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
  }, [
    visible,
    currentValue,
    minuteInterval,
    minimumTime,
    maximumTime,
    slideAnim,
    opacityAnim,
  ]);

  const closeModal = () => {
    if (isControlled) {
      onClose?.();
    } else {
      setInternalVisible(false);
    }
  };

  const handleConfirm = () => {
    const formatted = formatTimeString(draftHour24, draftMinute, format);
    if (currentValue instanceof Date) {
      const next = new Date(currentValue.getTime());
      next.setHours(draftHour24, draftMinute, 0, 0);
      emitChange?.(next);
    } else {
      emitChange?.(formatted);
    }
    closeModal();
  };

  const handleClear = () => {
    if (required) return;
    emitChange?.('');
    closeModal();
  };

  const previewTime = formatTimeString(draftHour24, draftMinute, format);

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
          accessibilityLabel="Close time picker"
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
              <Text style={[styles.selectedPreview, { color: palette.text }]}>
                {previewTime}
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

          <View style={styles.body}>
            <TimeWheelView
              hour24={draftHour24}
              minute={draftMinute}
              onChangeTime={(h, m) => {
                setDraftHour24(h);
                setDraftMinute(m);
              }}
              format={format}
              minuteInterval={minuteInterval}
              minimumTime={minimumTime}
              maximumTime={maximumTime}
              palette={palette}
            />
          </View>

          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <View>
              {!required && Boolean(currentValue) && (
                <TouchableOpacity
                  onPress={handleClear}
                  style={[
                    styles.clearBtn,
                    { borderColor: palette.border, backgroundColor: palette.surface },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Clear selected time"
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
                accessibilityLabel="Confirm time"
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

  const parsedDisplay = parseTimeValue(currentValue);
  const triggerText = parsedDisplay
    ? formatTimeString(parsedDisplay.hour24, parsedDisplay.minute, format)
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
        <ClockIcon size={16} color={palette.primary} />
        <Text
          style={[
            styles.triggerText,
            { color: parsedDisplay ? palette.text : palette.textMuted },
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
    maxHeight: '88%',
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
    fontSize: Fonts.sizes.xl,
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
  body: {
    paddingVertical: 16,
  },
  wheelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  wheelCol: {
    width: 82,
    alignItems: 'center',
  },
  colLabel: {
    fontSize: Fonts.sizes.xs,
    fontFamily: Fonts.family.semiBold,
    marginBottom: 8,
  },
  wheelBox: {
    width: '100%',
    height: ITEM_HEIGHT * 4.5,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  wheelContent: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontSize: Fonts.sizes.lg,
    fontFamily: Fonts.family.medium,
  },
  colonWrap: {
    paddingTop: 22,
  },
  colonText: {
    fontSize: Fonts.sizes.xxl,
    fontFamily: Fonts.family.bold,
  },
  periodCol: {
    width: 78,
    alignItems: 'center',
    marginLeft: 6,
  },
  periodStack: {
    width: '100%',
    gap: 10,
    height: ITEM_HEIGHT * 4.5,
    justifyContent: 'center',
  },
  periodBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    fontSize: Fonts.sizes.md,
    fontFamily: Fonts.family.semiBold,
  },
  presetsRow: {
    gap: 8,
    paddingTop: 16,
    paddingBottom: 2,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  presetText: {
    fontSize: Fonts.sizes.xs,
    fontFamily: Fonts.family.semiBold,
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

export default TimePicker;
