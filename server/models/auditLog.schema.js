import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
    {
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        userRole: {
            type: String,
            required: true
        },
        itemType: {
            type: String,
            enum: ["Message", "Attachment", "Note", "Comment"],
            required: true
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project"
        },
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task"
        },
        details: {
            type: String,
            required: true
        }
    },
    { 
        timestamps: { createdAt: "timestamp", updatedAt: false } 
    }
);

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
