import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import teachersRouter from "./teachers";
import sessionsRouter from "./sessions";
import reviewsRouter from "./reviews";
import storageRouter from "./storage";
import messagesRouter from "./messages";
import disputesRouter from "./disputes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(teachersRouter);
router.use(sessionsRouter);
router.use(reviewsRouter);
router.use(storageRouter);
router.use(messagesRouter);
router.use(disputesRouter);

export default router;
