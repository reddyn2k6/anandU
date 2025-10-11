import express from "express";
import { bookService, demoPayment, providerResponse, serviceAvailability } from "../controller/booking.js";
import protect from "../middlewares/userAuth.js";

const bRouter=express.Router();


bRouter.post("/availabilty",serviceAvailability);
bRouter.post("/book",protect,bookService);
bRouter.post("/response",providerResponse);
bRouter.post("/demo-payment",demoPayment);





export default bRouter;