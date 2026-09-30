import { Request, Response } from "express";
import { getActiveDoctors } from "../services/doctor.service";

export async function getActiveDoctorsController(
    req: Request,
    res: Response
) {
    try {
        const doctors = await getActiveDoctors();

        return res.status(200).json({
            doctors,
        });
    } catch (error) {
        console.error("Get active doctors error:", error);

        return res.status(500).json({
            message: "Failed to fetch doctors.",
        });
    }
}
