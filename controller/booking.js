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

    // ✅ Check min and max people constraints (corrected comparison)
    if (minp < service.minPeople) {
      return res.status(400).json({
        success: false,
        msg: `This service requires at least ${service.minPeople} people.`,
      });
    }

    if (maxp > service.maxPeople) {
      return res.status(400).json({
        success: false,
        msg: `This service allows up to ${service.maxPeople} people.`,
      });
    }

    // ✅ Convert given date to proper Date object (ignore time)
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    // ✅ Calculate days difference between current date and selected date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffInMs = selectedDate - today;
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    // ✅ Check if selected date is at least minDaysPrior days ahead
    if (diffInDays < service.mindaysprior) {
      return res.status(400).json({
        success: false,
        msg: `This service must be booked at least ${service.mindaysprior} days in advance.`,
      });
    }

    // ✅ Check if date is already booked
    const isBooked = service.currentBookingDates.some(
      (bookedDate) =>
        new Date(bookedDate).toDateString() === selectedDate.toDateString()
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
  } catch (err) {
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
      return res.status(404).json({ success: false, msg: "Booking not found." });
    }

    // Find provider
    const provider = await ServiceProvider.findById(booking.provider);
    if (!provider) {
      return res.status(404).json({ success: false, msg: "Service provider not found." });
    }

    if (action === "accept") {
      booking.status = "Confirmed";
      await booking.save();

      // Remove from newBookings
      provider.newBookings = provider.newBookings.filter(
        (id) => id.toString() !== booking._id.toString()
      );

      // Add to upcomingBookings if not already there
      if (!provider.upComingBookings.includes(booking._id)) {
        provider.upComingBookings.push(booking._id);
      }

      // Save provider
      await provider.save();

      // ✅ Update service booked dates
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
        msg: "Booking accepted and moved to upcoming bookings.",
        booking,
      });

    } else if (action === "reject") {
      booking.status = "Cancelled";
      await booking.save();

      // Remove from newBookings
      provider.newBookings = provider.newBookings.filter(
        (id) => id.toString() !== booking._id.toString()
      );
      await provider.save();

      return res.status(200).json({
        success: true,
        msg: "Booking rejected and removed from new bookings.",
        booking,
      });

    } else {
      return res.status(400).json({
        success: false,
        msg: "Invalid action. Must be 'accept' or 'reject'.",
      });
    }
  } catch (err) {
    console.error("Error in providerResponse:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};



export const demoPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, msg: "Booking not found" });
    }

    // ✅ Mark payment as done and status as Confirmed
    booking.paymentStatus = "Paid";
    booking.status = "Confirmed";
    await booking.save();

    // ✅ Move booking from newBookings → upComingBookings in provider
    const provider = await ServiceProvider.findById(booking.provider);
    if (provider) {
      // Remove from newBookings
      provider.newBookings = provider.newBookings.filter(
        (id) => id.toString() !== booking._id.toString()
      );

      // Add to upComingBookings if not already present
      if (!provider.upComingBookings.includes(booking._id)) {
        provider.upComingBookings.push(booking._id);
      }

      await provider.save();
    }

    return res.status(200).json({
      success: true,
      msg: "Payment successful. Booking moved to upcoming bookings.",
      booking,
    });
  } catch (err) {
    console.error("Error in demoPayment:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

export const autoMoveCompletedBookings = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all confirmed bookings whose event date is in the past
    const pastBookings = await Booking.find({
      eventDate: { $lt: today },
      status: "Confirmed",
    });

    for (const booking of pastBookings) {
      booking.status = "Completed";
      await booking.save();

      // Move from upComingBookings → completedBookings in provider
      const provider = await ServiceProvider.findById(booking.provider);
      if (provider) {
        provider.upComingBookings = provider.upComingBookings.filter(
          (id) => id.toString() !== booking._id.toString()
        );

        if (!provider.completedBookings.includes(booking._id)) {
          provider.completedBookings.push(booking._id);
        }

        await provider.save();
      }
    }

    console.log("✅ Auto update: moved completed bookings successfully.");
  } catch (err) {
    console.error("❌ Error in autoMoveCompletedBookings:", err);
  }
};

export default {
  serviceAvailability,autoMoveCompletedBookings,providerResponse,demoPayment,bookService
}