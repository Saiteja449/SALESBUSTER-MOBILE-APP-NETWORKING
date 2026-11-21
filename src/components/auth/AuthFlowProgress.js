import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from '../common/AppText';
import { BackIcon } from '../../icons/Icons';
import { Fonts } from '../../styles/Fonts';

const STEP_COUNT = 3;

export default function AuthFlowProgress({ activeStep, onBack }) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <BackIcon size={17} color="#CBD5E1" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <Text style={styles.stepCount}>STEP {activeStep} OF 3</Text>
      </View>

      <View
        style={styles.progressSegments}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: STEP_COUNT, now: activeStep }}
        accessibilityLabel={`Step ${activeStep} of ${STEP_COUNT}`}
      >
        {Array.from({ length: STEP_COUNT }, (_, index) => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              index < activeStep && styles.progressSegmentActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  topRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingRight: 10,
  },
  backText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontFamily: Fonts.family.medium,
    marginLeft: 5,
  },
  stepCount: {
    color: '#64748B',
    fontSize: 10,
    letterSpacing: 0.8,
    fontFamily: Fonts.family.semiBold,
  },
  progressSegments: {
    flexDirection: 'row',
    gap: 7,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  progressSegmentActive: {
    backgroundColor: '#8B5CF6',
  },
});
