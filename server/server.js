import "dotenv/config";
import express from "express";
import { connectdb } from "./utils/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRoutes from "./routes/user.route.js";
import projectRoutes from "./routes/project.route.js";
import taskRoutes from "./routes/task.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";
import notificationRoutes from "./routes/notification.route.js";
import departmentRoutes from "./routes/department.route.js";
import passwordRoutes from "./routes/password.route.js";
import searchRoutes from "./routes/search.route.js";

const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Clean body references to prevent Mongoose CastErrors on empty strings
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        const objectIdFields = ['assignedTo', 'assignedQA', 'project', 'assignedBy', 'teamLead', 'department'];
        for (const field of objectIdFields) {
            if (req.body[field] === '') {
                req.body[field] = null;
            }
        }
    }
    next();
});

// Error message sanitizer helper
const sanitizeErrorMessage = (message, err) => {
    const msg = String(message || '').trim();
    const lower = msg.toLowerCase();
    
    // 1. JWT / Token / Auth issues
    if (
        lower.includes('unauthorized') || 
        lower.includes('jwt') || 
        lower.includes('expired token') || 
        lower.includes('no token') || 
        lower.includes('invalid token') ||
        lower.includes('user no longer exists')
    ) {
        return "Your session has expired. Please login again.";
    }

    // 2. Cast to ObjectId / Database Cast Errors
    if (
        lower.includes('cast to objectid') || 
        lower.includes('cast to keys') || 
        lower.includes('casterror') || 
        lower.includes('failed for value')
    ) {
        if (lower.includes('assignedqa')) {
            return "Please select a valid QA before assigning the task.";
        }
        if (lower.includes('assignedto')) {
            return "Please select a valid user before assigning the task.";
        }
        if (lower.includes('project')) {
            return "Please select a valid project.";
        }
        if (lower.includes('teamlead')) {
            return "Please select a valid Team Lead.";
        }
        return "Please select a valid user before assigning the task.";
    }

    // 3. Schema Validation errors
    if (
        lower.includes('validation failed') || 
        lower.includes('validationerror') || 
        lower.includes('is required') || 
        lower.includes('required fields')
    ) {
        return "Please fill all required fields correctly.";
    }

    // 4. Duplicate key database errors
    if (
        lower.includes('duplicate key') || 
        lower.includes('already exists') || 
        lower.includes('index:')
    ) {
        return "A record with this information already exists.";
    }

    // 5. Generic Internal Server Errors or raw server/database traces
    if (
        lower.includes('internal server error') || 
        lower.includes('server error') || 
        lower.includes('500') || 
        lower.includes('mongodb') || 
        lower.includes('mongoerror') || 
        lower.includes('mongoose') || 
        lower.includes('connection failed') || 
        lower.includes('db error') ||
        lower.includes('cast') || 
        lower.includes('syntaxerror') ||
        lower.includes('referenceerror') ||
        lower.includes('typeerror')
    ) {
        return "Something went wrong. Please try again.";
    }

    return message;
};

// Centralized Response Interceptor Middleware to sanitize outgoing JSON responses
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        if (body && typeof body === 'object') {
            const hasError = body.success === false || res.statusCode >= 400;
            if (hasError && body.message) {
                console.warn(`[API ERROR SANITIZER] Sanitizing: "${body.message}" for path ${req.originalUrl}`);
                body.message = sanitizeErrorMessage(body.message, body);
            }
        }
        return originalJson.call(this, body);
    };
    next();
});

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
app.use("/notifications", notificationRoutes);
app.use("/departments", departmentRoutes);
app.use("/auth", passwordRoutes);
app.use("/search", searchRoutes);

// Centralized Express Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("[CENTRALIZED SERVER ERROR]:", err);
    
    // Retrieve status code or default to 500
    const statusCode = err.status || err.statusCode || 500;
    
    res.status(statusCode).json({
        success: false,
        message: err.message || "Something went wrong. Please try again."
    });
});

const PORT = 8000
connectdb();

app.listen(PORT, () => {
    console.log(`app listening on port ${PORT}`);
});