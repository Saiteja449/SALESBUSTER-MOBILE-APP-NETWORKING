import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pick, types } from '@react-native-documents/picker';
import Text from '../../components/common/AppText';
import TextInput from '../../components/common/AppTextInput';
import KeyboardAwareScrollView from '../../components/common/KeyboardAwareScrollView';
import { Fonts } from '../../styles/Fonts';
import { Colors } from '../../styles/Colors';
import {
  BackIcon,
  CalendarIcon,
  PhotoIcon,
  XIcon,
  EditIcon,
  PaperclipIcon,
} from '../../icons/Icons';
import { DatePicker } from '../../components/pickers';
import { useGuestAlert } from '../../components/guest/GuestAlert';
import { useAuth } from '../../context/AuthContext';
import { eventService } from '../../services/api/eventService';
import {
  getFriendlyErrorMessage,
  DEFAULT_CUSTOM_WHATSAPP_MESSAGE,
} from '../../utils/formatters';
import BrandGradientBackground from '../../components/common/BrandGradientBackground';
import { getFullMediaUrl } from '../../utils/constants';

const LAST_EVENT_STORAGE_KEY = 'salesbuster_last_selected_event_id';
const FIXED_WHATSAPP_TEMPLATE =
  'Hi {there name}! Great meeting you.';
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB limit (expanded from 2 * 1024 * 1024)

