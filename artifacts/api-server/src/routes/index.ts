import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import dossiersRouter from "./dossiers";
import decisionsRouter from "./decisions";
import auditRouter from "./audit";
import infrastructureRouter from "./infrastructure";
import dashboardRouter from "./dashboard";
import scoringRouter from "./scoring";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(dossiersRouter);
router.use(decisionsRouter);
router.use(auditRouter);
router.use(infrastructureRouter);
router.use(dashboardRouter);
router.use(scoringRouter);

export default router;
