import Config from 'react-native-config';

export const getStorageUrl = (bucket: string, fileName: string) =>
  `${Config.SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;

export function formatMemberSince(dateString: string | null): string | null {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
