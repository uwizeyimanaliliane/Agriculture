import { farmerAPI } from '../services/api';
import { alert } from './platform';

export const isEligibleToPost = (farmer) =>
  farmer?.verificationStatus === 'verified'
  && farmer?.postFeeStatus === 'confirmed'
  && farmer?.postFeePaid === true;

export async function requireVerificationForPosting(navigation) {
  try {
    const { data } = await farmerAPI.getVerificationStatus();
    const farmer = data?.farmer;

    if (!farmer || farmer.verificationStatus !== 'verified') {
      alert(
        'Verification Required',
        'You must complete verification and be approved by the admin before posting products. Taking you to the Verification screen.'
      );
      navigation.navigate('Verification');
      return false;
    }

    if (farmer.postFeeStatus !== 'confirmed' || farmer.postFeePaid !== true) {
      alert(
        'Pay Post Fee',
        'You must pay the post fee before posting products. Taking you to the Verification screen to pay.'
      );
      navigation.navigate('Verification');
      return false;
    }

    return true;
  } catch (error) {
    alert(
      'Verification Required',
      'Unable to confirm your verification status. Please complete verification first.'
    );
    navigation.navigate('Verification');
    return false;
  }
}
