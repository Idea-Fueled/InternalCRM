import express from "express";
import { globalSearch } from "../controllers/search.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

// GET /search?query=<searchTerm>
router.get("/", protectRoute, globalSearch);

export default router;
