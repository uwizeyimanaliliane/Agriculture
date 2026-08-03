const ADMIN_CONTACT = {
  phone: process.env.ADMIN_PHONE || '0781793232',
  name: 'Agri-Link Admin',
};

const sanitizeDeliveryForTransporter = (delivery) => {
  const obj = typeof delivery.toObject === 'function' ? delivery.toObject() : { ...delivery };
  delete obj.buyer;
  if (obj.farmer) {
    obj.farmer = { location: obj.farmer.location };
  }
  obj.adminContact = ADMIN_CONTACT;
  return obj;
};

const sanitizeCropForTransporter = (crop) => {
  const obj = typeof crop.toObject === 'function' ? crop.toObject() : { ...crop };
  if (obj.user) {
    obj.user = { location: obj.user.location };
  }
  obj.adminContact = ADMIN_CONTACT;
  return obj;
};

module.exports = { ADMIN_CONTACT, sanitizeDeliveryForTransporter, sanitizeCropForTransporter };
