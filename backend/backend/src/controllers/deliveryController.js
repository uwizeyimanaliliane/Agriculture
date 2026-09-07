const Delivery = require('../models/Delivery');
const Escrow = require('../models/Escrow');
const Crop = require('../models/Crop');
const User = require('../models/User');
const QRCode = require('qrcode');
const { notifyDeliveryUpdate, notifyTransporterPriceQuoted } = require('../services/notificationService');
const Notification = require('../models/Notification');

exports.createDelivery = async (req, res, next) => {
  try {
    const { escrowId, cropId, pickupLocation, deliveryLocation, pickupDate, deliveryNotes, requestedBy } = req.body;

    if (escrowId) {
      const escrow = await Escrow.findById(escrowId).populate('crop');
      if (!escrow) {
        return res.status(404).json({ message: 'Escrow not found' });
      }

      const qrData = JSON.stringify({
        escrowId: escrow._id,
        cropId: escrow.crop._id,
        transactionRef: escrow.transactionRef,
        timestamp: new Date().toISOString(),
      });

      const qrCode = await QRCode.toDataURL(qrData);

      const delivery = await Delivery.create({
        escrow: escrow._id,
        crop: escrow.crop._id,
        farmer: escrow.farmer,
        buyer: escrow.buyer,
        pickupLocation,
        deliveryLocation,
        qrCode,
        qrCodeData: qrData,
        pickupDate,
        deliveryNotes,
      });

      escrow.delivery = delivery._id;
      escrow.status = 'in_transit';
      await escrow.save();

      return res.status(201).json({ delivery });
    }

    const crop = await Crop.findById(cropId);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    const user = await User.findById(req.user._id);
    const role = user?.role || req.user?.role;
    const isFarmer = role === 'farmer';

    const deliveryData = {
      crop: crop._id,
      pickupLocation: pickupLocation || crop.location || {},
      deliveryLocation: deliveryLocation || {},
      pickupDate,
      deliveryNotes,
      requestedBy: requestedBy || role,
      orderedBy: req.user._id,
      status: 'pending',
    };

    if (isFarmer) {
      deliveryData.farmer = req.user._id;
    } else {
      deliveryData.farmer = crop.user;
      deliveryData.buyer = req.user._id;
    }

    const delivery = await Delivery.create(deliveryData);

    const createRecipients = [delivery.farmer];
    if (delivery.buyer) createRecipients.push(delivery.buyer);
    for (const userId of createRecipients) {
      if (userId) {
        await Notification.create({
          user: userId,
          type: 'delivery_update',
          title: 'Delivery Request Created',
          message: `A delivery request has been created for ${crop.name || 'your crop'}`,
          data: { deliveryId: delivery._id, status: 'pending' },
        });
      }
    }

    res.status(201).json({ delivery });
  } catch (error) {
    next(error);
  }
};

exports.assignTransporter = async (req, res, next) => {
  try {
    const { deliveryId } = req.params;
    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    delivery.transporter = req.user._id;
    delivery.status = 'assigned';
    await delivery.save();

    if (delivery.buyer) await notifyDeliveryUpdate(delivery.buyer, delivery._id, 'assigned');
    if (delivery.farmer) await notifyDeliveryUpdate(delivery.farmer, delivery._id, 'assigned');

    res.json({ delivery });
  } catch (error) {
    next(error);
  }
};

exports.updateDeliveryStatus = async (req, res, next) => {
  try {
    const { status, coordinates } = req.body;
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    delivery.status = status;

    if (coordinates) {
      delivery.tracking.currentLocation = {
        type: 'Point',
        coordinates,
      };
      delivery.tracking.lastUpdated = new Date();
    }

    if (status === 'delivered') {
      delivery.deliveryDate = new Date();
    }

    await delivery.save();

    if (delivery.buyer) await notifyDeliveryUpdate(delivery.buyer, delivery._id, status);
    if (delivery.farmer) await notifyDeliveryUpdate(delivery.farmer, delivery._id, status);
    if (delivery.transporter) await notifyDeliveryUpdate(delivery.transporter, delivery._id, status);

    res.json({ delivery });
  } catch (error) {
    next(error);
  }
};

exports.confirmDeliveryByQR = async (req, res, next) => {
  try {
    const { deliveryId } = req.params;
    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    delivery.qrScannedByBuyer = true;
    delivery.status = 'confirmed';
    await delivery.save();

    const escrow = await Escrow.findById(delivery.escrow);
    if (escrow) {
      escrow.status = 'delivered';
      await escrow.save();
    }

    if (delivery.farmer) await notifyDeliveryUpdate(delivery.farmer, delivery._id, 'confirmed');
    if (delivery.buyer) await notifyDeliveryUpdate(delivery.buyer, delivery._id, 'confirmed');
    if (delivery.transporter) await notifyDeliveryUpdate(delivery.transporter, delivery._id, 'confirmed');

    res.json({ delivery, message: 'Delivery confirmed. Awaiting admin payment release.' });
  } catch (error) {
    next(error);
  }
};

