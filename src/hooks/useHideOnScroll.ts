import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useBottomNav } from '../contexts/BottomNavContext';

export function useHideOnScroll() {
  const { setBottomNavHidden } = useBottomNav();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    
    // Check if scrolled to the very bottom
    // We add a small threshold (e.g., 20px) to account for minor layout rounding
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
    
    setBottomNavHidden(isAtBottom);
  };

  return handleScroll;
}
