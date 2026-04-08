import { createTRPCRouter } from "../init";
import { generationsRouter } from "./generations";
import { voicesRouter } from "./voices";
import { billingsRouter } from "./billings";

export const appRouter = createTRPCRouter({
  generations: generationsRouter,
  voices: voicesRouter,
  billings: billingsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
