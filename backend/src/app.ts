import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import admissionRoutes from "./routes/admission.routes";
import wardRoutes from "./routes/ward.routes";
import bedRoutes from "./routes/bed.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admissions", admissionRoutes);
app.use("/api/wards", wardRoutes);
app.use("/api/beds", bedRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Nursing Workflow Assistant Backend is running"
    });
});

export default app;