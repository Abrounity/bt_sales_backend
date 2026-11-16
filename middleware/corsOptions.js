
import cors from "cors";

const allowedOrigins = [
  "https://bt-sales-frontend.vercel.app",
  "https://www.btsalesindia.com",
  "https://btsalesindia.com",
  "http://localhost:3000",
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error("Blocked CORS origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Admin-Request",
  ],
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
