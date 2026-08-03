import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image, Modal, Dimensions } from 'react-native';
import { tw } from '../../utils/tw';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { auctionAPI } from '../../services/api';
import { formatCurrency, formatDateTime, getStatusColor, getImageUrl } from '../../utils/formatters';
import BackButton from '../../components/BackButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AuctionDetail = ({ route, navigation }) => {
  const { auctionId, cropId } = route.params || {};
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const { user } = useAuth();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    fetchAuction();
  }, []);

  const fetchAuction = async () => {
    try {
      if (auctionId) {
        const response = await auctionAPI.getById(auctionId);
        setAuction(response.data.auction);
      } else if (cropId) {
        const response = await auctionAPI.getActive();
        const found = response.data.auctions?.find(a => a.crop?._id === cropId || a.crop === cropId);
        if (found) {
          const detail = await auctionAPI.getById(found._id);
          setAuction(detail.data.auction);
        } else {
          setAuction(null);
          Alert.alert('No Auction', 'No active auction found for this crop');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load auction');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <ActivityIndicator size="large" color="#16a34a" />
    </View>;
  }

  if (!auction) {
    return <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>Auction not found</Text>
    </View>;
  }

  const statusColor = getStatusColor(auction.status);

  return (
    <ScrollView style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={tw('text-white text-2xl font-bold mt-4')}>{auction.crop?.name || 'Auction'}</Text>
        <Text style={tw('text-orange-200 text-sm mt-1')}>Pre-Harvest Auction</Text>
      </View>

      <View style={tw(`mx-4 -mt-6 p-5 rounded-2xl shadow-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <View style={tw('flex-row justify-between items-start')}>
          <View style={tw('flex-1')}>
            <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Current Highest Bid</Text>
            <Text style={tw(`text-3xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
              {formatCurrency(auction.currentHighestBid)}
            </Text>
          </View>
          <View style={{ backgroundColor: statusColor + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
            <Text style={{ color: statusColor, fontSize: 13, fontWeight: '600' }}>{auction.status}</Text>
          </View>
        </View>

        <View style={tw(`flex-row justify-between mt-4 pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`)}>
          <View>
            <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>Starting Price</Text>
            <Text style={tw(`text-sm font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
              {formatCurrency(auction.startingPrice)}
            </Text>
          </View>
          {auction.reservePrice && (
            <View>
              <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>Reserve Price</Text>
              <Text style={tw(`text-sm font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
                {formatCurrency(auction.reservePrice)}
              </Text>
            </View>
          )}
          <View>
            <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>Ends</Text>
            <Text style={tw(`text-sm font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
              {formatDateTime(auction.endDate)}
            </Text>
          </View>
        </View>
      </View>

      <View style={tw(`mx-4 mt-4 p-5 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <Text style={tw(`font-semibold text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Crop Details</Text>
        {auction.crop?.photos?.length > 0 && (
          <View style={tw('flex-row flex-wrap gap-2 mb-3')}>
            {auction.crop.photos.map((url, i) => (
              <TouchableOpacity key={i} onPress={() => setPreviewImage(url)} activeOpacity={0.8}>
                <Image source={{ uri: getImageUrl(url) }} style={tw('w-20 h-20 rounded-xl')} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        {auction.crop && (
          <>
            <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>
              {auction.crop.quantity} {auction.crop.quantityUnit} - {auction.crop.category}
            </Text>
            {auction.crop.description && (
              <Text style={tw(`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                {auction.crop.description}
              </Text>
            )}
          </>
        )}
      </View>

      {auction.status === 'active' && user?.role === 'buyer' && auction.crop && (
        <View style={tw(`mx-4 mt-4 p-5 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
          <Text style={tw(`font-semibold text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            Price: {formatCurrency(auction.startingPrice)}
          </Text>
          <Text style={tw(`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            Pay this amount to purchase {auction.crop.quantity} {auction.crop.quantityUnit} of {auction.crop.name}
          </Text>
          <TouchableOpacity style={tw('py-3 rounded-xl items-center bg-green-800')}
            onPress={() => navigation.navigate('Order', { crop: auction.crop })}>
            <Text style={tw('text-white font-semibold text-base')}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      )}


      <Modal visible={!!previewImage} transparent animationType="fade"
        onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={tw('flex-1 bg-black/90 justify-center items-center')}
          activeOpacity={1} onPress={() => setPreviewImage(null)}>
          {previewImage && (
            <Image source={{ uri: getImageUrl(previewImage) }}
              style={{ width: SCREEN_WIDTH - 40, height: SCREEN_WIDTH - 40 }}
              resizeMode="contain" onError={() => setPreviewImage(null)} />
          )}
          <TouchableOpacity style={tw('absolute top-12 right-6 w-10 h-10 bg-white/20 rounded-full items-center justify-center')}
            onPress={() => setPreviewImage(null)}>
            <Text style={tw('text-white text-xl')}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

export default AuctionDetail;
