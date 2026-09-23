    import express from "express";
    import cors from "cors";
    import authRoutes from "./routes/auth.routes";
    import userRoutes from "./routes/user.routes";
    import admissionRoutes from "./routes/admission.routes";
    import wardRoutes from "./routes/ward.routes";
    import bedRoutes from "./routes/bed.routes";
    import rosterRoutes from "./routes/roster.routes";
    import handoverRoutes from "./routes/handover.routes";
    import rosterOverrideRoutes from "./routes/rosterOverride.routes";

    const app = express();

    app.use(cors());
    app.use(express.json());

    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/admissions", admissionRoutes);
    app.use("/api/handovers", handoverRoutes);
    app.use("/api/wards", wardRoutes);
    app.use("/api/beds", bedRoutes);
    app.use("/api/rosters", rosterRoutes);
    app.use("/api/roster-overrides", rosterOverrideRoutes);

    app.get("/", (req, res) => {
        res.json({
            message: "Nursing Workflow Assistant Backend is running"
        });
    });

    export default app;