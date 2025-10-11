import Booking from "../model/bookingModel.js";
import Service from "../model/serviceModel.js";
import ServiceProvider from "../model/serviceProviderModel.js";
import User from "../model/userModel.js"

export const serviceAvailability = async (req, res) => {
  try {
    const { minp, maxp, date, serviceId } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        msg: "Please provide a valid date.",
      });
    }
    

    if (!minp) {
      return res.status(400).json({
        success: false,
        msg: "Please provide a lower count.",
      });
    }
    if (!maxp) {
      return res.status(400).json({
        success: false,
        msg: "Please provide an upper count.",
      });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        msg: "Service not found.",
      });
    }

    // ✅ Check min and max people constraints
    if (service.minPeople < minp) {
      return res.status(400).json({
        success: false,
        msg: `This service requires at least ${service.minPeople} people.`,
      });
    }

    if (service.maxPeople > maxp) {
      return res.status(400).json({
        success: false,
        msg: `This service allows up to ${service.maxPeople} people.`,
      });
    }

    // ✅ Convert given date to proper Date object (ignoring time)
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    // ✅ Check if date is already booked
    const isBooked = service.currentBookingDates.some(
      (bookedDate) => new Date(bookedDate).toDateString() === selectedDate.toDateString()
    );



    if (isBooked) {
      return res.status(400).json({
        success: false,
        msg: "This service is already booked for the selected date.",
      });
    }

    // ✅ If everything passes
    return res.status(200).json({
      success: true,
      msg: "Service is available for booking.",
      service,
    });
  } 
  
  catch (err) {
    console.error("Error in serviceAvailability:", err);
    return res.status(500).json({
      success: false,
      msg: "Server Error",
    });
  }
};




export const bookService = async (req, res) => {
  try {
    const {
      minp,
      maxp,
      date,
      totalAmount,
      venue,
      specialRequests,
      serviceId,
      provider,
    } = req.body;

    const user=req.user._id;

    if (!totalAmount) {
      return res.status(400).json({
        success: false,
        msg: "Total amount is required.",
      });
    }

    if (!date || !serviceId || !provider || !user) {
      return res.status(400).json({
        success: false,
        msg: "Missing required booking details.",
      });
    }

    // 1️⃣ Create new booking
    const newBooking = await Booking.create({
      user,
      service: serviceId,
      provider,
      eventDate: date,
      venue,
      avgGuestsCount: Math.ceil((minp + maxp) / 2),
      totalAmount,
      specialRequests,
      status: "Pending Provider Confirmation",
      paymentStatus: "Pending",
    });

    // 2️⃣ Add booking to Service Provider's newBookings array
    const sp = await ServiceProvider.findById(provider);
    if (!sp) {
      return res.status(404).json({
        success: false,
        msg: "Service Provider not found.",
      });
    }
    sp.newBookings.push(newBooking._id);
    await sp.save();

    const u = await User.findById(user);
    if (!u) {
      return res.status(404).json({
        success: false,
        msg: "User not found.",
      });
    }
    u.previousBookings.push(newBooking._id);
    await u.save();

    return res.status(201).json({
      success: true,
      msg: "Booking request sent to provider for confirmation.",
      booking: newBooking,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

export const providerResponse = async (req, res) => {

  try {
    const { bookingId, action } = req.body; // action: "accept" or "reject"

    if (!bookingId || !action) {
      return res.status(400).json({
        success: false,
        msg: "Booking ID and action are required.",
      });
    }
  
    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        msg: "Booking not found.",
      });
    }

    // Find the provider to check ownership
    const provider = await ServiceProvider.findById(booking.provider);
    if (!provider) {
      return res.status(404).json({
        success: false,
        msg: "Service provider not found.",
      });
    }

    // Check action
    if (action === "accept") {
      booking.status = "Confirmed";
      await booking.save();

      // ✅ Optional: Add date to Service.currentBookingDates
      const service = await Service.findById(booking.service);
      if (service) {
        const eventDate = new Date(booking.eventDate);
        eventDate.setHours(0, 0, 0, 0);

        const isAlreadyBooked = service.currentBookingDates.some(
          (d) => new Date(d).toDateString() === eventDate.toDateString()
        );
        if (!isAlreadyBooked) {
          service.currentBookingDates.push(eventDate);
          await service.save();
        }
      }

      return res.status(200).json({
        success: true,
        msg: "Booking accepted. User can proceed to payment.",
        booking,
      });
    } else if (action === "reject") {
      booking.status = "Cancelled";
      await booking.save();

      return res.status(200).json({
        success: true,
        msg: "Booking rejected by provider.",
        booking,
      });
    } else {
      return res.status(400).json({
        success: false,
        msg: "Invalid action. Must be 'accept' or 'reject'.",
      });
    }
  } catch (err) {
    console.error("Error in providerAccept:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

// POST /api/payment/demo
export const demoPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Normally you would call Razorpay here.
    // For demo, we just update booking directly:

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }

    booking.paymentStatus = "Paid";
    booking.status = "Completed";
    await booking.save();

    return res.json({
      success: true,
      msg: "Demo payment successful",
      booking,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

