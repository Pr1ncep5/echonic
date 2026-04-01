import { z } from "zod";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
    server: {
        DATABASE_URL: z.string().min(1),
        BETTER_AUTH_SECRET: z.string().min(1),
        BETTER_AUTH_URL: z.string().min(1),
        GITHUB_CLIENT_ID: z.string().min(1),
        GITHUB_CLIENT_SECRET: z.string().min(1),
        GOOGLE_CLIENT_ID: z.string().min(1),
        GOOGLE_CLIENT_SECRET: z.string().min(1),
    },
    client: {
        NEXT_PUBLIC_BETTER_AUTH_URL: z.string().min(1),
    },
    experimental__runtimeEnv: {
        NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    },
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});