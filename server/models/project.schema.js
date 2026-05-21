import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        projectName: {
            type: String,
            required: true,
        },

        description: {
            type: String,
        },

        teamLead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        teamMembers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        status: {
            type: String,
            enum: ["Active", "Completed", "On Track", "At Risk", "Upcoming", "In Progress", "Planning"],
            default: "Active",
        },

        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Critical"],
            default: "Medium",
        },

        techStack: [
            {
                type: String,
            }
        ],

        clientName: {
            type: String,
            default: "",
        },

        estimatedTasks: {
            type: Number,
            default: 0,
        },

        attachments: [
            {
                url: { type: String, required: true },
                filename: { type: String, required: true },
                fileType: { type: String },
                uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                createdAt: { type: Date, default: Date.now }
            }
        ],

        notes: [
            {
                text: { type: String, required: true },
                author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                createdAt: { type: Date, default: Date.now }
            }
        ],

        attachment: {
            type: String,
            default: "",
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Project", projectSchema);