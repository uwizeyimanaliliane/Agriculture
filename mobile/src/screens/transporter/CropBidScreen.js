import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList, TextInput, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { cropAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import ContactButtons from '../../components/ContactButtons';
import { ADMIN_PHONE, ADMIN_NAME } from '../../utils/contact';

const CropBidScreen = ({ navigation }) => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidModal, setBidModal] = useState(null);
  const [bidPrice, setBidPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isDarkMode } = useTheme();

  const fetchCrops = async () => {
    setLoading(true);
    try {
      const res = await cropAPI.getNeedingTransport();
      setCrops(res.data.crops || []);
    } catch { } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchCrops(); }, []));

  const submitBid = async () => {
    const crop = bidModal;
    if (!crop) return;
    const price = parseFloat(bidPrice);
    if (!price || price <= 0) { Alert.alert('Error', 'Enter a valid price'); return; }
    setSubmitting(true);
    try {
      await cropAPI.submitTransportBid(crop._id, price);
      Alert.alert('Bid Submitted', `Your bid of ${formatCurrency(price)} for "${crop.name}" has been submitted.`);
      setBidModal(null);
      setBidPrice('');
      fetchCrops();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit bid');
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <TouchableOpacity style={tw('self-start px-4 py-2 rounded-full bg-green-600')}
          onPress={() => navigation.goBack()}>
          <Text style={tw('text-white font-medium')}>← Back</Text>
        </TouchableOpacity>
        <Text style={tw('text-white text-2xl font-bold mt-4')}>Crops Needing Transport</Text>
        <Text style={tw('text-green-200 text-sm mt-1')}>Set your price to get the job</Text>
      </View>

      <FlatList data={crops} keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={tw('flex-1 justify-center items-center pt-20')}>
            <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No crops need transport right now</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <View style={tw('flex-row justify-between')}>
              <View style={tw('flex-1')}>
                <Text style={tw(`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{item.name}</Text>
                <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                  {item.quantity} {item.quantityUnit} · {item.category}
                </Text>
                <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                  Location: {item.location?.district || item.user?.location?.district || 'N/A'}
                </Text>
                {item.price && (
                  <Text style={tw('text-green-600 font-bold mt-1')}>{formatCurrency(item.price)}/{item.priceUnit}</Text>
                )}
                <ContactButtons
                  phone={item.adminContact?.phone || ADMIN_PHONE}
                  name={item.adminContact?.name || ADMIN_NAME}
                  smsBody={`Transport bid for ${item.name} in ${item.location?.district || 'unknown district'}`}
                  compact
                  isDarkMode={isDarkMode}
                />
              </View>
              {item.myBid ? (
                <View style={tw('bg-green-100 px-3 py-1.5 rounded-lg self-center')}>
                  <Text style={tw('text-green-800 text-xs font-medium')}>
                    Your bid: {formatCurrency(item.myBid.price)}
                  </Text>
                  <TouchableOpacity onPress={() => { setBidModal(item); setBidPrice(String(item.myBid.price)); }}>
                    <Text style={tw('text-green-700 text-xs font-semibold mt-1 text-center')}>Update</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={tw('bg-green-700 px-4 py-2 rounded-lg self-center')}
                  onPress={() => { setBidModal(item); setBidPrice(''); }}>
                  <Text style={tw('text-white font-medium text-sm')}>Set Your Price</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      <Modal visible={!!bidModal} transparent animationType="fade"
        onRequestClose={() => setBidModal(null)}>
        <View style={tw('flex-1 bg-black/50 justify-center items-center p-6')}>
          <View style={tw(`w-full rounded-2xl p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <Text style={tw(`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
              Set Your Transport Price
            </Text>
            <Text style={tw(`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              {bidModal?.name} · {bidModal?.quantity} {bidModal?.quantityUnit}
            </Text>
            <TextInput
              style={tw(`border rounded-xl px-4 py-3 mb-4 ${isDarkMode ? 'border-slate-600 text-white bg-slate-700' : 'border-gray-300 text-gray-800 bg-white'}`)}
              placeholder="Your transport price (RWF)"
              placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
              keyboardType="numeric"
              value={bidPrice}
              onChangeText={setBidPrice}
            />
            <View style={tw('flex-row gap-3')}>
              <TouchableOpacity style={tw('flex-1 bg-gray-300 py-3 rounded-xl items-center')}
                onPress={() => setBidModal(null)}>
                <Text style={tw('text-gray-700 font-medium')}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw(`flex-1 bg-green-700 py-3 rounded-xl items-center ${submitting ? 'opacity-50' : ''}`)}
                onPress={submitBid} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={tw('text-white font-medium')}>Submit Bid</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CropBidScreen;