import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { farmerAPI } from '../../services/api';
import { getStatusColor } from '../../utils/formatters';
import BackButton from '../../components/BackButton';

const VerificationScreen = ({ navigation }) => {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { isDarkMode } = useTheme();

  const fetchStatus = useCallback(async () => {
    try {
      const response = await farmerAPI.getVerificationStatus();
      setVerification(response.data.farmer);
    } catch (error) {
      console.error('Failed to load verification status');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchStatus();
  }, [fetchStatus]));

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    try {
      await farmerAPI.submitVerification();
      Alert.alert('Success', 'Verification request submitted. An agent will contact you.');
      fetchStatus();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit verification request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const steps = [
    { key: 'cooperativeApproved', label: 'Cooperative Approval' },
    { key: 'farmInspected', label: 'Farm Inspection' },
    { key: 'photosSubmitted', label: '360° Crop Photography' },
    { key: 'landVerified', label: 'Land Verification' },
  ];

  const statusColor = getStatusColor(verification?.verificationStatus || 'pending');

  return (
    <ScrollView style={tw(`flex-1 p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={tw(`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>Verification</Text>
      <Text style={tw(`mb-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
        Complete verification to access the marketplace
      </Text>

      <View style={tw(`p-5 rounded-2xl mb-6 shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <View style={tw('flex-row justify-between items-center mb-4')}>
          <Text style={tw(`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Status</Text>
          <View style={{ backgroundColor: statusColor + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
            <Text style={{ color: statusColor, fontSize: 13, fontWeight: '600' }}>
              {verification?.verificationStatus?.replace('_', ' ') || 'Pending'}
            </Text>
          </View>
        </View>

        {verification?.verifiedBadge && (
          <View style={tw('bg-green-100 p-3 rounded-xl mb-4')}>
            <Text style={tw('text-green-800 font-semibold')}>✓ Verified Farmer</Text>
            <Text style={tw('text-green-600 text-sm mt-1')}>
              Trust Score: {verification.trustScore}/100
            </Text>
          </View>
        )}

        <Text style={tw(`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Verification Steps</Text>
        {steps.map((step, index) => {
          const done = verification?.verificationDetails?.[step.key];
          return (
            <View key={step.key} style={tw('flex-row items-center mb-3')}>
              <View style={tw(`w-8 h-8 rounded-full items-center justify-center ${done ? 'bg-green-500' : isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`)}>
                <Text style={tw(`text-sm font-bold ${done ? 'text-white' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                  {done ? '✓' : index + 1}
                </Text>
              </View>
              <Text style={tw(`ml-3 ${done ? 'text-green-600 font-medium' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      {verification?.verificationStatus === 'pending' && (
        <TouchableOpacity style={tw(`py-3 rounded-xl items-center ${submitting ? 'bg-green-700' : 'bg-green-800'}`)}
          onPress={handleSubmitRequest} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw('text-white font-semibold text-base')}>Submit Verification Request</Text>
          )}
        </TouchableOpacity>
      )}

      {verification?.inspectionReports?.length > 0 && (
        <View style={tw(`mt-6 p-5 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
          <Text style={tw(`font-semibold mb-3 text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Inspection Reports</Text>
          {verification.inspectionReports.map((report, i) => (
            <View key={i} style={tw(`mb-3 pb-3 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`)}>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>{report.findings}</Text>
              <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                Status: {report.status} - {new Date(report.reportDate).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default VerificationScreen;
