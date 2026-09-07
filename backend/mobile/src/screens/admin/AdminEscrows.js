import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { adminAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { alert, confirmAlert } from '../../utils/platform';
import ContactButtons from '../../components/ContactButtons';

const AdminEscrows = () => {
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const { isDarkMode } = useTheme();

  useEffect(() => { fetchEscrows(); }, [filter]);

  const fetchEscrows = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      const response = await adminAPI.getEscrows(params);
      setEscrows(response.data.escrows);
    } catch (error) {
      console.error('Failed to load escrows');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = (escrow) => {
    confirmAlert('Release Payment', `Release ${formatCurrency(escrow.amount)} to farmer?`, async () => {
      try {
        await adminAPI.releaseEscrow(escrow._id);
        fetchEscrows();
        alert('Success', 'Payment released to farmer');
      } catch (error) {
        alert('Error', error.response?.data?.message || 'Failed to release payment');
      }
    }, null, 'Release', 'Cancel');
  };

  const statusColor = (s) => {
    switch (s) {
      case 'pending_deposit': return 'bg-yellow-100 text-yellow-800';
      case 'locked': return 'bg-blue-100 text-blue-700';
      case 'in_transit': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'released': return 'bg-teal-100 text-teal-800';
      case 'disputed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const renderEscrow = ({ item }) => (
    <View style={tw(`p-4 mb-2 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
      <View style={tw('flex-row justify-between items-start')}>
        <View style={tw('flex-1')}>
          <Text style={tw(`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            {item.crop?.name || 'Crop'} - {formatCurrency(item.amount)}
          </Text>
          <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            Buyer: {item.buyer?.name || 'N/A'} | Farmer: {item.farmer?.name || 'N/A'}
          </Text>
          {item.transporter?.name && (
            <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              Transporter: {item.transporter.name} {item.transporter.phone ? `(${item.transporter.phone})` : ''}
            </Text>
          )}
          {item.transporter?.phone && (
            <ContactButtons
              phone={item.transporter.phone}
              name={item.transporter.name}
              smsBody={`Delivery for ${item.crop?.name || 'order'} - buyer ${item.buyer?.name || 'N/A'}`}
              compact
              isDarkMode={isDarkMode}
            />
          )}
          <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={tw(`px-2 py-1 rounded-full ${statusColor(item.status)}`)}>
          <Text style={tw('text-xs font-medium')}>{item.status.replace(/_/g, ' ')}</Text>
        </View>
      </View>
      {item.status === 'delivered' && (
        <TouchableOpacity style={tw('mt-3 bg-green-800 py-2 rounded-xl items-center')}
          onPress={() => handleRelease(item)}>
          <Text style={tw('text-white font-medium text-sm')}>Release Payment to Farmer</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-5 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-xl font-bold')}>Escrow Payments</Text>
      </View>

      <View style={tw('flex-row px-4 py-3 gap-2')}>
        {['', 'pending_deposit', 'locked', 'delivered', 'released', 'disputed'].map((s) => (
          <TouchableOpacity key={s}
            style={tw(`px-3 py-1.5 rounded-full ${filter === s ? 'bg-green-800' : isDarkMode ? 'bg-slate-700' : 'bg-green-100'}`)}
            onPress={() => setFilter(filter === s ? '' : s)}>
            <Text style={tw(`text-xs ${filter === s ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-green-800'}`)}>
              {s ? s.replace(/_/g, ' ') : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={tw('flex-1 justify-center items-center')}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList data={escrows} renderItem={renderEscrow} keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }} />
      )}
    </View>
  );
};

export default AdminEscrows;
