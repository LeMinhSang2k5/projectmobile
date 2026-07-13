/**
 * Context dieu khien an/hien BottomNav khi scroll Home.
 * DashboardScreen dung useHideOnScroll de set isBottomNavHidden.
 */
import { createContext, useContext } from 'react';

export type BottomNavContextType = {
  isBottomNavHidden: boolean;
  setBottomNavHidden: (hidden: boolean) => void;
};

export const BottomNavContext = createContext<BottomNavContextType>({
  isBottomNavHidden: false,
  setBottomNavHidden: () => {},
});

/** Doc context an/hien bottom tab */
export function useBottomNav() {
  return useContext(BottomNavContext);
}
