import { Department } from "../models/department.schema.js";

export const getAllDepartments = async (req, res) => {
    try {
        const departments = await Department.find().sort({ name: 1 });
        res.status(200).json({ success: true, departments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createDepartment = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: "Name is required" });

        const existing = await Department.findOne({ name });
        if (existing) return res.status(400).json({ success: false, message: "Department already exists" });

        const department = await Department.create({ name });
        res.status(201).json({ success: true, department });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        await Department.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Department deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
