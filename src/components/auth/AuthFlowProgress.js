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
        ) : null}
      </View>

      <View
        style={styles.progressStepper}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: STEP_COUNT, now: activeStep }}
        accessibilityLabel={`Step ${activeStep} of ${STEP_COUNT}`}
      >
        {Array.from({ length: STEP_COUNT }, (_, index) => (
          <React.Fragment key={index}>
            <View
              style={[
                styles.progressNode,
                index < activeStep - 1 && styles.progressNodeComplete,
                index === activeStep - 1 && styles.progressNodeCurrent,
              ]}
            >
              <Text
                style={[
                  styles.progressNumber,
                  index < activeStep - 1 && styles.progressNumberComplete,
                  index === activeStep - 1 && styles.progressNumberActive,
                ]}
              >
                {index + 1}
              </Text>
            </View>
            {index < STEP_COUNT - 1 ? (
              <View
                style={[
                  styles.progressConnector,
                  index < activeStep - 1 && styles.progressConnectorActive,
                ]}
              />
            ) : null}
          </React.Fragment>
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
    justifyContent: 'flex-start',
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
  progressStepper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  progressNode: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#17172A',
    borderWidth: 1.5,
    borderColor: '#34334B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNodeComplete: {
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    borderColor: '#8B5CF6',
  },
  progressNodeCurrent: {
    backgroundColor: '#8B5CF6',
    borderColor: '#A78BFA',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 3,
  },
  progressConnector: {
    height: 1.5,
    flex: 1,
    marginHorizontal: 7,
    backgroundColor: '#34334B',
  },
  progressConnectorActive: {
    backgroundColor: '#8B5CF6',
  },
  progressNumber: {
    color: '#77758C',
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
  },
  progressNumberComplete: {
    color: '#C4B5FD',
  },
  progressNumberActive: {
    color: '#FFFFFF',
  },
});
