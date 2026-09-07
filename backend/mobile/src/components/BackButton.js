import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { tw } from '../utils/tw';
import { useTheme } from '../context/ThemeContext';

const BackButton = ({ onPress, label = 'Back', style }) => {
  const { isDarkMode } = useTheme();

  return (
    <TouchableOpacity
      style={tw(`flex-row items-center self-start px-4 py-2 rounded-full border shadow-sm ${isDarkMode ? 'border-slate-600 bg-slate-800' : 'border-green-200 bg-white'} ${style || ''}`)}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={tw(`text-base font-semibold mr-2 ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>←</Text>
      <Text style={tw(`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>{label}</Text>
    </TouchableOpacity>
  );
};

export default BackButton;
