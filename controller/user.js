import User from "../model/userModel.js";
import Booking from "../model/bookingModel.js";

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    await user.deleteOne();
    return res.status(200).json({ success: true, msg: "User account deleted successfully" });
  } catch (err) {
    console.error("Delete User Error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

// --- Get Favorites ---
export const getUserFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    return res.status(200).json({
      success: true,
      favorites: user.favorites || [],
    });
  } catch (err) {
    console.error("Get Favorites Error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

// --- Add Favorite ---
export const addFavorite = async (req, res) => {
  try {
    const { serviceId } = req.body;

    if (!serviceId) {
      return res.status(400).json({ success: false, msg: "Service ID is required" });
    }

    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { favorites: serviceId } }, // no duplicates
      { new: true }
    );

    const updatedUser = await User.findById(req.user._id).populate("favorites");
    return res.status(201).json({ success: true, favorites: updatedUser.favorites });
  } catch (err) {
    console.error("Add Favorite Error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

// --- Remove Favorite ---
export const removeFavorite = async (req, res) => {
  try {
    const { serviceId } = req.body;

    if (!serviceId) {
      return res.status(400).json({ success: false, msg: "Service ID is required" });
    }

    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { favorites: serviceId } },
      { new: true }
    );

    const updatedUser = await User.findById(req.user._id).populate("favorites");
    return res.status(200).json({ success: true, favorites: updatedUser.favorites });
  } catch (err) {
    console.error("Remove Favorite Error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};


export const getUserDetails=async(req,res)=>{
    try{
       const id=req.user._id;

       const userDetails=await User.findById(id);

       if(!userDetails) {
        return res.status(200).json({success:false,msg:"No such User"}); 
       }

       return res.status(200).send(userDetails);
    }
    catch(err){
        return res.json({success:false,msg:"Failed"});
    }
}


export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.fullName = req.body.fullName || user.fullName;
      user.username = req.body.username || user.username;
      user.phone = req.body.phone || user.phone;
      user.location = req.body.location || user.location;
      const updatedUser = await user.save();
      res.status(200).json({
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        username: updatedUser.username,
        phone: updatedUser.phone,
        location: updatedUser.location,
      });
    } else {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user._id; // ✅ assuming user is authenticated

    if (!userId) {
      return res.status(401).json({
        success: false,
        msg: "Unauthorized access. Please log in.",
      });
    }

    // 🔹 Fetch all bookings for the user
    const bookings = await Booking.find({ user: userId })
      .populate({
        path: "service",
        select: "name description priceInfo images categories providers",
        populate: [
          { path: "categories", select: "name" },
          { path: "providers", select: "name contact email" },
        ],
      })
      .sort({ createdAt: -1 }); // newest first

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({
        success: false,
        msg: "No bookings found for this user.",
      });
    }

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    console.error("Error in getUserBookings:", err);
    return res.status(500).json({
      success: false,
      msg: "Server error while fetching user bookings.",
    });
  }
};

export default {
    getUserDetails,removeFavorite,addFavorite,getUserFavorites,deleteUser,updateProfile,getUserBookings
}