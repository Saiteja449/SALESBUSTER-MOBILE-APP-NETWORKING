import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Alert,
  StyleSheet,
  TouchableOpacity,
  
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
  Platform,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../../components/common/AppText';
import TextInput from '../../components/common/AppTextInput';
import BrandGradientBackground from '../../components/common/BrandGradientBackground';
import { Fonts } from '../../styles/Fonts';
import { Colors } from '../../styles/Colors';
import {
  BackIcon,
  SearchIcon,
  FilterIcon,
  PhoneIcon,
  EyeIcon,
  XIcon,
  WhatsAppIcon,
  CheckIcon,
  ClockIcon,
  BuildingIcon,
  UserIcon,
  EditIcon,
  TrashIcon,
} from '../../icons/Icons';
import { useAuth } from '../../context/AuthContext';
import { eventService, appendWhatsAppWatermark } from '../../services/api/eventService';
import {
  getFriendlyErrorMessage,
  populateWhatsAppMessage,
  shortenUrl,
  appendBusinessInfoLink,
} from '../../utils/formatters';
import { getFullMediaUrl } from '../../utils/constants';

export const EventContactsScreen = ({ navigation, route }) => {
  const { token: ctxToken, user } = useAuth();
  const token = user?.token || ctxToken;

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(
    route?.params?.selectedEventId || ''
  );
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Detail Modals
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Edit Contact Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    companyName: '',
    designation: '',
    summary: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Open edit modal pre-filled
  const handleOpenEdit = (contact) => {
    if (!contact) return;
    setEditingContact(contact);
    setEditFormData({
      name: contact.name || '',
      phone: contact.phone || '',
      companyName: contact.companyName || '',
      designation: contact.designation || '',
      summary: contact.summary || '',
    });
    setIsEditModalVisible(true);
  };

  // Save edited contact
  const handleSaveContactEdit = async () => {
    if (!editFormData.name.trim()) {
      Alert.alert('Required', 'Contact name cannot be empty.');
      return;
    }
    if (!editingContact?._id || !editingContact?.eventId) {
      Alert.alert('Error', 'Contact data is invalid.');
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await eventService.updateEventContact(
        token,
        editingContact.eventId,
        editingContact._id,
        editFormData
      );

      if (res?.success && res.data) {
        const updated = res.data;
        setContacts((prev) =>
          prev.map((c) =>
            c._id === updated._id
              ? { ...c, ...updated, eventTitle: c.eventTitle }
              : c
          )
        );
        if (selectedContact?._id === updated._id) {
          setSelectedContact((prev) => ({ ...prev, ...updated }));
        }
        setIsEditModalVisible(false);
        setEditingContact(null);
      }
    } catch (err) {
      Alert.alert(
        'Update Failed',
        getFriendlyErrorMessage(err, 'Failed to update contact.')
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  // Soft Delete Contact with confirmation
  const handleDeleteContact = (contact) => {
    if (!contact?._id || !contact?.eventId) return;

    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove "${contact.name || 'this contact'}" from this contact category?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await eventService.deleteEventContact(
                token,
                contact.eventId,
                contact._id
              );
              setContacts((prev) => prev.filter((c) => c._id !== contact._id));
              if (selectedContact?._id === contact._id) {
                setSelectedContact(null);
              }
            } catch (err) {
              Alert.alert(
                'Delete Failed',
                getFriendlyErrorMessage(err, 'Could not remove contact.')
              );
            }
          },
        },
      ]
    );
  };

  // 1. Sync selectedEventId if route params change
  useEffect(() => {
    if (route?.params?.selectedEventId) {
      setSelectedEventId(route.params.selectedEventId);
    }
  }, [route?.params?.selectedEventId]);

  // 2. Load Events and Contacts
  useEffect(() => {
    loadEvents();
  }, [token]);

  const loadEvents = async () => {
    if (!token) return [];
    try {
      const res = await eventService.getEvents(token);
      if (res.success && Array.isArray(res.data)) {
        setEvents(res.data);
        if (!selectedEventId && res.data.length > 0) {
          setSelectedEventId(res.data[0]._id);
        }
        return res.data;
      }
    } catch (err) {
      console.warn('Failed to load events:', err);
    }
    return [];
  };

  useEffect(() => {
    if (token) {
      loadContacts(selectedEventId, searchQuery);
    }
  }, [token, selectedEventId, searchQuery]);

  const loadContacts = async (eventId, search = '', currentEvents = events) => {
    if (!token) return;
    setLoading(true);
    try {
      const eventsList = currentEvents && currentEvents.length > 0 ? currentEvents : events;
      // If an event is selected, fetch for that event
      if (eventId && eventId !== 'all') {
        const res = await eventService.getEventContacts(token, eventId, { search });
        if (res.success && res.data) {
          const targetEvent = eventsList.find(
            (e) => String(e._id) === String(eventId)
          );
          const list = (res.data.contacts || []).map((c) => {
            const evId = c.eventId || eventId;
            const ev = eventsList.find((e) => String(e._id) === String(evId));
            return {
              ...c,
              eventTitle: ev?.name || targetEvent?.name || 'Contact Category',
            };
          });
          setContacts(list);
        }
      } else if (eventsList.length > 0) {
        // Fetch across all events
        const promises = eventsList.map((e) =>
          eventService.getEventContacts(token, e._id, { search }).catch(() => null)
        );
        const results = await Promise.all(promises);
        let combined = [];
        results.forEach((r, idx) => {
          if (r?.success && Array.isArray(r.data?.contacts)) {
            const evName = eventsList[idx]?.name || 'Contact Category';
            combined = combined.concat(
              r.data.contacts.map((c) => ({ ...c, eventTitle: evName }))
            );
          }
        });
        // Sort descending by createdAt
        combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setContacts(combined);
      } else {
        setContacts([]);
      }
    } catch (err) {
      console.warn('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-sync contact event titles when events arrive or change
  useEffect(() => {
    if (events.length > 0) {
      setContacts((prevContacts) => {
        if (!prevContacts || prevContacts.length === 0) return prevContacts;
        let hasChanges = false;
        const updated = prevContacts.map((c) => {
          const evId = c.eventId || selectedEventId;
          const matched = events.find((e) => String(e._id) === String(evId));
          const properTitle =
            matched?.name ||
            (c.eventTitle && c.eventTitle !== 'Furry Fest' ? c.eventTitle : 'Contact Category');
          if (c.eventTitle !== properTitle) {
            hasChanges = true;
            return { ...c, eventTitle: properTitle };
          }
          return c;
        });
        return hasChanges ? updated : prevContacts;
      });
    }
  }, [events, selectedEventId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const freshEvents = await loadEvents();
    await loadContacts(selectedEventId, searchQuery, freshEvents);
    setRefreshing(false);
  }, [selectedEventId, searchQuery, token, events, selectedEventId]);

  // Format date helper: "10 Nov 2026"
  const formatContactDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Call contact phone
  const handleCall = (phone) => {
    if (!phone) return;
    const cleanNumber = phone.replace(/\D/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {});
  };

  // WhatsApp contact
  const handleWhatsApp = async (contact) => {
    if (!contact?.phone) return;
    const contactEvent =
      events.find((e) => String(e._id) === String(contact.eventId)) ||
      events.find((e) => String(e._id) === String(selectedEventId));
    const resolvedEventName =
      contactEvent?.name ||
      (contact.eventTitle && contact.eventTitle !== 'Furry Fest'
        ? contact.eventTitle
        : 'this contact category');
    const contactAttachments = Array.isArray(contact.attachments) ? contact.attachments : [];
    const eventAttachments = contactEvent?.attachments || [];

    // Helper to check if an attachment is an image
    const isImageAttachment = (att) => {
      if (!att) return false;
      if (att.isImage) return true;
      const type = (att.type || att.mimeType || '').toLowerCase();
      if (type.startsWith('image/')) return true;
      const target = (att.name || att.fileName || att.uri || att.url || '').toLowerCase();
      return /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(target);
    };

    // Attendee selfie from contact attachments: only selfie is sent as media!
    const contactSelfie = contactAttachments.find(isImageAttachment);
    const attachmentsToShare = contactSelfie ? [contactSelfie] : [];

    // Event file from event: shared as sharable link in text form, NOT as media!
    const eventAttachment = eventAttachments[0];
    let sharableFileLink = '';
    if (eventAttachment) {
      const rawUrl = eventAttachment.url || eventAttachment.uri || '';
      if (rawUrl) {
        const fullUrl =
          rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
            ? rawUrl
            : getFullMediaUrl(rawUrl);
        // Shorten link via in-house shortener (falls back gracefully to full URL)
        sharableFileLink = await shortenUrl(fullUrl, token);
      }
    }

    const senderName =
      (user?.name && !user.name.startsWith('Guest_') ? user.name.trim() : '') ||
      user?.name ||
      '';
    const senderCompany =
      (user?.companyName && !user.companyName.includes("'s Workspace")
        ? user.companyName.trim()
        : '') ||
      user?.companyName ||
      '';

    const template = (contactEvent?.whatsappTemplate || contactEvent?.description || '').trim();
    const fallbackMsg = `Hi ${contact.name || 'there'}, thank you for connecting with us. We look forward to staying in touch!`;
    const resolvedTemplate = template
      ? populateWhatsAppMessage(template, {
          contactName: contact.name,
          contactCompany: contact.companyName,
          eventName: resolvedEventName,
          venue: contactEvent?.venue || contactEvent?.location || '',
          yourName: senderName,
          companyName: senderCompany,
        })
      : fallbackMsg;

    let msg = contact.messageText
      ? populateWhatsAppMessage(contact.messageText, {
          contactName: contact.name,
          contactCompany: contact.companyName,
          eventName: resolvedEventName,
          venue: contactEvent?.venue || contactEvent?.location || '',
          yourName: senderName,
          companyName: senderCompany,
        })
      : resolvedTemplate;
    if (sharableFileLink) {
      msg = appendBusinessInfoLink(msg, sharableFileLink, {
        companyName: senderCompany,
        fileName: eventAttachment?.name || '',
      });
    }
    msg = appendWhatsAppWatermark(msg);

    try {
      const shareResult = await eventService.shareEventFilesToWhatsApp(
        contact.phone,
        msg,
        attachmentsToShare,
        {
          name: contact.name,
          companyName: contact.companyName,
          eventName: resolvedEventName,
          sharableLink: sharableFileLink,
        },
      );
      if (Platform.OS === 'android' && shareResult?.imageCopiedToClipboard) {
        ToastAndroid.show(
          'Photo copied to clipboard — paste from keyboard if needed',
          ToastAndroid.LONG,
        );
      }
      if (contact.eventId && contact._id) {
        await eventService.updateContactStatus(token, contact.eventId, contact._id, 'whatsapp_opened');
      }
    } catch (err) {
      Alert.alert(
        'Unable to Share',
        getFriendlyErrorMessage(
          err,
          'Could not share contact category files to WhatsApp. Please verify your connection and try again.'
        )
      );
    }
  };

  // Render Contact Row matching the screenshot design
  const renderItem = ({ item }) => {
    const contactEvent = events.find(
      (e) => String(e._id) === String(item.eventId || selectedEventId)
    );
    const eventName =
      contactEvent?.name ||
      (item.eventTitle && item.eventTitle !== 'Furry Fest' ? item.eventTitle : 'Contact Category');
    const dateFormatted = formatContactDate(item.createdAt);

    return (
      <View style={styles.contactRow}>
        {/* Left: Contact Name & Category Name (Tap to View Details) */}
        <TouchableOpacity
          style={styles.infoTouchArea}
          onPress={() => setSelectedContact(item)}
          activeOpacity={0.7}
        >
          <View style={styles.nameColumn}>
            <Text style={styles.contactName} numberOfLines={1}>
              {item.name || 'Attendee'}
            </Text>
          </View>

          <View style={styles.eventColumn}>
            <Text style={styles.eventNameText} numberOfLines={1}>
              {eventName}
            </Text>
            {dateFormatted ? <Text style={styles.dateText}>{dateFormatted}</Text> : null}
          </View>
        </TouchableOpacity>

        {/* Right: Circular Action Buttons */}
        <View style={styles.actionColumn}>
          {/* Call Button */}
          <TouchableOpacity
            style={styles.actionCircleBtn}
            onPress={() => handleCall(item.phone)}
            activeOpacity={0.75}
          >
            <PhoneIcon size={18} color="#22C55E" />
          </TouchableOpacity>

          {/* WhatsApp Button */}
          <TouchableOpacity
            style={styles.actionCircleBtn}
            onPress={() => handleWhatsApp(item)}
            activeOpacity={0.75}
          >
            <WhatsAppIcon size={18} color="#22C55E" />
          </TouchableOpacity>

          {/* Eye (View Details) Button */}
          <TouchableOpacity
            style={styles.actionCircleBtn}
            onPress={() => setSelectedContact(item)}
            activeOpacity={0.75}
          >
            <EyeIcon size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleEditCurrentEvent = () => {
    const currentEvent = events.find((e) => String(e._id) === String(selectedEventId));
    if (!currentEvent) return;
    navigation?.navigate('NewEvent', {
      isEdit: true,
      event: currentEvent,
      onEventUpdated: (updated) => {
        setEvents((prev) =>
          prev.map((e) => (e._id === updated._id ? { ...e, ...updated } : e))
        );
        loadContacts(selectedEventId, searchQuery);
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0C16" />

      {/* 1. HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backCircleBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <BackIcon size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contacts</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      {/* 2. SEARCH & FILTER ROW */}
      <View style={styles.searchFilterRow}>
        {/* Search Input Pill */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          <SearchIcon size={18} color="#64748B" />
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setIsFilterModalVisible(true)}
          activeOpacity={0.7}
        >
          <FilterIcon size={18} color="#8F90A6" />
          <Text style={styles.filterBtnText}>filter</Text>
        </TouchableOpacity>
      </View>

      {/* 3. CONTACTS LIST */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#8B5CF6" size="large" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.centerContainer}>
          <UserIcon size={44} color="#334155" />
          <Text style={styles.emptyTitle}>No Contacts Found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `No contacts match "${searchQuery}".`
              : 'Contacts saved in this category will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item, idx) => item._id || `contact-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8B5CF6"
              colors={['#8B5CF6']}
            />
          }
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FILTER BY CONTACT CATEGORY */}
      {/* ========================================================================= */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsFilterModalVisible(false)}
        >
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filter by Contact Category</Text>

            <TouchableOpacity
              style={[
                styles.eventFilterItem,
                (!selectedEventId || selectedEventId === 'all') && styles.eventFilterItemSelected,
              ]}
              onPress={() => {
                setSelectedEventId('all');
                setIsFilterModalVisible(false);
              }}
            >
              <Text
                style={[
                  styles.eventFilterText,
                  (!selectedEventId || selectedEventId === 'all') && styles.eventFilterTextSelected,
                ]}
              >
                All Categories
              </Text>
              {(!selectedEventId || selectedEventId === 'all') && (
                <CheckIcon size={18} color="#8B5CF6" />
              )}
            </TouchableOpacity>

            {events.map((ev) => {
              const isSelected = String(selectedEventId) === String(ev._id);
              return (
                <TouchableOpacity
                  key={ev._id}
                  style={[styles.eventFilterItem, isSelected && styles.eventFilterItemSelected]}
                  onPress={() => {
                    setSelectedEventId(ev._id);
                    setIsFilterModalVisible(false);
                  }}
                >
                  <Text
                    style={[styles.eventFilterText, isSelected && styles.eventFilterTextSelected]}
                  >
                    {ev.name}
                  </Text>
                  {isSelected && <CheckIcon size={18} color="#8B5CF6" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CONTACT DETAILS BOTTOM SHEET */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(selectedContact)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedContact(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedContact(null)}
        >
          <View style={styles.detailSheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.detailHeader}>
              <View style={styles.detailTitleCol}>
                <Text style={styles.detailName}>{selectedContact?.name}</Text>
                <Text style={styles.detailEventTag}>
                  {events.find((e) => String(e._id) === String(selectedContact?.eventId || selectedEventId))?.name ||
                    (selectedContact?.eventTitle && selectedContact.eventTitle !== 'Furry Fest'
                      ? selectedContact.eventTitle
                      : 'Contact Category')}
                </Text>
              </View>

              <View style={styles.detailHeaderActions}>
                {/* Edit Contact Button */}
                <TouchableOpacity
                  style={styles.detailHeaderIconBtn}
                  onPress={() => {
                    const target = selectedContact;
                    setSelectedContact(null);
                    handleOpenEdit(target);
                  }}
                  activeOpacity={0.75}
                >
                  <EditIcon size={16} color="#A78BFA" />
                </TouchableOpacity>

                {/* Soft Delete Contact Button */}
                <TouchableOpacity
                  style={styles.detailHeaderIconBtn}
                  onPress={() => {
                    const target = selectedContact;
                    handleDeleteContact(target);
                  }}
                  activeOpacity={0.75}
                >
                  <TrashIcon size={16} color="#A78BFA" />
                </TouchableOpacity>

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.detailHeaderIconBtn}
                  onPress={() => setSelectedContact(null)}
                  activeOpacity={0.75}
                >
                  <XIcon size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Info Items */}
            <View style={styles.detailBody}>
              <View style={styles.detailRow}>
                <PhoneIcon size={16} color="#8F90A6" />
                <Text style={styles.detailValue}>{selectedContact?.phone || 'No phone'}</Text>
              </View>

              {selectedContact?.companyName ? (
                <View style={styles.detailRow}>
                  <BuildingIcon size={16} color="#8F90A6" />
                  <Text style={styles.detailValue}>
                    {selectedContact?.companyName}
                    {selectedContact?.designation ? ` • ${selectedContact?.designation}` : ''}
                  </Text>
                </View>
              ) : null}

              {selectedContact?.summary ? (
                <View style={styles.summaryWrap}>
                  <Text style={styles.summaryTitle}>DISCUSSION SUMMARY:</Text>
                  <Text style={styles.summaryDesc}>{selectedContact.summary}</Text>
                </View>
              ) : null}
            </View>

            {/* Actions */}
            <View style={styles.detailActionsRow}>
              <TouchableOpacity
                style={styles.detailCallBtn}
                onPress={() => {
                  handleCall(selectedContact?.phone);
                }}
              >
                <PhoneIcon size={16} color="#22C55E" />
                <Text style={styles.detailCallBtnText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.detailWhatsAppBtn}
                onPress={() => {
                  handleWhatsApp(selectedContact);
                }}
              >
                <WhatsAppIcon size={16} color="#FFFFFF" />
                <Text style={styles.detailWhatsAppBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlayDismiss}
            activeOpacity={1}
            onPress={() => setIsEditModalVisible(false)}
          />
          <View style={styles.editSheetContainer}>
            <View style={styles.sheetHandle} />

            <View style={styles.detailHeader}>
              <View>
                  <Text style={styles.detailName}>Edit Contact</Text>
                <Text style={styles.detailEventTag}>
                  {events.find((e) => String(e._id) === String(editingContact?.eventId || selectedEventId))?.name ||
                    (editingContact?.eventTitle && editingContact.eventTitle !== 'Furry Fest'
                      ? editingContact.eventTitle
                      : 'Contact Category')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <XIcon size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.editFormScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editFormData.name}
                  onChangeText={(val) => setEditFormData((prev) => ({ ...prev, name: val }))}
                  placeholder="Attendee Name"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.formInput}
                  value={editFormData.phone}
                  onChangeText={(val) => setEditFormData((prev) => ({ ...prev, phone: val }))}
                  placeholder="+91..."
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Company Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={editFormData.companyName}
                  onChangeText={(val) => setEditFormData((prev) => ({ ...prev, companyName: val }))}
                  placeholder="e.g. Acme Corp"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Designation / Role</Text>
                <TextInput
                  style={styles.formInput}
                  value={editFormData.designation}
                  onChangeText={(val) => setEditFormData((prev) => ({ ...prev, designation: val }))}
                  placeholder="e.g. Founder, Marketing Head"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Discussion Summary</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMulti]}
                  value={editFormData.summary}
                  onChangeText={(val) => setEditFormData((prev) => ({ ...prev, summary: val }))}
                  placeholder="Discussion details and key takeaways..."
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveContactEdit}
                disabled={editSubmitting}
                activeOpacity={0.85}
              >
                <BrandGradientBackground id="edit_contact_save_grad" borderRadius={12} />
                {editSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0C16',
  },
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

  // SEARCH & FILTER
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1F35',
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 51,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    padding: 0,
    margin: 0,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingVertical: 6,
  },
  filterBtnText: {
    color: '#8F90A6',
    fontSize: 13,
    fontFamily: Fonts.family.medium,
    marginLeft: 6,
  },

  // CONTACTS LIST
  listContent: {
    paddingBottom: 24,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoTouchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameColumn: {
    flex: 1.2,
    justifyContent: 'center',
  },
  contactName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.family.semiBold,
  },
  eventColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  eventNameText: {
    color: '#A855F7',
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
  },
  dateText: {
    color: '#8F90A6',
    fontSize: 12,
    marginTop: 2,
  },
  actionColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1F35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },

  // EMPTY / LOADING
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#8F90A6',
    fontSize: 13,
    marginTop: 12,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.family.bold,
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#16172B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: '#26273E',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: Fonts.family.bold,
    marginBottom: 14,
  },
  eventFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1F35',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  eventFilterItemSelected: {
    borderColor: '#8B5CF6',
    borderWidth: 1,
  },
  eventFilterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.medium,
  },
  eventFilterTextSelected: {
    color: '#C084FC',
    fontFamily: Fonts.family.bold,
  },

  // DETAIL SHEET
  detailSheetContainer: {
    backgroundColor: '#16172B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: '#26273E',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  detailHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailHeaderIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1F35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.family.bold,
  },
  detailEventTag: {
    color: '#A855F7',
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
    marginTop: 2,
  },
  detailBody: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailValue: {
    color: '#E2E8F0',
    fontSize: 14,
    marginLeft: 10,
  },
  summaryWrap: {
    backgroundColor: '#1E1F35',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  summaryTitle: {
    color: '#8F90A6',
    fontSize: 11,
    fontFamily: Fonts.family.bold,
    marginBottom: 4,
  },
  summaryDesc: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1F35',
    borderColor: '#22C55E',
    borderWidth: 1,
    height: 44,
    borderRadius: 12,
  },
  detailCallBtnText: {
    color: '#22C55E',
    fontSize: 13,
    fontFamily: Fonts.family.bold,
    marginLeft: 4,
  },
  detailWhatsAppBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    height: 44,
    borderRadius: 12,
  },
  detailWhatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.family.bold,
    marginLeft: 4,
  },
  detailEditBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1F35',
    borderColor: '#8B5CF6',
    borderWidth: 1,
    height: 44,
    borderRadius: 12,
  },
  detailEditBtnText: {
    color: '#A78BFA',
    fontSize: 13,
    fontFamily: Fonts.family.bold,
    marginLeft: 4,
  },
  detailDeleteBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1F35',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    height: 44,
    borderRadius: 12,
  },
  detailDeleteBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontFamily: Fonts.family.bold,
    marginLeft: 4,
  },

  // EDIT MODAL STYLES
  modalOverlayDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  editSheetContainer: {
    backgroundColor: '#16172B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: '#26273E',
    maxHeight: '88%',
  },
  editFormScroll: {
    maxHeight: 400,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Fonts.family.semiBold,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: '#1E1F35',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 0,
    minHeight: 51,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  formInputMulti: {
    height: 88,
    paddingTop: 10,
  },
  editModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1F35',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
  },
  saveBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4013C7',
    overflow: 'hidden',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.bold,
  },
});

export default EventContactsScreen;

