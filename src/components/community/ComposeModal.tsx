import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
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
  POST_IMAGE_ALLOWED_TYPES,
  POST_IMAGE_MAX_SIZE,
} from '../../utils/communityHelpers';
import { containsBlockedContent } from '../../utils/moderation';
import { styles } from '../../styles/communityStyles';

interface ComposeModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string, imageUrl: string | null) => Promise<void>;
  isQuestParticipant: boolean;
}

export default function ComposeModal({
  visible,
  onClose,
  onSubmit,
  isQuestParticipant,
}: ComposeModalProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string>('image/jpeg');

  const handleClose = () => {
    setContent('');
    setImageUri(null);
    onClose();
  };

  const handlePickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || !response.assets?.length) return;
      const asset = response.assets[0];

      const type = asset.type?.toLowerCase() ?? '';
      if (!POST_IMAGE_ALLOWED_TYPES.includes(type)) {
        Alert.alert(
          'Unsupported file type',
          'You can upload only images (JPEG, PNG, WEBP, GIF).',
        );
        return;
      }
      if ((asset.fileSize ?? 0) > POST_IMAGE_MAX_SIZE) {
        Alert.alert('File too large', 'Maximum allowed file size is 5 MB.');
        return;
      }

      setImageUri(asset.uri ?? null);
      setImageType(asset.type ?? 'image/jpeg');
    });
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed && !imageUri) {
      Alert.alert('Add a story or photo', 'Share a quick note or attach a photo.');
      return;
    }
    if (trimmed.length > 2000) {
      Alert.alert('Too long', 'Posts cannot exceed 2000 characters.');
      return;
    }
    if (containsBlockedContent(trimmed)) {
      Alert.alert(
        'Objectionable Content',
        'Your post contains content that violates our community guidelines. Please review and edit before posting.',
      );
      return;
    }

    setLoading(true);

    let uploadedImageUrl: string | null = null;
    if (imageUri) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const ext = imageType.split('/')[1] ?? 'jpg';
        const fileName = `${Date.now()}-photo.${ext}`;
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: imageType,
          name: fileName,
        } as any);
        const uploadResponse = await fetch(
          `${Config.SUPABASE_URL}/storage/v1/object/community_posts/${fileName}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: Config.SUPABASE_KEY!,
            },
            body: formData,
          },
        );
        if (!uploadResponse.ok) {
          const errText = await uploadResponse.text();
          throw new Error(errText);
        }
        uploadedImageUrl = fileName;
      } catch (err) {
        Alert.alert(
          'Upload Failed',
          'Failed to upload image. Please try again.',
        );
        setLoading(false);
        return;
      }
    }

    await onSubmit(trimmed, uploadedImageUrl);
    setLoading(false);
    setContent('');
    setImageUri(null);
    onClose();
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
          <View style={styles.composeSheet}>
            <View style={styles.composeHeader}>
              <Text style={styles.composeTitle}>New Post</Text>
              <TouchableOpacity onPress={handleClose}>
                <Icon name="close" size={22} color={Colors.blueGrey} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.composeInput}
              value={content}
              onChangeText={setContent}
              placeholder={
                isQuestParticipant
                  ? 'Share your latest trail story...'
                  : 'Quest participation required to post.'
              }
              placeholderTextColor="#9AA0A6"
              multiline
              maxLength={2000}
              autoFocus={isQuestParticipant}
              editable={isQuestParticipant && !loading}
            />
            <Text style={styles.composeCount}>{content.length}/2000</Text>

            {imageUri ? (
              <View style={styles.imagePreviewWrap}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImageUri(null)}
                  disabled={loading}
                >
                  <Icon name="close-circle" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.composeActions}>
              <TouchableOpacity
                style={[
                  styles.addPhotoBtn,
                  (!isQuestParticipant || loading) && { opacity: 0.4 },
                ]}
                onPress={handlePickImage}
                disabled={!isQuestParticipant || loading}
              >
                <Icon name="image-outline" size={18} color={Colors.blueGrey} />
                <Text style={styles.addPhotoText}>
                  {imageUri ? 'Change photo' : 'Add photo'}
                </Text>
              </TouchableOpacity>

              <View style={styles.composeBtns}>
                <TouchableOpacity
                  style={styles.composeCancelBtn}
                  onPress={handleClose}
                >
                  <Text style={styles.composeCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.composeSubmitBtn,
                    ((!content.trim() && !imageUri) ||
                      loading ||
                      !isQuestParticipant) && {
                      opacity: 0.5,
                    },
                  ]}
                  onPress={handleSubmit}
                  disabled={
                    (!content.trim() && !imageUri) ||
                    loading ||
                    !isQuestParticipant
                  }
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.composeSubmitText}>Publish</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
