import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    taskName: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    assignedQA: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    status: {
        type: String,
        enum: ["New", "In Progress", "QA Review", "Completed", "Done"],
        default: "New"
    },
    priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium"
    },
    startDate: {
        type: Date,
    },
    endDate: {
        type: Date,
    },
    developerNotes: {
        type: String,
        default: ""
    },
    qaNotes: {
        type: String,
        default: ""
    },
    attachments: [
        {
            url: { type: String },
            filename: { type: String },
            fileType: { type: String }
        }
    ],
    screenshotLinks: [
        { type: String }
    ],
    isDeleted: {
        type: Boolean,
        default: false
    },
    statusHistory: [
        {
            fromStatus: { type: String },
            status: { type: String },
            notes: { type: String, default: "" },
            attachment: { type: String, default: "" },
            attachments: [
                {
                    url: { type: String },
                    filename: { type: String },
                    fileType: { type: String }
                }
            ],
            screenshotLinks: [
                { type: String }
            ],
            changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            changedAt: { type: Date, default: Date.now }
        }
    ]

},
    { timestamps: true }
)

export const Task = mongoose.model("Task", taskSchema);