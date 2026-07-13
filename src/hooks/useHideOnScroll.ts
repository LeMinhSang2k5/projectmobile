/**
 * Hook dung tren DashboardScreen: an bottom tab khi scroll den cuoi ScrollView.
 */
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useBottomNav } from '../contexts/BottomNavContext';

/** Tra ve handler onScroll - an tab bar khi cham day danh sach */
export function useHideOnScroll() {
  const { setBottomNavHidden } = useBottomNav();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    
    // An bottom nav khi scroll den gan cuoi (nguong 20px)
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
    
    setBottomNavHidden(isAtBottom);
  };

  return handleScroll;
}
