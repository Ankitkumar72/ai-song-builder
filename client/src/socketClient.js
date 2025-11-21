import { io } from "socket.io-client";

// YOUR BACKEND URL (correct)
export const socket = io("http://localhost:4000", {
  transports: ["websocket", "polling"],
  
});
window.__SOCKET = socket;
