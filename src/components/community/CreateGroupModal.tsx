import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import Config from 'react-native-config';
import { Colors } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import {
  GROUP_IMAGE_MAX_SIZE,
  validateGroupForm,
} from '../../utils/communityHelpers';
import { styles } from '../../styles/communityStyles';

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserId: string | null;
  onGroupCreated: (groupId: string, groupName: string) => void;
}

export default function CreateGroupModal({
  visible,
  onClose,
  currentUserId,
  onGroupCreated,
}: CreateGroupModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [headerImageUri, setHeaderImageUri] = useState<string | null>(null);
  const [headerImageType, setHeaderImageType] = useState<string>('image/jpeg');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setIsPrivate(false);
    setHeaderImageUri(null);
    setErrors({});
    onClose();
  };

  const handlePickHeaderImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || !response.assets?.length) return;
      const asset = response.assets[0];
      if ((asset.fileSize ?? 0) > GROUP_IMAGE_MAX_SIZE) {
        Alert.alert('File too large', 'Maximum allowed file size is 5 MB.');
        return;
      }
      setHeaderImageUri(asset.uri ?? null);
      setHeaderImageType(asset.type ?? 'image/jpeg');
    });
  };

  const handleCreate = async () => {
    const fieldErrors = validateGroupForm(title, description);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    if (!currentUserId) return;

    setLoading(true);

    let headerImageUrl: string | null = null;
    if (headerImageUri) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const ext = headerImageType.split('/')[1] ?? 'jpg';
        const fileName = `${Date.now()}-header.${ext}`;
        const formData = new FormData();
        formData.append('file', {
          uri: headerImageUri,
          type: headerImageType,
          name: fileName,
        } as any);
        const uploadResponse = await fetch(
          `${Config.SUPABASE_URL}/storage/v1/object/community_groups/${fileName}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: Config.SUPABASE_KEY!,
            },
            body: formData,
          },
        );
        if (!uploadResponse.ok) throw new Error(await uploadResponse.text());
        headerImageUrl = fileName;
      } catch (err) {
        Alert.alert(
          'Upload Failed',
          err instanceof Error
            ? err.message
            : 'Failed to upload header image. Please try again.',
        );
        setLoading(false);
        return;
      }
    }

    const { data: groupData, error: groupError } = await supabase
      .from('community_groups')
      .insert({
        name: title.trim(),
        description: description.trim() || '',
        is_private: isPrivate,
        header_image_url: headerImageUrl,
        created_by: currentUserId,
      })
      .select('id, name')
      .single();

    if (groupError || !groupData) {
      Alert.alert('Error', groupError?.message ?? 'Failed to create group.');
      setLoading(false);
      return;
    }

    // Ensure creator is an admin member (DB trigger may handle this, but we guarantee it)
    await supabase.from('community_group_members').upsert({
      group_id: groupData.id,
      user_id: currentUserId,
      role: 'admin',
    });

    setLoading(false);
    handleClose();
    Alert.alert('Success!', `Group "${groupData.name}" has been created.`);
    onGroupCreated(groupData.id, groupData.name);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.composeOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          <View style={[styles.composeSheet, { maxHeight: '90%' }]}>
            <View style={styles.composeHeader}>
              <Text style={styles.composeTitle}>Create New Group</Text>
              <TouchableOpacity onPress={handleClose}>
                <Icon name="close" size={22} color={Colors.blueGrey} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={styles.fieldLabel}>Group Title</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  errors.title ? styles.fieldInputError : null,
                ]}
                value={title}
                onChangeText={t => {
                  setTitle(t);
                  if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
                }}
                placeholder="e.g., Pacific Northwest Overlanders"
                placeholderTextColor="#9AA0A6"
                maxLength={100}
                editable={!loading}
              />
              {errors.title ? (
                <Text style={styles.fieldError}>{errors.title}</Text>
              ) : null}

              {/* Description */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  styles.fieldInputMultiline,
                  errors.description ? styles.fieldInputError : null,
                ]}
                value={description}
                onChangeText={d => {
                  setDescription(d);
                  if (errors.description)
                    setErrors(prev => ({ ...prev, description: '' }));
                }}
                placeholder="A brief description of your group's purpose."
                placeholderTextColor="#9AA0A6"
                multiline
                maxLength={1000}
                editable={!loading}
              />
              {errors.description ? (
                <Text style={styles.fieldError}>{errors.description}</Text>
              ) : null}

              {/* Header Image */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                Header Image (Optional)
              </Text>
              {headerImageUri ? (
                <View style={styles.headerImagePreviewWrap}>
                  <Image
                    source={{ uri: headerImageUri }}
                    style={styles.headerImagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setHeaderImageUri(null)}
                    disabled={loading}
                  >
                    <Icon name="close-circle" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imagePickerBtn}
                  onPress={handlePickHeaderImage}
                  disabled={loading}
                >
                  <Icon name="image-outline" size={20} color="#9AA0A6" />
                  <Text style={styles.imagePickerText}>
                    Choose a header image
                  </Text>
                </TouchableOpacity>
              )}

              {/* Private toggle */}
              <View style={styles.privateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.privateLabel}>Make this group private</Text>
                  <Text style={styles.privateSubLabel}>
                    Invite only — members must be approved
                  </Text>
                </View>
                <Switch
                  value={isPrivate}
                  onValueChange={setIsPrivate}
                  trackColor={{ false: '#E9ECEF', true: Colors.orange }}
                  thumbColor="#fff"
                  disabled={loading}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.composeSubmitBtn,
                { marginTop: 20 },
                loading && { opacity: 0.6 },
              ]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.composeSubmitText}>Create Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
