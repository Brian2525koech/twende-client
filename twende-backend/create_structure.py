import os

# folders to create
folders = [
    "src/config",
    "src/controllers",
    "src/middleware",
    "src/models",
    "src/routes",
    "src/sockets",
    "src/simulation",
    "src/types",
    "src/utils"
]

# files to create
files = [
    "src/config/db.ts",

    "src/controllers/authController.ts",
    "src/controllers/routeController.ts",
    "src/controllers/pingController.ts",
    "src/controllers/favouriteController.ts",
    "src/controllers/ratingController.ts",
    "src/controllers/adminController.ts",

    "src/middleware/authMiddleware.ts",

    "src/routes/authRoutes.ts",
    "src/routes/routeRoutes.ts",
    "src/routes/pingRoutes.ts",
    "src/routes/favouriteRoutes.ts",
    "src/routes/ratingRoutes.ts",
    "src/routes/adminRoutes.ts",

    "src/sockets/locationHandler.ts",

    "src/simulation/simulator.ts",

    "src/types/index.ts",

    "src/utils/jwt.ts",

    "src/server.ts"
]

# create folders
for folder in folders:
    os.makedirs(folder, exist_ok=True)

# create files
for file in files:
    with open(file, "w") as f:
        pass

print("✅ Files and folders created inside twende-backend")