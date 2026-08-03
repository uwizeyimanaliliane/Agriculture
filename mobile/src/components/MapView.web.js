import React from 'react';
import { View, Text } from 'react-native';
import { tw } from '../utils/tw';
import { useTheme } from '../context/ThemeContext';

const MapView = React.forwardRef(({ style, children, ...props }, ref) => {
  const { isDarkMode } = useTheme();
  return React.createElement(View, {
    ref,
    style: [style, tw(`items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)],
    children: React.createElement(Text, {
      style: tw(`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`),
      children: 'Map view is not available on web'
    })
  });
});

const Marker = (props) => null;
const Polyline = (props) => null;
const PROVIDER_GOOGLE = null;

export { Marker, Polyline, PROVIDER_GOOGLE };
export default MapView;
