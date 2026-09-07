import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { farmerAPI, cropAPI } from '../../services/api';

const AddCropGateway = ({ navigation }) => {
  const { isDarkMode } = useTheme();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // One cycle at a time: the farmer may only add a NEW product when there
        // is no product still under review (payment/form submitted but not yet
        // approved or rejected by the admin).
        const [verifRes, cropsRes] = await Promise.all([
          farmerAPI.getVerificationStatus(),
          cropAPI.getMine(),
        ]);
        if (!mounted) return;

        const verified = verifRes.data?.farmer?.verificationStatus === 'verified';
        if (!verified) {
          navigation.replace('Verification', { fromAddCrop: true });
          return;
        }

        const inFlight = (cropsRes.data?.crops || []).find(c => c.status === 'pending_admin');
        if (inFlight) {
          // The previous product is still under review: go to its payment /
          // status screen so the farmer finishes that cycle first.
          navigation.replace('CropPayment', { cropId: inFlight._id, cropName: inFlight.name });
        } else {
          navigation.replace('AddCrop');
        }
      } catch (error) {
        if (mounted) {
          navigation.replace('Verification', { fromAddCrop: true });
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigation]);

  return (
    <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <ActivityIndicator size="large" color="#16a34a" />
    </View>
  );
};

export default AddCropGateway;