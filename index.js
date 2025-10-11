import express from 'express';
import cors from 'cors';
import 'dotenv/config.js';
import http from 'http'; // Required for Socket.IO
import { Server } from 'socket.io'; // Required for Socket.IO

import router from "./routes/authRoutes.js";
import cookieParser from "cookie-parser";
import connectDB from './config/connect.js';
import pRouter from './routes/authProviderRoutes.js';
import aRouter from './routes/serviceProviderRoutes.js';
import cRouter from './routes/categoryRoutes.js';
import uRouter from './routes/userRoutes.js';
import mRouter from './routes/messageRoutes.js';
import coRouter from './routes/conversationRoutes.js';
import rRouter from './routes/reviewRoutes.js';
import bRouter from './routes/bookingRoutes.js';



const PORT = process.env.PORT || 4000;

connectDB();

const app = express();

// --- CREATE HTTP SERVER TO WRAP THE EXPRESS APP ---
const server = http.createServer(app);

const allowedOrigins = [
    'http://localhost:5173',         // local React dev
    'https://anand-utsav.vercel.app'   // production frontend
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- ROUTES ---
app.use('/auth', router);
app.use('/provider/auth', pRouter);
app.use("/provider", aRouter);
app.use("/category", cRouter);
app.use("/user", uRouter);
app.use('/message', mRouter);
app.use('/convo', coRouter);
app.use('/review',rRouter);
app.use('/booking',bRouter);


// --- UPDATE SERVER LISTENING ---
server.listen(PORT, () => {
    console.log("Server Started at PORT", PORT);
});


// ===================================
// == SOCKET.IO INITIALIZATION      ==
// ===================================
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: allowedOrigins, // Use the same origins as the main app
  },
});

io.on("connection", (socket) => {
  console.log("A user connected to socket.io");

  // User joins a personal room based on their own MongoDB ID
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
console.log(`User room created for: ${userData._id}`);
  });

  // User joins a specific conversation room
  socket.on("join conversation", (room) => {
    socket.join(room);
    console.log("User joined conversation room: " + room);
  });

  // Typing indicators
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  // Handling a new message
  socket.on("new message", (newMessageRecieved) => {
    let conversation = newMessageRecieved.conversation;

    if (!conversation || !conversation.participants) {
        return console.log("Message received without conversation participants.");
    }

    // Send the message to every participant in the conversation except the sender
    conversation.participants.forEach((participant) => {
      const participantId = participant._id ? participant._id.toString() : participant.toString();
      const senderId = newMessageRecieved.sender._id.toString();
      
      if (participantId === senderId) return;

      // Emit the "message received" event to the participant's personal room
      socket.in(participantId).emit("message received", newMessageRecieved);
    });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});