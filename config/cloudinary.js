import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config'; // Make sure to install dotenv: npm install dotenv

// Configure Cloudinary with your credentials from the .env file
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Export the configured cloudinary object
export default cloudinary;