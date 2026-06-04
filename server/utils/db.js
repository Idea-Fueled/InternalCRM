import mongoose from "mongoose"
import "dotenv/config"

export const connectdb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("connected to db")

        // One-time database migration to update existing notifications
        try {
            const notifications = await mongoose.model("Notification").find({
                message: { $regex: /assigned as a (employee|developer|member of this project)/i }
            });
            let updatedCount = 0;
            for (const notif of notifications) {
                const newMessage = notif.message.replace(/assigned as a (employee|developer|member of this project)/i, "assigned as a member");
                if (newMessage !== notif.message) {
                    notif.message = newMessage;
                    await notif.save();
                    updatedCount++;
                }
            }
            if (updatedCount > 0) {
                console.log(`[Migration] Successfully updated ${updatedCount} existing project assignment notifications.`);
            }
        } catch (migError) {
            console.error("Migration error updating notifications:", migError);
        }
    } catch (error) {
        console.log("error connecting to db", error.message)
    }
}