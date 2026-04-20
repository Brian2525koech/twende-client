import { Socket, Server } from 'socket.io';
import { query } from '../config/db';

interface ActiveDriver {
  driverId: number;
  routeId: number;
  plate: string;
  socketId: string;
}

const activeDrivers: Map<number, ActiveDriver> = new Map(); // driverId → info

export const handleLocationEvents = (socket: Socket & { user?: any }, io: Server) => {
  const user = socket.user;

  if (user.role === 'driver') {
    socket.on('driver:go-online', async () => {
      try {
        const profile = await query(
          'SELECT plate_number, route_id FROM driver_profiles WHERE user_id = $1',
          [user.id]
        );

        if (profile.rows.length === 0) {
          socket.emit('error', { message: 'No driver profile found' });
          return;
        }

        const { plate_number: plate, route_id: routeId } = profile.rows[0];

        // Mark as active in DB
        await query(
          'UPDATE driver_profiles SET is_active = TRUE WHERE user_id = $1',
          [user.id]
        );

        activeDrivers.set(user.id, {
          driverId: user.id,
          routeId,
          plate,
          socketId: socket.id
        });

        socket.emit('driver:status', { online: true, plate, routeId });
        io.emit('driver:online-update', { driverId: user.id, routeId, online: true });

        console.log(`Driver ${user.email} went ONLINE on route ${routeId}`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to go online' });
      }
    });

    socket.on('driver:go-offline', async () => {
      try {
        await query(
          'UPDATE driver_profiles SET is_active = FALSE WHERE user_id = $1',
          [user.id]
        );

        activeDrivers.delete(user.id);

        socket.emit('driver:status', { online: false });
        io.emit('driver:online-update', { driverId: user.id, online: false });

        console.log(`Driver ${user.email} went OFFLINE`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to go offline' });
      }
    });

    socket.on('driver:ping', async (data: { lat: number; lng: number; speed?: number }) => {
      const driver = activeDrivers.get(user.id);
      if (!driver) {
        socket.emit('error', { message: 'Not online' });
        return;
      }

      const { lat, lng, speed = 0 } = data;

      try {
        // Store ping in DB
        await query(
          'INSERT INTO pings (driver_id, lat, lng, speed) VALUES ($1, $2, $3, $4)',
          [user.id, lat, lng, speed]
        );

        // Broadcast to everyone watching this route
        io.to(`route:${driver.routeId}`).emit('matatu:location', {
          driverId: user.id,
          plate: driver.plate,
          lat,
          lng,
          speed,
          timestamp: new Date().toISOString()
        });

      } catch (err) {
        console.error('Ping save failed:', err);
      }
    });
  }

  // Passenger joins/leaves route room
  if (user.role === 'passenger') {
    socket.on('passenger:watch-route', (routeId: number) => {
      if (!routeId) return;
      socket.join(`route:${routeId}`);
      console.log(`Passenger ${user.email} watching route ${routeId}`);
    });

    socket.on('passenger:stop-watching', (routeId: number) => {
      if (routeId) socket.leave(`route:${routeId}`);
    });
  }
};

// Helper: Get currently active drivers on a route (used later for passenger home screen)
export const getActiveDriversOnRoute = (routeId: number): ActiveDriver[] => {
  const drivers: ActiveDriver[] = [];
  for (const d of activeDrivers.values()) {
    if (d.routeId === routeId) drivers.push(d);
  }
  return drivers;
};