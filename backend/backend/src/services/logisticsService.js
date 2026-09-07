const Delivery = require('../models/Delivery');
const Crop = require('../models/Crop');
const { v4: uuidv4 } = require('uuid');

const findLoadShareMatches = async (cropId, farmerLocation) => {
  const nearbyCrops = await Crop.find({
    _id: { $ne: cropId },
    status: 'available',
    'location.district': farmerLocation.district,
    estimatedHarvestDate: {
      $gte: new Date(),
      $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  }).populate('farmer');

  return nearbyCrops;
};

const createGroupedDelivery = async (deliveries, transporterId) => {
  const groupId = uuidv4();

  const updatedDeliveries = await Promise.all(
    deliveries.map(async (deliveryId) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) return null;

      delivery.loadShare.isGrouped = true;
      delivery.loadShare.groupId = groupId;
      delivery.transporter = transporterId;
      delivery.status = 'assigned';
      await delivery.save();

      return delivery;
    })
  );

  return { groupId, deliveries: updatedDeliveries.filter(Boolean) };
};

const calculateDeliveryCost = (distanceKm, totalWeightKg) => {
  const baseRate = 100;
  const perKmRate = 50;
  const perKgRate = 10;

  const cost = baseRate + (distanceKm * perKmRate) + (totalWeightKg * perKgRate);
  return Math.round(cost);
};

module.exports = {
  findLoadShareMatches,
  createGroupedDelivery,
  calculateDeliveryCost,
};
