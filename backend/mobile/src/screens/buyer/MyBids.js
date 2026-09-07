import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';

const MyBids = ({ navigation }) => {
  const { isDarkMode } = useTheme();

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-2xl font-bold')}>My Bids</Text>
      </View>
      <View style={tw('flex-1 items-center justify-center px-6')}>
        <Text style={tw(`text-lg text-center mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>
          Bidding is no longer available. Browse crops and buy directly at the listed price.
        </Text>
        <TouchableOpacity style={tw('bg-green-800 py-3 px-6 rounded-xl')}
          onPress={() => navigation.navigate('Auctions')}>
          <Text style={tw('text-white font-semibold')}>Browse Crops</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MyBids;