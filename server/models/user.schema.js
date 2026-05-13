import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["admin", "TL", "developer", "qa"],
        required: true
    },
    department: {
        type: String
    },

    // TL
    teamLead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    teamMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    //employee availability
    status: {
        type: String,
        enum: ["busy", "free"],
        default: "free"
    },

    projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project"
    }],
    tasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task"
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true

})

const User = mongoose.model("User", userSchema)
export default User;