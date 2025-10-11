import Category from "../model/categoryModel.js";
import Service from "../model/serviceModel.js";


export const getAllCategories =async (req, res) => {
  const categories = await Category.find({});
 return res.status(200).json(categories);
};

export const getServicesByCategory = async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug });
  if (category) {
    const services = await Service.find({ categories: category._id }).populate("categories","name");
    res.json(services);
  } else {
    res.status(404).json({success:false,msg:"No Such category"});
  }
};




export default{
    getServicesByCategory,getAllCategories
};