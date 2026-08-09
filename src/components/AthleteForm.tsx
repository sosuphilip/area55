import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';

import { Button, Field } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { athletePhotoUrl, deleteAthletePhoto, uploadAthletePhoto } from '@/lib/storage';
import type { Database } from '@/types/database';
import { errorMessage } from '@/utils/errors';
import { formatDateInput } from '@/utils/format';

type Athlete = Database['public']['Tables']['athletes']['Row'];

export type AthleteValues = {
  name: string;
  sport: string;
  position: string | null;
  birthdate: string | null;
  notes: string | null;
  photo_path: string | null;
};

type AthleteFormProps = {
  initial?: Athlete;
  submitLabel: string;
  onSubmit: (values: AthleteValues) => Promise<void>;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function AthleteForm({ initial, submitLabel, onSubmit }: AthleteFormProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const [name, setName] = useState(initial?.name ?? '');
  const [sport, setSport] = useState(initial?.sport ?? '');
  const [position, setPosition] = useState(initial?.position ?? '');
  const [birthdate, setBirthdate] = useState(initial?.birthdate ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  // A freshly picked (not yet uploaded) photo.
  const [pickedPhoto, setPickedPhoto] = useState<{
    uri: string;
    file: Blob | Uint8Array;
    mimeType?: string | null;
  } | null>(null);
  // Whether the athlete's existing photo should be removed on save.
  const [removeExisting, setRemoveExisting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): AthleteValues | null => {
    const next: Record<string, string> = {};
    const trimmedName = name.trim();
    if (!trimmedName) next.name = 'Name is required.';
    else if (trimmedName.length > 120) next.name = 'Keep the name under 120 characters.';
    if (birthdate.trim() && !DATE_RE.test(birthdate.trim())) {
      next.birthdate = 'Use YYYY-MM-DD.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return null;

    return {
      name: trimmedName,
      sport: sport.trim(),
      position: position.trim() || null,
      birthdate: birthdate.trim() || null,
      notes: notes.trim() || null,
      photo_path: null,
    };
  };

  const pickPhoto = async () => {
    try {
      // Web uses the browser file input, which needs no permission prompt.
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setGeneralError('Allow photo access to add a picture.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.8,
      };
      // Cropping is native-only (the SDK docs list web as unsupported).
      if (Platform.OS !== 'web') {
        options.allowsEditing = true;
        options.aspect = [1, 1];
      }
      const result = await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      // Web exposes the selected file directly; native reads the file bytes.
      const file = asset.file ?? (await new File(asset.uri).bytes());
      setPickedPhoto({ uri: asset.uri, file, mimeType: asset.mimeType });
      setRemoveExisting(false);
    } catch (e) {
      setGeneralError(errorMessage(e));
    }
  };

  const removePhoto = () => {
    if (pickedPhoto) {
      setPickedPhoto(null);
    } else {
      setRemoveExisting(true);
    }
  };

  const submit = async () => {
    const values = validate();
    if (!values) return;
    if (!user) {
      setGeneralError('Not signed in. Sign out and back in.');
      return;
    }
    setSubmitting(true);
    setGeneralError(null);

    const existingPath = removeExisting ? null : (initial?.photo_path ?? null);
    let newPath: string | null = null;
    try {
      if (pickedPhoto) {
        newPath = await uploadAthletePhoto(user.id, pickedPhoto.file, pickedPhoto.mimeType);
      }
      await onSubmit({ ...values, photo_path: newPath ?? existingPath });

      // Save succeeded — clear out the object we replaced or removed.
      if (newPath && initial?.photo_path && initial.photo_path !== newPath) {
        await deleteAthletePhoto(initial.photo_path);
      } else if (!newPath && removeExisting) {
        await deleteAthletePhoto(initial?.photo_path ?? null);
      }
    } catch (e) {
      // Roll back a freshly uploaded object so a failed save doesn't orphan it.
      if (newPath) await deleteAthletePhoto(newPath);
      setGeneralError(errorMessage(e));
      setSubmitting(false);
    }
  };

  const previewUri = pickedPhoto?.uri ?? (removeExisting ? null : athletePhotoUrl(initial?.photo_path ?? null));

  return (
    <View style={styles.form}>
      <View style={styles.photoRow}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.photo} />
        ) : (
          <View
            style={[styles.photo, styles.photoPlaceholder, { backgroundColor: theme.backgroundSelected }]}
          >
            <Ionicons name="person" size={30} color={theme.textSecondary} />
          </View>
        )}
        <View style={styles.photoActions}>
          <Button
            label={previewUri ? 'Change photo' : 'Add photo'}
            variant="secondary"
            onPress={pickPhoto}
          />
          {previewUri ? (
            <Button label="Remove" variant="ghost" onPress={removePhoto} />
          ) : null}
        </View>
      </View>

      <Field
        label="Name *"
        value={name}
        onChangeText={setName}
        placeholder="Alex Rivera"
        error={errors.name}
      />
      <Field
        label="Sport"
        value={sport}
        onChangeText={setSport}
        placeholder="Soccer"
        error={errors.sport}
      />
      <Field
        label="Position"
        value={position}
        onChangeText={setPosition}
        placeholder="Winger"
        error={errors.position}
      />
      <Field
        label="Birthdate"
        value={birthdate}
        onChangeText={(t) => setBirthdate(formatDateInput(t))}
        placeholder="YYYY-MM-DD"
        error={errors.birthdate}
        autoCorrect={false}
      />
      <Field
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Coach observations…"
        multiline
        numberOfLines={4}
        error={errors.notes}
      />

      {generalError ? (
        <Text style={{ color: theme.negative, fontSize: 14 }}>{generalError}</Text>
      ) : null}

      <Button label={submitLabel} onPress={submit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  photo: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  photoActions: { flex: 1, gap: Spacing.two },
});
