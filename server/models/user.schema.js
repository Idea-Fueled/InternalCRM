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
        required: true
    },
    designation: {
        type: String,
        default: ""
    },
    reportingManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    reportingManagers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    department: {
        type: String
    },
    profilePic: {
        type: String,
        default: ""
    },
    profilePicPublicId: {
        type: String,
        default: ""
    },

    // TL
    teamLeads: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    teamMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    //employee availability
    status: {
        type: String,
        enum: ["busy", "free", "inactive"],
        default: "free"
    },
    inactiveReason: {
        type: String,
        default: ""
    },
    inactiveUntil: {
        type: Date,
        default: null
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
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    permissions: {
        type: [String],
        default: [],
        // All valid permission strings
        validate: {
            validator: function(perms) {
                const valid = [
                    'users.create', 'users.update', 'users.delete',
                    'projects.create', 'projects.update', 'projects.delete',
                    'tasks.create', 'tasks.update', 'tasks.delete',
                    'reports.view', 'trash.view'
                ];
                return perms.every(p => valid.includes(p));
            },
            message: props => `${props.value} contains an invalid permission.`
        }
    }
}, {
    timestamps: true

})

const User = mongoose.model("User", userSchema)
export default User;