import "dotenv/config";
import express from "express";
import { connectdb } from "./utils/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRoutes from "./routes/user.route.js";
import projectRoutes from "./routes/project.route.js";
import taskRoutes from "./routes/task.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";

const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, '')) 
    : ["http://localhost:5173"];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*") || origin.includes("vercel.app")) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With", "Accept", "Origin"]
}))

app.use("/users", userRoutes)
app.use("/projects", projectRoutes);
app.use("/tasks", taskRoutes);
app.use("/dashboard", dashboardRoutes);

const PORT = 8000

connectdb()

app.listen(PORT, () => {
    console.log(`app listening on port ${PORT}`)
})