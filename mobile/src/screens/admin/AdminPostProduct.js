import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Modal, Image, Dimensions } from 'react-native';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { cropAPI } from '../../services/api';
import { formatCurrency, getImageUrl } from '../../utils/formatters';
import ContactButtons from '../../components/ContactButtons';
import { confirmAlert, alert as platformAlert } from '../../utils/platform';

const AdminPostProduct = ({ navigation }) => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const { isDarkMode } = useTheme();

  const fetchCrops = async () => {
    setLoading(true);
    try {
      const res = await cropAPI.getNeedingTransport();
      setCrops(res.data.crops || []);
    } catch { } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchCrops(); }, []));

  const openBids = async (crop) => {
    setSelectedCrop(crop);
    setBidsLoading(true);
    try {
      const res = await cropAPI.getTransportBids(crop._id);
      setBids(res.data.bids || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load bids');
    } finally {
      setBidsLoading(false);
    }
  };

  const acceptBid = (bid) => {
    confirmAlert(
      'Post to Market',
      `Accept ${bid.transporter?.name}'s bid of ${formatCurrency(bid.price)} for transport?\n\nThis will post "${selectedCrop.name}" to the market with total price = ${formatCurrency(selectedCrop.price)} + 2,500 fee + ${formatCurrency(bid.price)} transport.`,
      async () => {
        try {
          await cropAPI.acceptTransportBid(selectedCrop._id, bid._id);
          platformAlert('Posted!', `"${selectedCrop.name}" is now live for buyers with all costs combined.`);
          setSelectedCrop(null);
          setBids([]);
          fetchCrops();
        } catch (err) {
          platformAlert('Error', err.response?.data?.message || 'Failed to post product');
        }
      },
      null,
      'Post Product',
      'Cancel'
    );
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
        <Text style={tw('text-white text-2xl font-bold mt-4')}>Post Product to Market</Text>
        <Text style={tw('text-green-200 text-sm mt-1')}>Accept a transporter bid to publish the product</Text>
      </View>

      {crops.length === 0 ? (
        <View style={tw('flex-1 justify-center items-center px-6')}>
          <Text style={tw(`text-5xl mb-4`)}>🌾</Text>
          <Text style={tw(`text-lg text-center mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>All products are posted</Text>
          <Text style={tw(`text-sm text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            Approve a farmer's crop first, then come here to post it with a transporter.
          </Text>
          <TouchableOpacity style={tw('mt-6 bg-green-700 py-3 px-6 rounded-xl')}
            onPress={() => navigation.navigate('AdminPendingCrops')}>
            <Text style={tw('text-white font-medium')}>Go to Pending Crops</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList data={crops} keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={tw(`p-4 mb-3 rounded-2xl shadow-sm border-l-4 border-green-500 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}
              onPress={() => openBids(item)}>
              <View style={tw('flex-row')}>
                {item.photos?.[0] ? (
                  <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); setPreviewImage(item.photos[0]); }}>
                    <Image source={{ uri: getImageUrl(item.photos[0]) }} style={tw('w-16 h-16 rounded-xl mr-3')} />
                  </TouchableOpacity>
                ) : null}
                <View style={tw('flex-1')}>
                  <View style={tw('flex-row justify-between items-start')}>
                    <View style={tw('flex-1')}>
                      <Text style={tw(`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{item.name}</Text>
                      <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                        {item.quantity} {item.quantityUnit}
                      </Text>
                      <Text style={tw('text-green-600 font-bold mt-1')}>
                        {formatCurrency(item.price)} / {item.priceUnit}
                      </Text>
                      <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                        Farmer: {item.user?.name || 'Unknown'} · {item.location?.district || item.user?.location?.district || 'N/A'}
                      </Text>
                    </View>
                    <View style={tw('bg-green-100 px-3 py-1.5 rounded-lg')}>
                      <Text style={tw('text-green-800 text-xs font-medium')}>
                        {item.transportBids?.length || 0} bid(s)
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={tw('mt-3 pt-3 border-t border-gray-200 flex-row justify-between')}>
                <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                  Combined total: {formatCurrency(item.price + 2500)} + transport
                </Text>
                <Text style={tw('text-green-700 text-xs font-semibold')}>Tap to view bids →</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!previewImage} transparent animationType="fade"
        onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={tw('flex-1 bg-black/90 justify-center items-center')}
          activeOpacity={1} onPress={() => setPreviewImage(null)}>
          {previewImage && (
            <Image source={{ uri: getImageUrl(previewImage) }}
              style={{ width: SCREEN_WIDTH - 40, height: SCREEN_WIDTH - 40 }}
              resizeMode="contain" />
          )}
          <TouchableOpacity style={tw('absolute top-12 right-6 w-10 h-10 bg-white/20 rounded-full items-center justify-center')}
            onPress={() => setPreviewImage(null)}>
            <Text style={tw('text-white text-xl')}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!selectedCrop} transparent animationType="slide"
        onRequestClose={() => { setSelectedCrop(null); setBids([]); }}>
        <View style={tw('flex-1 bg-black/50 justify-end')}>
          <View style={tw(`rounded-t-3xl p-6 max-h-3/4 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <View style={tw('flex-row justify-between items-center mb-2')}>
              <Text style={tw(`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
                {selectedCrop?.name}
              </Text>
              <TouchableOpacity onPress={() => { setSelectedCrop(null); setBids([]); }}>
                <Text style={tw('text-red-500 font-medium')}>Close</Text>
              </TouchableOpacity>
            </View>
            <Text style={tw(`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              Select a transporter bid to post this product to the market
            </Text>

            {bidsLoading ? (
              <ActivityIndicator size="large" color="#16a34a" style={{ marginVertical: 30 }} />
            ) : bids.length === 0 ? (
              <View style={tw('py-10 items-center')}>
                <Text style={tw(`text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                  No transporter bids yet.
                </Text>
                <Text style={tw(`text-xs text-center mt-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                  Transporters will submit bids after being notified.
                </Text>
              </View>
            ) : (
              bids.map(b => (
                <View key={b._id} style={tw(`p-4 mb-3 rounded-2xl ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50 border border-gray-200'}`)}>
                  <View style={tw('flex-row justify-between items-center')}>
                    <View style={tw('flex-1')}>
                      <Text style={tw(`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
                        {b.transporter?.name || 'Unknown'}
                      </Text>
                      <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                        {b.transporter?.phone || ''}
                      </Text>
                      {b.transporter?.email ? (
                        <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                          {b.transporter.email}
                        </Text>
                      ) : null}
                      {b.transporter?.phone && (
                        <ContactButtons
                          phone={b.transporter.phone}
                          name={b.transporter.name}
                          smsBody={`Transport for ${selectedCrop?.name || 'crop'} - coordinate delivery for buyer`}
                          compact
                          isDarkMode={isDarkMode}
                        />
                      )}
                      <Text style={tw(`text-xl font-bold text-green-600 mt-1`)}>
                        {formatCurrency(b.price)}
                      </Text>
                      <View style={tw('mt-1 p-2 rounded-lg bg-amber-50')}>
                        <Text style={tw('text-xs text-amber-700')}>
                          Buyer total: {formatCurrency((selectedCrop?.price || 0) + 2500 + b.price)} (combined)
                        </Text>
                      </View>
                    </View>
                    {b.status === 'pending' ? (
                      <TouchableOpacity style={tw('bg-green-700 px-5 py-3 rounded-xl')}
                        onPress={() => acceptBid(b)}>
                        <Text style={tw('text-white font-semibold')}>Post</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={tw(`px-3 py-1.5 rounded-full ${b.status === 'accepted' ? 'bg-green-100' : 'bg-red-100'}`)}>
                        <Text style={tw(`text-xs font-medium ${b.status === 'accepted' ? 'text-green-700' : 'text-red-700'}`)}>
                          {b.status === 'accepted' ? 'Accepted' : 'Declined'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AdminPostProduct;