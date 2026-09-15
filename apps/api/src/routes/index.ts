import { Router } from "express";
import { traineeRouter } from "./trainee.js";
import { resourcesRouter } from "./resources.js";
import { recruiterRouter } from "./recruiter.js";
import { dashboardRouter } from "./dashboard.js";
import { providerRouter } from "./provider.js";
import { adminRouter } from "./admin.js";
import { chatRouter } from "./chat.js";
import { authRouter } from "./auth.js";
import { marketRouter } from "./market.js";

export const apiRouter = Router();

apiRouter.use(authRouter);
apiRouter.use(marketRouter);
apiRouter.use(traineeRouter);
apiRouter.use("/resources", resourcesRouter);
apiRouter.use("/recruiter", recruiterRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/provider", providerRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/chat", chatRouter);
