// src/routes/AppRoutes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '@/features/auth/pages/LandingPage';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import HomePage from '@/features/passenger/pages/HomePage';
import MapPage from '@/features/passenger/pages/MapPage/index'; // 1. Import MapPage
import ProfilePage from '@/features/passenger/pages/ProfilePage';
import RoleRoute from './RoleRoute';
import TripHistoryPage from '@/features/passenger/pages/TripHistoryPage';
import MatatuDetailPage from '@/features/passenger/pages/MatatuDetailPage';
import NotificationsPage from '@/features/passenger/pages/NotificationPages';
// Driver Pages
import DashboardPage from '@/features/driver/pages/DashboardPage/index';
import DriverMapPage from '@/features/driver/pages/DriverMapPage'
import DriverTripsPage from '@/features/driver/pages/TripsPage';
import DriverProfilePage from '@/features/driver/pages/ProfilePage';
import DriverNotificationsPage from '@/features/driver/pages/DriverNotificationPages';
import DriverRatingsPage from '@/features/driver/pages/RatingsPage';
// Admin Pages
import AdminDashboardPage from '@/features/admin/pages/DashboardPage';
import SimulationPage from '@/features/admin/pages/SimulationPage';
import AdminDriversPage from '@/features/admin/pages/DriversPage';
import AdminPassengersPage from '@/features/admin/pages/PassengersPage';
import AdminRoutesPage from '@/features/admin/pages/RoutesPage';
import AdminTripsPage from '@/features/admin/pages/TripsPage';
import AdminNotificationsPage from '@/features/admin/pages/NotificationsPage';



const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Passenger Routes */}
      <Route element={<RoleRoute allowedRoles={['passenger']} />}>
        <Route path="/home" element={<HomePage />} />
        {/* 2. Add the dynamic map route here */}
        <Route path="/map/:routeId" element={<MapPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/trips" element={<TripHistoryPage />} />
        <Route path="/matatu/:id" element={<MatatuDetailPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      {/* Protected Driver Routes */}
      <Route element={<RoleRoute allowedRoles={['driver']} />}>
        <Route path="/driver/dashboard" element={<DashboardPage />} />
        <Route path="/driver/map" element={<DriverMapPage />} />
        <Route path="/driver/trips" element={<DriverTripsPage />} />
        <Route path="/driver/profile" element={<DriverProfilePage />} />
        <Route path="/driver/notifications" element={<DriverNotificationsPage />} />
        <Route path="/driver/ratings" element={<DriverRatingsPage />} />
      </Route>

      {/* Protected Admin Routes */}
      <Route element={<RoleRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/simulation" element={<SimulationPage />} />
        <Route path="/admin/drivers" element={<AdminDriversPage />} />
        <Route path="/admin/routes" element={<AdminRoutesPage />} />
        <Route path="/admin/passengers" element={<AdminPassengersPage />} />
        <Route path="/admin/trips" element={<AdminTripsPage />} />
        <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;