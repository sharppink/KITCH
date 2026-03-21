import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analyzeRouter from "./analyze";
import marketRouter from "./market";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/analyze", analyzeRouter);
router.use("/market", marketRouter);

export default router;