const formatEventDate = d => {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const extractInitialFile = evt => {
  if (!evt || !Array.isArray(evt.attachments) || evt.attachments.length === 0)
    return null;
  const att = evt.attachments[0];
  if (!att) return null;
  const rawUrl = att.url || att.uri || '';
  if (!rawUrl) return null;
  const fullUrl =
    rawUrl.startsWith('http') ||
    rawUrl.startsWith('file:') ||
    rawUrl.startsWith('content:')
      ? rawUrl
      : getFullMediaUrl(rawUrl);
  const type = (att?.type || '').toLowerCase();
  const name = (att?.name || att?.url || att?.uri || '').toLowerCase();
  const isImg =
    att.isImage === true ||
    type.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(name);
  return {
    uri: fullUrl,
    url: att.url || '',
    name: att.name || 'file',
    size: att.size || 0,
    type: att.type || (isImg ? 'image/jpeg' : 'application/octet-stream'),
    isExisting: true,
    isImage: isImg,
  };
};

const extractInitialImage = extractInitialFile;

export const NewEventScreen = ({ navigation, route }) => {
  const { showGuestAlert, guestAlertModal } = useGuestAlert();
  const { token: ctxToken, user } = useAuth();
  const token = user?.token || ctxToken;

  const initialEvent = route?.params?.event || null;
  const isEdit = Boolean(route?.params?.isEdit || initialEvent);

  // Form State
  const [eventName, setEventName] = useState(initialEvent?.name || '');
  const [venue, setVenue] = useState(
    initialEvent?.venue || initialEvent?.location || '',
  );
  const [date, setDate] = useState(
    initialEvent?.eventDate ? formatEventDate(initialEvent.eventDate) : '',
  );

  const getInitialCustomMessage = () => {
    if (
      initialEvent?.customMessage !== undefined &&
      initialEvent?.customMessage !== null
    ) {
      return initialEvent.customMessage;
    }
    if (initialEvent?.whatsappTemplate) {
      const parts = initialEvent.whatsappTemplate.split(/\r?\n\r?\n/);
      if (parts.length > 1) {
        return parts.slice(1).join('\n\n').trim();
      }
    }
    return DEFAULT_CUSTOM_WHATSAPP_MESSAGE;
  };

  const [customMessage, setCustomMessage] = useState(getInitialCustomMessage());

  // Single optional event file (image, PDF, doc, any file)
  const [eventFile, setEventFile] = useState(null);
  const eventImage = eventFile;
  const setEventImage = setEventFile;
  const [previousEventFiles, setPreviousEventFiles] = useState([]);
  const [isPreviousFilesModalVisible, setIsPreviousFilesModalVisible] = useState(false);
  const [isLoadingPreviousFiles, setIsLoadingPreviousFiles] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadPreviousEventFiles = async () => {
      if (!token) return;
      setIsLoadingPreviousFiles(true);
      try {
        const response = await eventService.getEvents(token, 'all');
        const events = Array.isArray(response?.data) ? response.data : [];
        const files = events
          .filter(event => !initialEvent?._id || event._id !== initialEvent._id)
          .flatMap(event =>
            (Array.isArray(event.attachments) ? event.attachments : []).map(att => {
              const rawUrl = att?.url || att?.uri || '';
              if (!rawUrl) return null;
              const uri =
                rawUrl.startsWith('http') ||
                rawUrl.startsWith('file:') ||
                rawUrl.startsWith('content:')
                  ? rawUrl
                  : getFullMediaUrl(rawUrl);
              const type = (att.type || '').toLowerCase();
              const name = (att.name || rawUrl).toLowerCase();
              const isImage =
                att.isImage === true ||
                type.startsWith('image/') ||
                /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(name);
              return {
                uri,
                url: att.url || rawUrl,
                name: att.name || 'Category file',
                size: att.size || 0,
                type: att.type || (isImage ? 'image/jpeg' : 'application/octet-stream'),
                isExisting: true,
                isImage,
                sourceEventName: event.name || 'Previous category',
              };
            }),
          )
          .filter(Boolean);
        if (isMounted) setPreviousEventFiles(files);
      } catch (error) {
        console.warn('Failed to load files from previous categories:', error);
      } finally {
        if (isMounted) setIsLoadingPreviousFiles(false);
      }
    };
    loadPreviousEventFiles();
    return () => {
      isMounted = false;
    };
  }, [token, initialEvent?._id]);

  useEffect(() => {
    if (initialEvent) {
      const extracted = extractInitialFile(initialEvent);
      if (extracted) {
        setEventFile(extracted);
      }
    }
  }, [initialEvent]);

  // Picker modal visibility
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  // Submitting state
  const [saving, setSaving] = useState(false);

  // Pick single optional file (any type, max 25 MB)
  const handlePickFile = async () => {
    try {
      const [res] = await pick({
        type: [types.allFiles],
        copyTo: 'cachesDirectory',
      });
      if (res && (res.fileCopyUri || res.uri)) {
        if (res.size && res.size > MAX_FILE_SIZE_BYTES) {
          showGuestAlert(
            'File Too Large',
            'Each file must be under 2 MB (up to 25 MB max). Please select a smaller file.',
          );
          return;
        }
        const type = (res.type || '').toLowerCase();
        const name = (res.name || '').toLowerCase();
        const isImg =
          type.startsWith('image/') ||
          /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(name);
        setEventFile({
          uri: res.fileCopyUri || res.uri,
          name: res.name || 'file',
          size: res.size,
          type: res.type || (isImg ? 'image/jpeg' : 'application/octet-stream'),
          isImage: isImg,
        });
      }
    } catch (err) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.warn('File pick error:', err);
        showGuestAlert(
          'File Selection',
          'Could not load the chosen file. Please try selecting again.',
        );
      }
    }
  };

  const handlePickImage = handlePickFile;

  // Remove selected event file
  const handleRemoveFile = () => {
    setEventFile(null);
  };
  const handleRemoveImage = handleRemoveFile;

  // Save Event
  const handleSaveEvent = async () => {
    if (!eventName.trim()) {
      showGuestAlert('Required Field', 'Please enter a contact category name.');
      return;
    }
    if (!venue.trim()) {
      showGuestAlert('Required Field', 'Please enter Area / Venue.');
      return;
    }
    if (!date) {
      showGuestAlert('Required Field', 'Please select Date.');
      return;
    }

    if (eventFile?.size && eventFile.size > MAX_FILE_SIZE_BYTES) {
      showGuestAlert(
        'File Too Large',
        `File "${eventFile.name}" exceeds the 25 MB limit.`,
      );
      return;
    }

    setSaving(true);
    try {
      // Build ISO Date from selected date
      let combinedEventDate = new Date();
      if (date) {
        combinedEventDate = new Date(date);
      }

      // Combine fixed template and custom message
      const combinedWhatsappTemplate = customMessage.trim()
        ? `${FIXED_WHATSAPP_TEMPLATE}\n\n${customMessage.trim()}`
        : FIXED_WHATSAPP_TEMPLATE;

      const payload = {
        name: eventName.trim(),
        venue: venue.trim(),
        location: venue.trim(),
        eventDate: combinedEventDate,
        description: combinedWhatsappTemplate,
        whatsappTemplate: combinedWhatsappTemplate,
        customMessage: customMessage.trim(),
        attachments: eventFile
          ? [
              {
                name: eventFile.name,
                type: eventFile.type || 'application/octet-stream',
                size: eventFile.size,
                uri: eventFile.uri,
                url: eventFile.url,
                isImage: Boolean(eventFile.isImage),
              },
            ]
          : [],
      };

      if (isEdit && initialEvent?._id) {
        const res = await eventService.updateEvent(
          token,
          initialEvent._id,
          payload,
        );

        if (res.success && res.data) {
          const updated = res.data;
          if (typeof route.params?.onEventUpdated === 'function') {
            route.params.onEventUpdated(updated);
          }

          showGuestAlert(
            'Success 🎉',
            `Contact category "${updated.name}" updated successfully!`,
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ],
          );
        } else {
          throw new Error(res.message || 'Failed to update contact category');
        }
      } else {
        const res = await eventService.createEvent(token, payload);

        if (res.success && res.data) {
          const created = res.data;
          if (created._id) {
            AsyncStorage.setItem(LAST_EVENT_STORAGE_KEY, created._id).catch(
              () => {},
            );
          }

          if (typeof route.params?.onEventCreated === 'function') {
            route.params.onEventCreated(created);
          }

          showGuestAlert(
            'Success 🎉',
            `Contact category "${created.name}" created successfully!`,
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ],
          );
        } else {
          throw new Error(res.message || 'Failed to create contact category');
        }
      }
    } catch (err) {
      console.error(
        isEdit ? 'Update category error:' : 'Create category error:',
        err,
      );
      const friendlyMessage = getFriendlyErrorMessage(
        err,
        isEdit
          ? 'Unable to update category. Please check the details and try again.'
          : 'Unable to save category. Please check the details and try again.',
      );
      showGuestAlert(
        isEdit ? 'Unable to Update Category' : 'Unable to Save Category',
        friendlyMessage,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B0C16" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backCircleBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <BackIcon size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Contact Category' : 'Create Contact Category'}
        </Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. CONTACT CATEGORY NAME INPUT CARD */}
        <View style={styles.inputCard}>
          {!eventName ? (
            <View style={styles.placeholderRow} pointerEvents="none">
              <Text style={styles.placeholderText}>Contact Category Name</Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
          ) : null}
          <TextInput
            style={styles.textInput}
            value={eventName}
            onChangeText={setEventName}
            autoCorrect={false}
          />
        </View>

        {/* 2. AREA / VENUE INPUT CARD */}
        <View style={styles.inputCard}>
          {!venue ? (
            <View style={styles.placeholderRow} pointerEvents="none">
              <Text style={styles.placeholderText}>Area / Venue</Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
          ) : null}
          <TextInput
            style={styles.textInput}
            value={venue}
            onChangeText={setVenue}
            autoCorrect={false}
          />
        </View>

        {/* 3. DATE CARD (FULL WIDTH) */}
        <TouchableOpacity
          style={[styles.inputCard, styles.dateCard]}
          onPress={() => setIsDatePickerVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.dateCardContent}>
            <CalendarIcon size={18} color="#8F90A6" />
            <View style={styles.dateTextRow}>
              {date ? (
                <Text
                  style={[
                    styles.pickerButtonText,
                    styles.pickerButtonTextActive,
                  ]}
                >
                  {date}
                </Text>
              ) : (
                <View style={styles.datePlaceholderInner}>
                  <Text style={styles.pickerButtonText}>Date</Text>
                  <Text style={styles.requiredAsterisk}>*</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* 4. WHATSAPP MESSAGE SECTION */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>WhatsApp Message</Text>

          {/* Box 1: Fixed Non-Editable Template */}
          <View style={[styles.inputCard, styles.fixedTemplateCard]}>
            <Text style={styles.fixedTemplateText}>
              Hi {'{there name}'}! Great meeting you.
            </Text>
          </View>

          {/* Box 2: Editable Custom Message */}
          <View style={[styles.inputCard, styles.customMessageCard]}>
            <TextInput
              style={[styles.textInput, styles.customMessageInput]}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={customMessage}
              onChangeText={setCustomMessage}
              placeholder={DEFAULT_CUSTOM_WHATSAPP_MESSAGE}
              placeholderTextColor="#8F90A6"
            />
            <View style={styles.editIconContainer} pointerEvents="none">
              <EditIcon size={20} color="#8F90A6" />
            </View>
          </View>
        </View>

        {/* 5. CATEGORY IMAGE OR DOCUMENT (OPTIONAL) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Image or Document</Text>
            <Text style={styles.optionalBadgeText}>(Optional)</Text>
          </View>

          {eventFile ? (
            <View style={styles.singleImageCard}>
              {eventFile.isImage && eventFile.uri ? (
                <Image
                  source={{ uri: eventFile.uri }}
                  style={styles.singleImagePreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.fileIconBox}>
                  <PaperclipIcon size={22} color="#8B5CF6" />
                </View>
              )}
              <View style={styles.singleImageInfo}>
                <Text style={styles.singleImageName} numberOfLines={1}>
                  {eventFile.name}
                </Text>
                <Text style={styles.singleImageMeta}>
                  {eventFile.size
                    ? `${Math.round(eventFile.size / 1024)} KB • ${
                        eventFile.isImage ? 'Image' : 'Document'
                      }`
                    : eventFile.isImage
                    ? 'Image ready'
                    : 'File ready'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.singleImageRemoveBtn}
                onPress={handleRemoveFile}
                activeOpacity={0.7}
              >
                <XIcon size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadCardSingle}
              onPress={handlePickFile}
              activeOpacity={0.8}
            >
              <View style={styles.uploadIconCircle}>
                <PaperclipIcon size={22} color="#8B5CF6" />
              </View>
              <Text style={styles.uploadCardSingleTitle}>Add Image or Document</Text>
              <Text style={styles.uploadHintText}>
                Optional: 1 file (PDF, Document, Image under 25 MB)
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.previousFilesButton}
            onPress={() => setIsPreviousFilesModalVisible(true)}
            activeOpacity={0.75}
          >
            <PaperclipIcon size={16} color="#A78BFA" />
              <Text style={styles.previousFilesButtonText}>
              Choose from previous categories
            </Text>
          </TouchableOpacity>
        </View>

        {/* 6. SAVE CONTACT CATEGORY BUTTON */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveEvent}
          disabled={saving}
          activeOpacity={0.85}
        >
          <BrandGradientBackground id="new_event_btn_grad" borderRadius={16} />
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEdit ? 'Update Category' : 'Save Category'}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <Modal
        visible={isPreviousFilesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPreviousFilesModalVisible(false)}
      >
        <View style={styles.previousFilesOverlay}>
          <View style={styles.previousFilesCard}>
            <View style={styles.previousFilesHeader}>
              <Text style={styles.previousFilesTitle}>Files from Previous Categories</Text>
              <TouchableOpacity
                onPress={() => setIsPreviousFilesModalVisible(false)}
                style={styles.previousFilesClose}
                activeOpacity={0.7}
              >
                <XIcon size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {isLoadingPreviousFiles ? (
              <ActivityIndicator color="#A78BFA" style={styles.previousFilesLoader} />
            ) : previousEventFiles.length ? (
              <ScrollView style={styles.previousFilesList}>
                {previousEventFiles.map((file, index) => (
                  <TouchableOpacity
                    key={`${file.url}-${index}`}
                    style={styles.previousFileRow}
                    onPress={() => {
                      setEventFile(file);
                      setIsPreviousFilesModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    {file.isImage && file.uri ? (
                      <Image source={{ uri: file.uri }} style={styles.previousFileThumb} />
                    ) : (
                      <View style={styles.previousFileDocIcon}>
                        <PaperclipIcon size={17} color="#A78BFA" />
                      </View>
                    )}
                    <View style={styles.previousFileInfo}>
                      <Text style={styles.previousFileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.previousFileSource} numberOfLines={1}>
                        {file.sourceEventName}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.previousFilesEmpty}>
                No images or documents are saved on previous categories yet.
              </Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <DatePicker
        theme="dark"
        minimumDate={new Date()}
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        value={date}
        onChange={selected => {
          setDate(selected);
          setIsDatePickerVisible(false);
        }}
      />

      {guestAlertModal}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0C16',
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0C16',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C1D30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.family.bold,
    letterSpacing: 0.2,
  },
  headerRightSpacer: {
    width: 38,
  },

  // INPUT CARDS
  inputCard: {
    backgroundColor: '#1E1F35',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 11 : 10,
    minHeight: 51,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    position: 'relative',
  },
  placeholderRow: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#8F90A6',
    fontSize: 14,
    fontFamily: Fonts.family.regular,
  },
  requiredAsterisk: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: Fonts.family.bold,
    marginLeft: 2,
  },
  textInput: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.regular,
    padding: 0,
    margin: 0,
  },

  // DATE CARD
  dateCard: {
    minHeight: 51,
    paddingVertical: Platform.OS === 'ios' ? 11 : 10,
  },
  dateCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    flex: 1,
  },
  datePlaceholderInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerButtonText: {
    color: '#8F90A6',
    fontSize: 14,
    fontFamily: Fonts.family.regular,
  },
  pickerButtonTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.family.medium,
  },

  // SECTIONS
  sectionWrap: {
    marginTop: 10,
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.family.semiBold,
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  // FIXED TEMPLATE CARD
  fixedTemplateCard: {
    minHeight: 76,
    paddingVertical: 14,
    justifyContent: 'flex-start',
  },
  fixedTemplateText: {
    color: '#8F90A6',
    fontSize: 14,
    fontFamily: Fonts.family.regular,
    lineHeight: 20,
  },

  // CUSTOM MESSAGE CARD
  customMessageCard: {
    minHeight: 81,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  customMessageInput: {
    flex: 1,
    minHeight: 56,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.regular,
    lineHeight: 20,
    padding: 0,
    margin: 0,
    paddingRight: 8,
  },
  editIconContainer: {
    marginTop: 4,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // SECTION HEADER ROW
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  optionalBadgeText: {
    color: '#8F90A6',
    fontSize: 13,
    fontFamily: Fonts.family.regular,
  },

  // SINGLE OPTIONAL IMAGE CARD
  singleImageCard: {
    backgroundColor: '#1E1F35',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  singleImagePreview: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#0B0C16',
  },
  fileIconBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#0B0C16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleImageInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  singleImageName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.medium,
    marginBottom: 2,
  },
  singleImageMeta: {
    color: '#8F90A6',
    fontSize: 12,
    fontFamily: Fonts.family.regular,
  },
  singleImageRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  uploadCardSingle: {
    height: 110,
    backgroundColor: '#1E1F35',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  uploadIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  uploadCardSingleTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontFamily: Fonts.family.medium,
  },
  uploadHintText: {
    color: '#8F90A6',
    fontSize: 12,
    marginTop: 4,
    fontFamily: Fonts.family.regular,
  },
  previousFilesButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  previousFilesButtonText: {
    color: '#C4B5FD',
    fontSize: 13,
    fontFamily: Fonts.family.medium,
    marginLeft: 8,
  },
  previousFilesOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  previousFilesCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '72%',
    backgroundColor: '#16172B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E304F',
    padding: 18,
  },
  previousFilesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previousFilesTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: Fonts.family.bold,
  },
  previousFilesClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#20223D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previousFilesList: {
    flexGrow: 0,
  },
  previousFilesLoader: {
    paddingVertical: 28,
  },
  previousFilesEmpty: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: Fonts.family.regular,
    textAlign: 'center',
    paddingVertical: 22,
    lineHeight: 19,
  },
  previousFileRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1F35',
    borderRadius: 12,
    padding: 9,
    marginBottom: 8,
  },
  previousFileThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0B0C16',
  },
  previousFileDocIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previousFileInfo: {
    flex: 1,
    marginLeft: 11,
  },
  previousFileName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
  },
  previousFileSource: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: Fonts.family.regular,
    marginTop: 3,
  },

  // SAVE BUTTON
  saveButton: {
    backgroundColor: '#4013C7',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    overflow: 'hidden',
    shadowColor: '#4013C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.family.bold,
    letterSpacing: 0.2,
  },
});

export default NewEventScreen;
