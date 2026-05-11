import jwt from "jsonwebtoken";

export const generateToken = async (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1d" })
}