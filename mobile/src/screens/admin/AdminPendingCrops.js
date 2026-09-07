import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Image, Modal, Dimensions, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { cropAPI, adminAPI } from '../../services/api';
import { formatCurrency, getImageUrl } from '../../utils/formatters';
import ContactButtons from '../../components/ContactButtons';
import { confirmAlert, alert as platformAlert } from '../../utils/platform';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AdminPendingCrops = ({ navigation }) => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [tab, setTab] = useState('pending');
  const [bidCrop, setBidCrop] = useState(null);
  const [bids, setBids] = useState([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectCrop, setRejectCrop] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const { isDarkMode } = useTheme();

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await cropAPI.getPending();
      setCrops(res.data.crops || []);
    } catch (err) {
      platformAlert('Error', 'Failed to load pending crops');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPending(); }, []));

  const handleApprove = (crop) => {
    confirmAlert(
      'Approve Crop',
      `Approve "${crop.name}"? This will post it directly for buyers.`,
      async () => {
        try {
          await cropAPI.approve(crop._id);
          platformAlert('Approved', `${crop.name} is now posted for buyers.`);
          fetchPending();
        } catch (err) {
          platformAlert('Error', err.response?.data?.message || 'Failed to approve');
        }
      },
      null,
      'Approve',
      'Cancel'
    );
  };

  const handleReject = (crop) => {
    setRejectCrop(crop);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      return platformAlert('Missing reason', 'Please enter a reason for rejection.');
    }
    try {
      await cropAPI.reject(rejectCrop._id, rejectReason.trim());
      platformAlert('Rejected', `${rejectCrop.name} has been rejected.`);
      setRejectModalVisible(false);
      setRejectCrop(null);
      setRejectReason('');
      fetchPending();
    } catch (err) {
      platformAlert('Error', err.response?.data?.message || 'Failed to reject');
    }
  };

  const openBids = async (crop) => {
    setBidCrop(crop);
    setLoadingBids(true);
    try {
      const res = await cropAPI.getTransportBids(crop._id);
      setBids(res.data.bids || []);
    } catch (err) {
      platformAlert('Error', 'Failed to load bids');
    } finally {
      setLoadingBids(false);
    }
  };

  const acceptBid = (bid) => {
    confirmAlert(
      'Accept Bid',
      `Accept ${bid.transporter?.name}'s bid of ${formatCurrency(bid.price)} for transport?`,
      async () => {
        try {
          await cropAPI.acceptTransportBid(bidCrop._id, bid._id);
          platformAlert('Accepted', 'Bid accepted. Crop is now visible to buyers with transport included.');
          setBidCrop(null);
          setBids([]);
        } catch (err) {
          platformAlert('Error', err.response?.data?.message || 'Failed to accept bid');
        }
      },
      null,
      'Accept',
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
        <Text style={tw('text-white text-2xl font-bold mt-4')}>Crop Management</Text>
      </View>

      <View style={tw('flex-row px-4 pt-3 gap-2')}>
        <TouchableOpacity style={tw(`flex-1 py-2 rounded-xl items-center ${tab === 'pending' ? 'bg-green-700' : isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`)}
          onPress={() => setTab('pending')}>
          <Text style={tw(`font-medium text-sm ${tab === 'pending' ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Pending</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={crops} keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={tw('flex-1 justify-center items-center pt-20')}>
              <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No pending crops</Text>
            </View>
          }
          renderItem={({ item }) => {
            const paymentConfirmed = item.farmer?.postFeeStatus === 'confirmed';
            return (
            <View style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
              <View style={tw('flex-row')}>
                {item.photos?.[0] ? (
                  <TouchableOpacity onPress={() => setPreviewImage(item.photos[0])}>
                    <Image source={{ uri: getImageUrl(item.photos[0]) }} style={tw('w-20 h-20 rounded-xl mr-3')} />
                  </TouchableOpacity>
                ) : (
                  <View style={tw('w-20 h-20 rounded-xl mr-3 bg-green-100 items-center justify-center')}>
                    <Text style={tw('text-3xl')}>🌾</Text>
                  </View>
                )}
                <View style={tw('flex-1')}>
                  <Text style={tw(`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{item.name}</Text>
                  <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                    {item.quantity} {item.quantityUnit} - {item.category}
                  </Text>
                  {item.price && (
                    <Text style={tw('text-green-600 font-bold mt-1')}>{formatCurrency(item.price)}</Text>
                  )}
                  <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                    By: {item.user?.name || 'Unknown'} ({item.user?.email || ''})
                  </Text>
                  <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                    Phone: {item.user?.phone || 'N/A'}
                  </Text>
                  <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                    Address: {[item.farmer?.address?.province, item.farmer?.address?.district, item.farmer?.address?.sector, item.farmer?.address?.cell, item.user?.location?.district].filter(Boolean).join(', ') || 'N/A'}
                  </Text>
                  <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                    Posted by: {[item.farmer?.firstName, item.farmer?.lastName].filter(Boolean).join(' ') || item.user?.name} · {item.farmer?.contactNumber || item.user?.phone || ''}
                  </Text>
                  <Text style={tw(`text-xs mt-1 ${item.farmer?.postFeeStatus === 'confirmed' ? 'text-green-600' : 'text-amber-600'}`)}>
                    Post fee: {item.farmer?.postFeeStatus === 'confirmed'
                      ? '✓ Payment confirmed (2,000 RWF)'
                      : item.farmer?.postFeeStatus === 'pending'
                        ? '⏳ Payment submitted (2,000 RWF)'
                        : 'No payment yet (farmer must pay 2,000 RWF first)'}
                    {item.farmer?.postFeePhone ? ` · from ${item.farmer.postFeePhone}` : ''}
                    {item.farmer?.postFeeCode ? ` · code ${item.farmer.postFeeCode}` : ''}
                  </Text>
                  <View style={tw('flex-row mt-3 gap-2')}>
                    {paymentConfirmed ? (
                      <TouchableOpacity style={tw('flex-1 bg-green-700 py-2 rounded-lg items-center')}
                        onPress={() => handleApprove(item)}>
                        <Text style={tw('text-white font-medium text-sm')}>Approve & Post to Buyers</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={tw(`flex-1 py-2 rounded-lg items-center ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`)}>
                        <Text style={tw(`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                          Farmer hasn't paid yet
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity style={tw('flex-1 bg-red-500 py-2 rounded-lg items-center')}
                      onPress={() => handleReject(item)}>
                      <Text style={tw('text-white font-medium text-sm')}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
            );
            }}
        />

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

      <Modal visible={rejectModalVisible} transparent animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}>
        <View style={tw('flex-1 bg-black/60 justify-center px-6')}> 
          <View style={tw(`rounded-3xl p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <Text style={tw(`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`)}>Reject Crop</Text>
            <Text style={tw(`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`)}>
              Provide a reason so the owner understands why the crop was removed.
            </Text>
            <TextInput
              style={tw(`mt-4 h-24 rounded-2xl border ${isDarkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'} px-4 py-3`)}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Rejection reason"
              placeholderTextColor={isDarkMode ? '#94a3b8' : '#94a3b8'}
              multiline
            />
            <View style={tw('flex-row justify-end mt-4 gap-2')}>
              <TouchableOpacity style={tw('px-4 py-3 rounded-xl bg-gray-300')} onPress={() => setRejectModalVisible(false)}>
                <Text style={tw('text-gray-700')}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw('px-4 py-3 rounded-xl bg-red-600')} onPress={submitReject}>
                <Text style={tw('text-white')}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!bidCrop} transparent animationType="slide"
        onRequestClose={() => { setBidCrop(null); setBids([]); }}>
        <View style={tw('flex-1 bg-black/50 justify-end')}>
          <View style={tw(`rounded-t-3xl p-6 max-h-3/4 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <Text style={tw(`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
                Transport Bids for {bidCrop?.name}
              </Text>
              <TouchableOpacity onPress={() => { setBidCrop(null); setBids([]); }}>
                <Text style={tw('text-red-500 font-medium')}>Close</Text>
              </TouchableOpacity>
            </View>
            {loadingBids ? (
              <ActivityIndicator size="large" color="#16a34a" />
            ) : bids.length === 0 ? (
              <Text style={tw(`text-center py-10 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                No bids yet. Transporters will submit prices here.
              </Text>
            ) : (
              bids.map(b => (
                <View key={b._id} style={tw(`p-4 mb-3 rounded-2xl ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50 border border-gray-200'}`)}>
                  <View style={tw('flex-row justify-between items-center')}>
                    <View>
                      <Text style={tw(`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
                        {b.transporter?.name || 'Unknown Transporter'}
                      </Text>
                      <Text style={tw(`text-lg font-bold text-green-600 mt-1`)}>
                        {formatCurrency(b.price)}
                      </Text>
                      <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>
                        {b.transporter?.phone || ''} · {b.transporter?.email || ''}
                      </Text>
                      {b.transporter?.phone && (
                        <ContactButtons
                          phone={b.transporter.phone}
                          name={b.transporter.name}
                          smsBody={`Transport bid for ${bidCrop?.name || 'crop'} - coordinate with buyer`}
                          compact
                          isDarkMode={isDarkMode}
                        />
                      )}
                    </View>
                    {b.status === 'pending' && (
                      <TouchableOpacity style={tw('bg-green-700 px-4 py-2 rounded-lg')}
                        onPress={() => acceptBid(b)}>
                        <Text style={tw('text-white font-medium')}>Accept</Text>
                      </TouchableOpacity>
                    )}
                    {b.status !== 'pending' && (
                      <View style={tw(`px-3 py-1 rounded-full ${b.status === 'accepted' ? 'bg-green-100' : 'bg-red-100'}`)}>
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

const NeedsTransporterView = ({ onOpenBids, isDarkMode }) => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await adminAPI.getCrops({ status: 'approved', limit: 50 });
        const needsTransport = (res.data.crops || []).filter(c => !c.transportPrice || c.transportPrice === 0);
        setCrops(needsTransport);
      } catch { } finally { setLoading(false); }
    };
    fetch();
  }, []));

  if (loading) return <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 40 }} />;

  return (
    <FlatList data={crops} keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 16 }}
      ListEmptyComponent={
        <View style={tw('flex-1 justify-center items-center pt-20')}>
          <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>All crops have transporters assigned</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}
          onPress={() => onOpenBids(item)}>
          <View style={tw('flex-row items-center')}>
            <View style={tw('flex-1')}>
              <Text style={tw(`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{item.name}</Text>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                {item.quantity} {item.quantityUnit} · {formatCurrency(item.price)}/{item.quantityUnit}
              </Text>
              <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                {item.location?.district || 'N/A'} · {item.transportBids?.length || 0} bid(s)
              </Text>
            </View>
            <View style={tw('bg-amber-500 px-3 py-1.5 rounded-lg')}>
              <Text style={tw('text-white text-xs font-medium')}>View Bids</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
};

export default AdminPendingCrops;