import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Report from '@/models/Report';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    await connectToDatabase();
    
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userId === 'admin') {
      const reports = await Report.find().populate('userId', 'name email').sort({ createdAt: -1 });
      return NextResponse.json({ success: true, reports });
    }

    const reports = await Report.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, reports });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();
    
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    
    const report = await Report.create({
      userId,
      ...data
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
