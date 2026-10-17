import { Platform } from 'react-native';

type ImagePickerModule = typeof import('expo-image-picker');

let cached: ImagePickerModule | null = null;
let loadFailed = false;

/**
 * `expo-image-picker` is a native module. The current development APK was
 * built before it was added, and evaluating the import at screen load takes
 * the Grail tab down. Load it only when the person asks for a photo.
 */
async function loadImagePicker(): Promise<ImagePickerModule | null> {
  if (Platform.OS === 'web' || loadFailed) {
    return null;
  }

  if (cached !== null) {
    return cached;
  }

  try {
    cached = await import('expo-image-picker');
    return cached;
  } catch {
    loadFailed = true;
    return null;
  }
}

export type ProofImagePick = 'canceled' | 'unavailable' | { readonly uri: string };

export async function pickProofImage(): Promise<ProofImagePick> {
  const ImagePicker = await loadImagePicker();
  if (ImagePicker === null) {
    return 'unavailable';
  }

  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return 'canceled';
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    return uri === undefined ? 'canceled' : { uri };
  } catch {
    return 'unavailable';
  }
}
