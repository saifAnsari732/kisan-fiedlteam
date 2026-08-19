import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import Report from '@/models/Report';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    await connectToDatabase();
    
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (userId !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    
    // Attach report counts or latest report
    const usersWithReports = await Promise.all(users.map(async (u) => {
      const reportCount = await Report.countDocuments({ userId: u._id });
      const gpsCount = await Report.countDocuments({ userId: u._id, latitude: { $exists: true } });
      return {
        ...u,
        reportCount,
        gpsCount
      };
    }));

    return NextResponse.json({ success: true, users: usersWithReports });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
