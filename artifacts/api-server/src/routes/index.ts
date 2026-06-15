import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import topicsRouter from "./topics";
import questionsRouter from "./questions";
import revisionsRouter from "./revisions";
import notesRouter from "./notes";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(topicsRouter);
router.use(questionsRouter);
router.use(revisionsRouter);
router.use(notesRouter);
router.use(dashboardRouter);

export default router;
