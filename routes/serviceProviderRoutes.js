import express from "express";
import protectProvider  from "../middlewares/providerAuth.js";
import {addService,deleteService,getServices} from "../controller/service.js";
import {getAllServices,updateService,getnewbookings} from "../controller/serviceProvider.js";


const aRouter=express.Router();



aRouter.post('/addService',protectProvider,addService);
aRouter.get('/getallServicesByProvider',protectProvider,getAllServices);
aRouter.get('/allservices',getServices);
aRouter.put('/updateService',protectProvider,updateService);
aRouter.delete('/deleteService/:id',protectProvider,deleteService);
aRouter.get('/getnewbookings',protectProvider,getnewbookings);


export default aRouter;