exports.setTransporterPrice = async (req, res, next) => {
  try {
    const { price } = req.body;
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    delivery.transporter = req.user._id;
    delivery.transporterPrice = price;
    delivery.priceStatus = 'pending';
    await delivery.save();

    await notifyTransporterPriceQuoted(delivery, req.user, price);

    res.json({ delivery });
  } catch (error) {
    next(error);
  }
};

exports.acceptTransporterPrice = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
    if (!delivery.transporter) return res.status(400).json({ message: 'No transporter has quoted yet' });
    if (!delivery.transporterPrice) return res.status(400).json({ message: 'No price has been quoted yet' });

    const LOGISTICS_COMMISSION = 0.10;
    const logisticsFee = Math.round(delivery.transporterPrice * LOGISTICS_COMMISSION);

    delivery.priceStatus = 'accepted';
    delivery.status = 'assigned';
    await delivery.save();

    if (delivery.escrow) {
      await Escrow.findByIdAndUpdate(delivery.escrow, {
        logisticsFee,
        transporter: delivery.transporter,
      });
    }

    await Notification.create({
      user: delivery.transporter,
      type: 'price_accepted',
      title: 'Price Accepted',
      message: `Your delivery price of ${delivery.transporterPrice} RWF has been accepted. Agri-Link commission: ${logisticsFee} RWF (10%). Proceed with pickup.`,
      data: { deliveryId: delivery._id },
    });

    const notifyUser = delivery.orderedBy || delivery.farmer;
    if (notifyUser) {
      await Notification.create({
        user: notifyUser,
        type: 'delivery_assigned',
        title: 'Transporter Assigned',
        message: `Delivery has been assigned to a transporter`,
        data: { deliveryId: delivery._id },
      });
    }

    res.json({ delivery });
  } catch (error) {
    next(error);
  }
};

exports.getDeliveryById = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('farmer', 'name phone')
      .populate('buyer', 'name phone')
      .populate('transporter', 'name phone')
      .populate('crop', 'name quantity quantityUnit');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    res.json({ delivery });
  } catch (error) {
    next(error);
  }
};

// Get driving route (overview polyline decoded) from origin to pickup to delivery
exports.getDeliveryRoute = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    const origin = req.query.origin; // expected 'lat,lng'
    if (!origin) return res.status(400).json({ message: 'Missing origin query param (lat,lng)' });

    const pickup = delivery.pickupLocation?.coordinates;
    const dropoff = delivery.deliveryLocation?.coordinates;
    if (!pickup || !dropoff) return res.status(400).json({ message: 'Delivery missing pickup or delivery coordinates' });

    // coordinates stored as [lng, lat]
    const pickupLatLng = `${pickup[1]},${pickup[0]}`;
    const dropoffLatLng = `${dropoff[1]},${dropoff[0]}`;

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'dummy') return res.status(500).json({ message: 'Google Maps API key not configured' });

    const waypoints = `via:${pickupLatLng}`;
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dropoffLatLng)}&waypoints=${encodeURIComponent(waypoints)}&key=${apiKey}`;

    const https = require('https');
    https.get(directionsUrl, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status !== 'OK' || !json.routes || !json.routes.length) {
            return res.status(400).json({ message: 'No route found', details: json.status });
          }
          const encoded = json.routes[0].overview_polyline?.points;
          const coords = decodePolyline(encoded);
          res.json({ coords, legs: json.routes[0].legs });
        } catch (err) {
          next(err);
        }
      });
    }).on('error', (err) => {
      next(err);
    });
  } catch (error) {
    next(error);
  }
};

// simple polyline decoder (returns array of {latitude, longitude})
function decodePolyline(encoded) {
  if (!encoded) return [];
  let index = 0, lat = 0, lng = 0, coordinates = [];
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coordinates;
}

exports.getAvailableDeliveries = async (req, res, next) => {
  try {
    const deliveries = await Delivery.find({
      status: 'pending',
      transporter: null,
      transporterPrice: { $exists: false },
    })
      .populate('farmer', 'name phone location')
      .populate('buyer', 'name phone')
      .populate('crop', 'name quantity quantityUnit')
      .sort({ createdAt: 1 });

    res.json({ deliveries });
  } catch (error) {
    next(error);
  }
};

exports.getMyDeliveries = async (req, res, next) => {
  try {
    const deliveries = await Delivery.find({
      $or: [
        { farmer: req.user._id },
        { buyer: req.user._id },
        { transporter: req.user._id },
      ],
    })
      .populate('farmer', 'name phone')
      .populate('buyer', 'name phone')
      .populate('transporter', 'name phone')
      .populate('crop', 'name quantity quantityUnit')
      .sort({ createdAt: -1 });

    res.json({ deliveries });
  } catch (error) {
    next(error);
  }
};
