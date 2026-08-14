import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// 1. Properly declare the global variable type
declare global {
    var prisma: PrismaClient | undefined;
}

// 2. Reuse the global instance if it exists, otherwise create a new one
export const prisma =
    globalThis.prisma ??
    new PrismaClient({
        adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });

// 3. Save it to the global object in development to persist across HMR hot-reloads
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}

export default prisma;
