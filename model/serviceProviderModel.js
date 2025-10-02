import mongoose from "mongoose";

const serviceProviderSchema = new mongoose.Schema({
  name: { type: String, required: true},
  gender: { type: String, enum: ["Male", "Female", "Other"], default: "Other" },
  phone: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
 password:{ type:String, required:true,},
verifyOtp:{ type:String, default:'',},
verifyOtpExpireAt:{ type:Number, default:0,},

  previousProjects: [{
    title: { type: String },
    description: { type: String },
    imageUrl: { type: String }
  }],

 
 
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }]

}, { timestamps: true });

const ServiceProvider = mongoose.model("ServiceProvider", serviceProviderSchema);
export default ServiceProvider;
