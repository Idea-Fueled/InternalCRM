import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    leaveType: {
        type: String,
        enum: ["Casual Leave", "Sick Leave", "Earned Leave", "Unpaid Leave"],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    totalDays: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    processedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

leaveSchema.index({ employee: 1, status: 1 });
leaveSchema.index({ createdAt: -1 });

export const Leave = mongoose.model("Leave", leaveSchema);
export default Leave;
