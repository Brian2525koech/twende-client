import os

folders = [
    "src/assets/icons",
    "src/assets/images",

    "src/components/ui",
    "src/components/map",
    "src/components/layout",
    "src/components/common",

    "src/features/auth/components",
    "src/features/auth/pages",
    "src/features/auth/hooks",

    "src/features/passenger/components",
    "src/features/passenger/pages",
    "src/features/passenger/hooks",

    "src/features/driver/components",
    "src/features/driver/pages",
    "src/features/driver/hooks",

    "src/features/admin/components",
    "src/features/admin/pages",
    "src/features/admin/hooks",

    "src/contexts",

    "src/hooks",

    "src/lib/api",
    "src/lib",

    "src/types",

    "src/routes"
]

files = [
    # Auth pages
    "src/features/auth/pages/LandingPage.tsx",
    "src/features/auth/pages/LoginPage.tsx",
    "src/features/auth/pages/RegisterPage.tsx",

    # Passenger pages
    "src/features/passenger/pages/HomePage.tsx",
    "src/features/passenger/pages/MapPage.tsx",
    "src/features/passenger/pages/ProfilePage.tsx",
    "src/features/passenger/pages/TripHistoryPage.tsx",

    # Driver pages
    "src/features/driver/pages/DashboardPage.tsx",
    "src/features/driver/pages/MyRouteMapPage.tsx",
    "src/features/driver/pages/ReviewsPage.tsx",

    # Admin pages
    "src/features/admin/pages/AdminDashboardPage.tsx",
    "src/features/admin/pages/SimulationPanel.tsx",

    # Contexts
    "src/contexts/AuthContext.tsx",
    "src/contexts/SocketContext.tsx",
    "src/contexts/ThemeContext.tsx",

    # Hooks
    "src/hooks/useAuth.ts",
    "src/hooks/useSocket.ts",
    "src/hooks/useRoleRedirect.ts",
    "src/hooks/useMap.ts",

    # API
    "src/lib/api/axios.ts",
    "src/lib/api/authApi.ts",
    "src/lib/api/routesApi.ts",
    "src/lib/api/pingsApi.ts",
    "src/lib/api/ratingsApi.ts",

    "src/lib/leafletFix.ts",

    # Routes
    "src/routes/AppRoutes.tsx",
    "src/routes/ProtectedRoute.tsx",
    "src/routes/RoleRoute.tsx",

    # Core
    "src/App.tsx",
    "src/main.tsx",
    "src/index.css",

    "src/types/index.ts"
]

# create folders
for folder in folders:
    os.makedirs(folder, exist_ok=True)

# create files
for file in files:
    with open(file, "w") as f:
        pass

print("✅ Frontend structure created successfully")