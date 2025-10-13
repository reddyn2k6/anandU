import ServiceProvider from "../model/serviceProviderModel.js";
import Service from "../model/serviceModel.js";
import Category from "../model/categoryModel.js"
import Booking from "../model/bookingModel.js";
import cloudinary from "../config/cloudinary.js";
export const getAllServices=async(req ,res) =>{

    try{
const pid=req.provider._id;


const services=await Service.find({providers:pid});

return res.status(200).json({services});
    }



catch(err){
    return res.status(400).json({success:false,msg:'Failed'});
}

}

export const getnewbookings = async (req, res) => {
  try {
    const providerId = req.provider._id;

    if (!providerId) {
      return res.status(400).json({ success: false, msg: "No providerId found" });
    }

    // ✅ Populate newBookings to get full booking data
    const provider = await ServiceProvider.findById(providerId)
      .populate({
        path: "newBookings", // this field stores booking IDs
        model: "Booking", // explicitly specify model (good practice)
        populate: [
          { path: "user", model: "User" },
          { path: "service", model: "Service" },
        ],
      });

    if (!provider) {
      return res.status(404).json({ success: false, msg: "Provider not found" });
    }

    // ✅ Now provider.newBookings contains full Booking documents (with user & service details)
    return res.status(200).json({
      success: true,
      newBookings: provider.newBookings,
    });

  } catch (err) {
    console.error("Error fetching new bookings:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};


export const getcompletedBookings = async (req, res) => {
  try {
    const providerId = req.provider._id;

    if (!providerId) {
      return res.status(400).json({ success: false, msg: "No providerId found" });
    }

    const provider = await ServiceProvider.findById(providerId)
      .populate({
        path: "completedBookings",
        model: "Booking",
        populate: [
          { path: "user", model: "User" },
          { path: "service", model: "Service" },
        ],
      });

    if (!provider) {
      return res.status(404).json({ success: false, msg: "Provider not found" });
    }

    return res.status(200).json({
      success: true,
      completedBookings: provider.completedBookings,
    });
  } catch (err) {
    console.error("Error fetching completed bookings:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};



export const getupComingBookings = async (req, res) => {
  try {
    const providerId = req.provider._id;

    if (!providerId) {
      return res.status(400).json({ success: false, msg: "No providerId found" });
    }

    const provider = await ServiceProvider.findById(providerId)
      .populate({
        path: "upComingBookings",
        model: "Booking",
        populate: [
          { path: "user", model: "User" },
          { path: "service", model: "Service"},
        ],
      });

    if (!provider) {
      return res.status(404).json({ success: false, msg: "Provider not found" });
    }

    return res.status(200).json({
      success: true,
      upComingBookings: provider.upComingBookings,
    });
  } catch (err) {
    console.error("Error fetching upcoming bookings:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

const uploadImages = async (files) => {
  const uploadPromises = files.map(file => {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "service-images" },
        (error, result) => {
          if (error) return reject(error);
          resolve({ url: result.secure_url, public_id: result.public_id });
        }
      );
      uploadStream.end(file.buffer);
    });
  });
  return await Promise.all(uploadPromises);
};


export const updateService = async (req, res) => {
  try {
    const { serviceId, categoryName, imagesToKeep, imagesToKeepJSON, ...updateData } = req.body;
    
    // Validate serviceId
    if (!serviceId) {
      return res.status(400).json({ success: false, msg: "Service ID is required" });
    }

    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({ success: false, msg: "Service not found" });
    }
    
    if (service.providers.toString() !== req.provider._id.toString()) {
      return res.status(403).json({ success: false, msg: "Not authorized to update this service" });
    }

    // Handle category update
    if (categoryName) {
      let category = await Category.findOne({ name: categoryName });
      if (!category) {
        const generateSlug = (name) => {
          return name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-').replace(/[^\w-]+/g, '');
        };
        category = await Category.create({ 
          name: categoryName, 
          slug: generateSlug(categoryName) 
        });
      }
      updateData.categories = category._id;
    }

    // Parse imagesToKeep (handle both imagesToKeep and imagesToKeepJSON for backward compatibility)
    let keepUrls = [];
    const imagesToKeepData = imagesToKeep || imagesToKeepJSON;
    
    if (imagesToKeepData) {
      try {
        // Handle both string and already-parsed array
        if (typeof imagesToKeepData === 'string') {
          keepUrls = JSON.parse(imagesToKeepData);
        } else if (Array.isArray(imagesToKeepData)) {
          keepUrls = imagesToKeepData;
        } else {
          keepUrls = [imagesToKeepData];
        }
      } catch (e) {
        console.error("Error parsing imagesToKeep:", e);
        return res.status(400).json({ 
          success: false, 
          msg: "Invalid format for imagesToKeep. Expected a JSON array of URLs." 
        });
      }
    }

    // Filter images: separate those to keep and those to delete
    const keptImages = service.images.filter(img => keepUrls.includes(img.url));
    const imagesToDelete = service.images.filter(img => !keepUrls.includes(img.url));

    // Delete unwanted images from Cloudinary
    if (imagesToDelete.length > 0) {
      const publicIdsToDelete = imagesToDelete.map(img => img.public_id);
      try {
        await cloudinary.api.delete_resources(publicIdsToDelete);
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
        return res.status(500).json({ 
          success: false, 
          msg: "Failed to delete old images from cloud storage" 
        });
      }
    }

    // Upload new images if any
    let newUploadedImages = [];
    if (req.files && req.files.length > 0) {
      try {
        newUploadedImages = await uploadImages(req.files);
      } catch (uploadError) {
        console.error("Error uploading new images:", uploadError);
        return res.status(500).json({ 
          success: false, 
          msg: "Failed to upload new images" 
        });
      }
    }

    // Combine kept images with newly uploaded images
    updateData.images = [...keptImages, ...newUploadedImages];

    // Validate that there's at least one image
    if (updateData.images.length === 0) {
      return res.status(400).json({ 
        success: false, 
        msg: "Service must have at least one image" 
      });
    }

    // Update the service
    const updatedService = await Service.findByIdAndUpdate(
      serviceId, 
      updateData, 
      { new: true, runValidators: true }
    ).populate('categories providers');

    if (!updatedService) {
      return res.status(404).json({ 
        success: false, 
        msg: "Failed to update service" 
      });
    }

    res.status(200).json({ 
      success: true, 
      msg: "Service updated successfully", 
      service: updatedService 
    });
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while updating service",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getBookings=async(req,res)=>{
       try{
           const bookings=await Booking.find({});

           return res.status(200).json({
            success:true,
            bookings
           });
       }
       catch(err) {
        return res.status(400).json({success:false,msg:"Error occured"});
       }
}



export default {getAllServices,updateService, getnewbookings,getcompletedBookings,getupComingBookings};


