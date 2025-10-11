import ServiceProvider from "../model/serviceProviderModel.js";
import Service from "../model/serviceModel.js";
import Category from "../model/categoryModel.js"

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

export const getnewbookings=async(req,res)=>{
    try{
       const providerId=req.provider._id;
if(!providerId) {
    return res.status(400).json({success:false,msg:"No providerId found"});
}
       const provider=await ServiceProvider.findById(providerId);

       if(!provider) {
            return res.status(400).json({success:false,msg:"No such provider"});
       }

       return res.status(200).json({success:true, newBookings:provider.newBookings});
    }
    catch(err) {
        return res.status(400).json({success:false,msg:"Server Error"});
    }
}

export const updateService = async (req, res) => {
  try {
    const providerId = req.provider._id;
    const {
      serviceId,
      name,
      description,
      priceInfo,
      images,
      categories, // ✅ keeping as "categories"
      minPeople,
      maxPeople,
      mindaysprior,
    } = req.body;

    // 1️⃣ Verify service ownership
    const service = await Service.findOne({ _id: serviceId, providers: providerId });
    if (!service) {
      return res.status(404).json({
        success: false,
        msg: "Service not found or unauthorized.",
      });
    }

    // 2️⃣ Update category if changed
    if (categories && typeof categories === "string" && categories.trim() !== "") {
      let newCategory = await Category.findOne({ name: categories });

      if (!newCategory) {
        newCategory = await Category.create({
          name: categories,
          slug: categories.toLowerCase().replace(/\s+/g, "-"),
        });
      }

      if (service.categories.toString() !== newCategory._id.toString()) {
        // Remove from old category
        await Category.findByIdAndUpdate(service.categories, {
          $pull: { services: service._id },
        });

        // Add to new category
        await Category.findByIdAndUpdate(newCategory._id, {
          $addToSet: { services: service._id },
        });

        service.categories = newCategory._id;
      }
    }

    // 3️⃣ Update fields
    if (name) service.name = name.trim();
    if (description) service.description = description.trim();
    if (priceInfo) service.priceInfo = priceInfo;
    if (images && Array.isArray(images) && images.length > 0) service.images = images;
    if (minPeople !== undefined && minPeople !== null)
      service.minPeople = Number(minPeople);
    if (maxPeople !== undefined && maxPeople !== null)
      service.maxPeople = Number(maxPeople);
    if (mindaysprior !== undefined && mindaysprior !== null)
      service.mindaysprior = Number(mindaysprior);

    // 4️⃣ Validate people constraints
    if (service.minPeople > service.maxPeople) {
      return res.status(400).json({
        success: false,
        msg: "Minimum people cannot be greater than maximum people.",
      });
    }

    // 5️⃣ Save updated service
    await service.save();

    return res.status(200).json({
      success: true,
      msg: "Service updated successfully.",
      service,
    });
  } catch (err) {
    console.error("Update Service Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Server error.",
    });
  }
};

export default {getAllServices,updateService, getnewbookings};
