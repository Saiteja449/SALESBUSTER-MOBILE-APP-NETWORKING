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
  BackIcon,
  CalendarIcon,
  ChevronRightIcon,
  XIcon,
} from '../../icons/Icons';
import { Fonts } from '../../styles/Fonts';
import {
  buildCalendarDays,
  formatDisplayDate,
  formatLocalDateISO,
  getMonthLabel,
  getPickerTheme,
  getWeekdayLabels,
  isAfterDay,
  isBeforeDay,
  isDateDisabled,
  isSameDay,
  parseLocalDate,
} from '../../utils/pickerUtils';

/**
 * Reusable calendar body shared between DatePicker and DateTimePicker.
 */
export const CalendarView = ({
  mode = 'single',
  selectedDate,
  selectedRange,
  onSelectDate,
  onSelectRange,
  minimumDate,
  maximumDate,
  disabledDates,
  locale = 'en-US',
  palette,
  onQuickToday,
}) => {
  const today = useMemo(() => parseLocalDate(new Date()), []);
  const initialAnchor = useMemo(() => {
    if (mode === 'range' && selectedRange?.startDate) {
      return parseLocalDate(selectedRange.startDate) || today;
    }
    return parseLocalDate(selectedDate) || today;
  }, [mode, selectedDate, selectedRange, today]);

  const [viewYear, setViewYear] = useState(initialAnchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialAnchor.getMonth());
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setViewYear(initialAnchor.getFullYear());
    setViewMonth(initialAnchor.getMonth());
  }, [initialAnchor]);

  const animateMonthChange = (nextYear, nextMonth) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.45,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
    setViewYear(nextYear);
    setViewMonth(nextMonth);
  };

  const minParsed = useMemo(() => parseLocalDate(minimumDate), [minimumDate]);
  const maxParsed = useMemo(() => parseLocalDate(maximumDate), [maximumDate]);

  const canGoPrev = useMemo(() => {
    if (!minParsed) return true;
    return (
      viewYear > minParsed.getFullYear() ||
      (viewYear === minParsed.getFullYear() && viewMonth > minParsed.getMonth())
    );
  }, [minParsed, viewYear, viewMonth]);

  const canGoNext = useMemo(() => {
    if (!maxParsed) return true;
    return (
      viewYear < maxParsed.getFullYear() ||
      (viewYear === maxParsed.getFullYear() && viewMonth < maxParsed.getMonth())
    );
  }, [maxParsed, viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    const prev = new Date(viewYear, viewMonth - 1, 1);
    animateMonthChange(prev.getFullYear(), prev.getMonth());
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    const next = new Date(viewYear, viewMonth + 1, 1);
    animateMonthChange(next.getFullYear(), next.getMonth());
  };

  const cells = useMemo(
    () => buildCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );
  const weekdays = getWeekdayLabels();
  const isTodayDisabled = isDateDisabled(
    today,
    minParsed,
    maxParsed,
    disabledDates
  );

  const handlePressDay = (cell) => {
    if (mode === 'range') {
      const start = parseLocalDate(selectedRange?.startDate);
      const end = parseLocalDate(selectedRange?.endDate);
      if (!start || (start && end)) {
        onSelectRange?.({ startDate: cell.iso, endDate: null });
      } else if (isBeforeDay(cell.date, start)) {
        onSelectRange?.({ startDate: cell.iso, endDate: formatLocalDateISO(start) });
      } else {
        onSelectRange?.({ startDate: formatLocalDateISO(start), endDate: cell.iso });
      }
      return;
    }
    onSelectDate?.(cell.iso, cell.date);
  };

  const jumpToToday = () => {
    if (isTodayDisabled) return;
    const iso = formatLocalDateISO(today);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    if (mode === 'range') {
      onSelectRange?.({ startDate: iso, endDate: iso });
    } else {
      onSelectDate?.(iso, today);
    }
    onQuickToday?.(iso, today);
  };

  const rangeStart = parseLocalDate(selectedRange?.startDate);
  const rangeEnd = parseLocalDate(selectedRange?.endDate);

  return (
    <View>
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          disabled={!canGoPrev}
          style={[
            styles.navBtn,
            { backgroundColor: palette.surface, borderColor: palette.border },
            !canGoPrev && { opacity: 0.35 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          accessibilityState={{ disabled: !canGoPrev }}
        >
          <BackIcon size={16} color={palette.text} />
        </TouchableOpacity>

        <Text style={[styles.monthTitle, { color: palette.text }]}>
          {getMonthLabel(viewYear, viewMonth)}
        </Text>

        <TouchableOpacity
          onPress={handleNextMonth}
          disabled={!canGoNext}
          style={[
            styles.navBtn,
            { backgroundColor: palette.surface, borderColor: palette.border },
            !canGoNext && { opacity: 0.35 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: !canGoNext }}
        >
          <ChevronRightIcon size={16} color={palette.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {weekdays.map((day) => (
          <View key={day} style={styles.weekCell}>
            <Text style={[styles.weekLabel, { color: palette.textSecondary }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      <Animated.View style={[styles.grid, { opacity: fadeAnim }]}>
        {cells.map((cell) => {
          if (cell.empty) {
            return <View key={cell.key} style={styles.daySlot} />;
          }

          const disabled = isDateDisabled(
            cell.date,
            minParsed,
            maxParsed,
            disabledDates
          );
          const isToday = isSameDay(cell.date, today);

          let isSelected = false;
          let isInRange = false;
          if (mode === 'range') {
            const isStart = rangeStart && isSameDay(cell.date, rangeStart);
            const isEnd = rangeEnd && isSameDay(cell.date, rangeEnd);
            isSelected = Boolean(isStart || isEnd);
            isInRange = Boolean(
              rangeStart &&
                rangeEnd &&
                isAfterDay(cell.date, rangeStart) &&
                isBeforeDay(cell.date, rangeEnd)
            );
          } else {
            isSelected = Boolean(
              selectedDate && isSameDay(cell.date, selectedDate)
            );
          }

          return (
            <View
              key={cell.key}
              style={[
                styles.daySlot,
                isInRange && { backgroundColor: palette.primarySoft },
              ]}
            >
              <TouchableOpacity
                onPress={() => handlePressDay(cell)}
                disabled={disabled}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={formatDisplayDate(cell.date, locale)}
                accessibilityState={{ selected: isSelected, disabled }}
                style={[
                  styles.dayPill,
                  isToday &&
                    !isSelected && {
                      borderWidth: 1.5,
                      borderColor: palette.accent,
                      backgroundColor: palette.accentSoft,
                    },
                  isSelected && {
                    backgroundColor: palette.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: palette.text },
                    isToday &&
                      !isSelected && {
                        color: palette.accent,
                        fontFamily: Fonts.family.bold,
                      },
                    disabled && {
                      color: palette.disabledText,
                    },
                    isSelected && {
                      color: palette.primaryText,
                      fontFamily: Fonts.family.bold,
                    },
                  ]}
                >
                  {cell.day}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </Animated.View>

      {!isTodayDisabled && (
        <View style={styles.todayChipRow}>
          <TouchableOpacity
            onPress={jumpToToday}
            style={[
              styles.todayChip,
              {
                backgroundColor: palette.primarySoft,
                borderColor: palette.primaryBorder,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Select today"
          >
            <Text style={[styles.todayChipText, { color: palette.primary }]}>
              Today ({formatDisplayDate(today, locale).split(',')[0]})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const DatePicker = ({
  visible: controlledVisible,
  onClose,
  value,
  selectedDate,
  onChange,
  onSelect,
  minimumDate,
  maximumDate,
  disabledDates,
  placeholder = 'Select date',
  mode = 'single',
  required = false,
  title = 'Select Date',
  locale = 'en-US',
  theme = 'light',
  style,
}) => {
  const insets = useSafeAreaInsets();
  const palette = useMemo(() => getPickerTheme(theme), [theme]);

  const isControlled = controlledVisible !== undefined;
  const [internalVisible, setInternalVisible] = useState(false);
  const visible = isControlled ? controlledVisible : internalVisible;

  const currentValue = value !== undefined ? value : selectedDate;
  const emitChange = onChange || onSelect;

  const [draftDate, setDraftDate] = useState(null);
  const [draftRange, setDraftRange] = useState({ startDate: null, endDate: null });

  const slideAnim = useRef(new Animated.Value(28)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    if (mode === 'range') {
      const startIso = formatLocalDateISO(currentValue?.startDate);
      const endIso = formatLocalDateISO(currentValue?.endDate);
      setDraftRange({
        startDate: startIso || null,
        endDate: endIso || null,
      });
    } else {
      const parsed = parseLocalDate(currentValue);
      setDraftDate(parsed ? formatLocalDateISO(parsed) : null);
    }

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
  }, [visible, currentValue, mode, slideAnim, opacityAnim]);

  const closeModal = () => {
    if (isControlled) {
      onClose?.();
    } else {
      setInternalVisible(false);
    }
  };

  const handleConfirm = () => {
    if (mode === 'range') {
      if (!draftRange.startDate && required) return;
      emitChange?.({
        startDate: draftRange.startDate,
        endDate: draftRange.endDate || draftRange.startDate,
      });
      closeModal();
      return;
    }

    const fallbackToday = formatLocalDateISO(new Date());
    const finalIso = draftDate || (required ? fallbackToday : '');
    if (currentValue instanceof Date && finalIso) {
      emitChange?.(parseLocalDate(finalIso));
    } else {
      emitChange?.(finalIso);
    }
    closeModal();
  };

  const handleClear = () => {
    if (required) return;
    if (mode === 'range') {
      setDraftRange({ startDate: null, endDate: null });
      emitChange?.({ startDate: '', endDate: '' });
    } else {
      setDraftDate(null);
      emitChange?.('');
    }
    closeModal();
  };

  const headerValueLabel = useMemo(() => {
    if (mode === 'range') {
      if (draftRange.startDate && draftRange.endDate) {
        return `${formatDisplayDate(draftRange.startDate, locale)} — ${formatDisplayDate(draftRange.endDate, locale)}`;
      }
      if (draftRange.startDate) {
        return `${formatDisplayDate(draftRange.startDate, locale)} — End date`;
      }
      return 'Select start & end date';
    }
    return draftDate ? formatDisplayDate(draftDate, locale) : 'No date selected';
  }, [mode, draftDate, draftRange, locale]);

  const hasSelection =
    mode === 'range' ? Boolean(draftRange.startDate) : Boolean(draftDate);

  const canConfirm = !required || hasSelection;

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
          accessibilityLabel="Close date picker"
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
                {headerValueLabel}
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
            <CalendarView
              mode={mode}
              selectedDate={draftDate}
              selectedRange={draftRange}
              onSelectDate={(iso) => setDraftDate(iso)}
              onSelectRange={(range) => setDraftRange(range)}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              disabledDates={disabledDates}
              locale={locale}
              palette={palette}
            />
          </View>

          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <View style={styles.footerLeft}>
              {!required && hasSelection && (
                <TouchableOpacity
                  onPress={handleClear}
                  style={[
                    styles.clearBtn,
                    { borderColor: palette.border, backgroundColor: palette.surface },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Clear selected date"
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
                disabled={!canConfirm}
                style={[
                  styles.confirmBtn,
                  { backgroundColor: palette.primary },
                  !canConfirm && { opacity: 0.45 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Confirm date"
                accessibilityState={{ disabled: !canConfirm }}
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

  const triggerText =
    mode === 'range'
      ? currentValue?.startDate
        ? `${formatDisplayDate(currentValue.startDate, locale)} – ${formatDisplayDate(currentValue.endDate || currentValue.startDate, locale)}`
        : placeholder
      : currentValue
        ? formatDisplayDate(currentValue, locale)
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
            { color: currentValue ? palette.text : palette.textMuted },
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
    maxHeight: '90%',
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
    fontSize: Fonts.sizes.lg,
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
    paddingVertical: 14,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: Fonts.sizes.md,
    fontFamily: Fonts.family.bold,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekCell: {
    width: '14.2857%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekLabel: {
    fontSize: Fonts.sizes.xs,
    fontFamily: Fonts.family.semiBold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  daySlot: {
    width: '14.2857%',
    aspectRatio: 1.05,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
    borderRadius: 10,
  },
  dayPill: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: Fonts.sizes.sm,
    fontFamily: Fonts.family.medium,
  },
  todayChipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 10,
  },
  todayChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  todayChipText: {
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
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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

export default DatePicker;
