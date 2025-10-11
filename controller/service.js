// /controllers/service.js
import Category from "../model/categoryModel.js";
import Service from "../model/serviceModel.js";
import ServiceProvider from "../model/serviceProviderModel.js";


const generateSlug = (name) => {
  return name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-').replace(/[^\w-]+/g, '');
};



export const addService = async (req, res) => {
  const { name, description, images, priceInfo, categoryName,minPeople,maxPeople,mindaysprior } = req.body;
  
  if (!name || !priceInfo || !categoryName || !minPeople || !maxPeople) {
    res.status(400).json({success:false,msg:"All fields are required"});
  }
   if(minPeople>maxPeople) {
    return res.status(400).json({success:false,msg:"Minimum People cannot be more than maximum people"});
   }
  let category = await Category.findOne({ name: categoryName });

  if (!category) {
    // If category doesn't exist, create it automatically
    category = await Category.create({
      name: categoryName,
      slug: generateSlug(categoryName),
    });
  }

  const providerId = req.provider._id;
  const service = await Service.create({
    name, description, images, priceInfo,
    categories: category._id,
    providers: providerId,minPeople,maxPeople,mindaysprior
  });

  const provider = await ServiceProvider.findById(providerId);
  provider.services.push(service._id);
  await provider.save();
  
  category.services.push(service._id);
  await category.save();

  res.status(201).json({success:true,msg:"Service entered"});
};




export const getServices = async (req, res) => {
  const services = await Service.find({})
    .populate('categories', 'name slug')
    .populate('providers', 'name location');
  
 return res.status(201).send(services);
};


// export const getServiceById = async (req, res) => {
//   const service = await Service.findById(req.params.id)
//     .populate('categories', 'name slug')
//     .populate('providers', 'name location email phone');
    
//   if (service) {
//     res.json({success:true,msg:"Service Fetched"});
//   } else {
//     res.status(404).json({success:false,msg:'Service not found'});
//   }
// };




export const deleteService = async (req, res) => {
  try {
    const serviceId = req.params.id; // <-- get ID from URL
    const providerId = req.provider._id;

    // Ensure the service belongs to this provider
    const service = await Service.findOne({ _id: serviceId, providers: providerId });
    if (!service) {
      return res.status(404).json({ success: false, msg: "Service not found or not authorized" });
    }

    await Service.findByIdAndDelete(serviceId);

    // Remove references from provider and category
    await ServiceProvider.findByIdAndUpdate(providerId, { $pull: { services: serviceId } });
    await Category.findByIdAndUpdate(service.categories, { $pull: { services: serviceId } });

    res.status(200).json({ success: true, msg: "Service deleted successfully" });
  } catch (err) {
    console.error("Delete Service Error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export default {addService,getServices,deleteService};