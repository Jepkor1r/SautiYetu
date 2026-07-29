import { io } from "socket.io-client";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export function createSocket() {
  return io(API_BASE_URL, {
    transports: ["websocket", "polling"]
  });
}
