import { createTRPCRouter } from "../init";
import { generationsRouter } from "./generations";
import { voicesRouter } from "./voices";
import { billingsRouter } from "./billings";
import { accountRouter } from "./account";

export const appRouter = createTRPCRouter({
  account: accountRouter,
  generations: generationsRouter,
  voices: voicesRouter,
  billings: billingsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
