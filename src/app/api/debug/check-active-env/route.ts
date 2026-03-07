
import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        DATABASE_URL: process.env.DATABASE_URL?.includes('connection_limit=') ? 'PRESENT' : 'MISSING',
        LIMIT_IN_URL: process.env.DATABASE_URL?.split('connection_limit=')[1]?.split('&')[0],
        PRISMA_URL: process.env.POSTGRES_PRISMA_URL?.split('connection_limit=')[1]?.split('&')[0],
        ENV_KEYS: Object.keys(process.env).filter(k => k.includes('POSTGRES') || k.includes('DATABASE'))
    });
}
