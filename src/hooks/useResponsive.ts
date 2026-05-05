import { useWindowDimensions } from 'react-native';

/**
 * Returns layout flags based on the actual logical screen width.
 * useWindowDimensions() already accounts for display zoom, so these
 * flags update automatically if the user changes their zoom level.
 *
 * isCompact  — width < 360  (high display zoom, very small screens)
 * isNarrow   — width < 400  (moderate zoom, borderline devices)
 */
export function useResponsive() {
  const { width } = useWindowDimensions();
  return {
    isCompact: width < 360,
    isNarrow: width < 400,
    width,
  };
}
