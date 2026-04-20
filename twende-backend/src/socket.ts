// src/socket.ts
import { Server, Socket } from 'socket.io';

let io: Server;

export const initIO = (server: Server): void => {
  io = server;

  io.on('connection', (socket: Socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    // ── Notification room ─────────────────────────────────────────────────
    socket.on('join_private_room', (userId: number) => {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined private room`);
    });

    // ── Route rooms (passengers watch live matatu positions) ──────────────
    socket.on('join:route', (routeId: number) => {
      socket.join(`route-${routeId}`);
      console.log(`📍 Socket ${socket.id} watching route-${routeId}`);
    });

    socket.on('leave:route', (routeId: number) => {
      socket.leave(`route-${routeId}`);
    });

    // ── Passenger personal room ───────────────────────────────────────────
    // Receives: matatu:stopping_for_you, passenger:X:boarded,
    //           passenger:X:alighting, passenger:X:accepted,
    //           passenger:X:notification
    socket.on('join:passenger', (passengerId: number) => {
      socket.join(`passenger-${passengerId}`);
      console.log(`🧍 Passenger ${passengerId} joined personal room`);
    });

    socket.on('leave:passenger', (passengerId: number) => {
      socket.leave(`passenger-${passengerId}`);
    });

    // ── Driver personal room ──────────────────────────────────────────────
    // Receives: driver:X:passenger_boarded, driver:X:passenger_alighted,
    //           driver:X:payment_received, route:X:passenger_waiting
    socket.on('join:driver', (driverId: number) => {
      socket.join(`driver-${driverId}`);
      console.log(`🚌 Driver ${driverId} joined personal room`);
    });

    socket.on('leave:driver', (driverId: number) => {
      socket.leave(`driver-${driverId}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id);
    });
  });
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};