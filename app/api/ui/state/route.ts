import { NextResponse } from 'next/server';
import { getSystemState } from '@/lib/store';

export async function GET() {
    const state = getSystemState();
    return NextResponse.json(state);
}
