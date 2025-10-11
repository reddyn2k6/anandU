import express from "express";
import { bookService, demoPayment, providerResponse, serviceAvailability } from "../controller/booking.js";
import protect from "../middlewares/userAuth.js";
import protectProvider from "../middlewares/providerAuth.js";
import { getBookings, getnewbookings } from "../controller/serviceProvider.js";
import { getUserBookings } from "../controller/user.js";

const bRouter=express.Router();


bRouter.post("/availabilty",serviceAvailability);
bRouter.post("/book",protect,bookService);
bRouter.post("/response",providerResponse);
bRouter.post("/demo-payment",demoPayment);
bRouter.get("/getBookings",getBookings);
bRouter.get("/getProviderBookings",protectProvider,getnewbookings)
bRouter.get("/getUserBookings",protect,getUserBookings);



export default bRouter;