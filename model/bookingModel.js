import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    provider:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"ServiceProvider",
      required:true
    },
    eventDate: {
      type: Date,
      required: true,
    },
     
    avgGuestsCount: {
      type: Number,
      default: 0,
    },

    venue: {
      type: String,
      required: true,   
    },

    specialRequests: {
      type: String,
      trim: true,
    },
    status:{
      type:String,
      default:""
    },

    totalAmount: {
      type: Number,
      required: true,
    },
    

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Refunded"],
      default: "Pending",
    },

   
    bookedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
