import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { tw } from '../utils/tw';
import { callPhone, smsPhone } from '../utils/contact';

const ContactButtons = ({
  phone,
  name,
  smsBody = '',
  compact = false,
  isDarkMode = false,
}) => {
  if (!phone) return null;

  const buttonStyle = compact
    ? 'px-3 py-1.5 rounded-lg mr-2'
    : 'flex-1 py-2.5 rounded-xl items-center mr-2';

  return (
    <View style={tw(compact ? 'flex-row items-center mt-2' : 'mt-3')}>
      {!compact && name && (
        <Text style={tw(`text-xs mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
          Contact {name}: {phone}
        </Text>
      )}
      <View style={tw('flex-row')}>
        <TouchableOpacity
          style={tw(`${buttonStyle} bg-green-700`)}
          onPress={() => callPhone(phone)}
        >
          <Text style={tw('text-white font-medium text-sm')}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={tw(`${buttonStyle} bg-blue-600`)}
          onPress={() => smsPhone(phone, smsBody)}
        >
          <Text style={tw('text-white font-medium text-sm')}>SMS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ContactButtons;
