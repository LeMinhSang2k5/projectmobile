import { createContext, useContext } from 'react';

export type BottomNavContextType = {
  isBottomNavHidden: boolean;
  setBottomNavHidden: (hidden: boolean) => void;
};

export const BottomNavContext = createContext<BottomNavContextType>({
  isBottomNavHidden: false,
  setBottomNavHidden: () => {},
});

export function useBottomNav() {
  return useContext(BottomNavContext);
}
