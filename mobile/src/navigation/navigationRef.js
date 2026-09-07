import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigateToRoot(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
