import mongoose from 'mongoose';

const BrandSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vehicleType: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleType', required: true },
  models: [{ type: String }]
});

export default mongoose.models.Brand || mongoose.model('Brand', BrandSchema); 