import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';

export async function POST(req) {
  try {
    await connectToDatabase();
    const { email, password } = await req.json();

    if (email === 'admin@kisanindia.com' && password === 'admin123') {
      const response = NextResponse.json({ success: true, user: { id: 'admin', name: 'Admin', email: 'admin@kisanindia.com' }, isAdmin: true });
      response.cookies.set('userId', 'admin', {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', maxAge: 60 * 60 * 24 * 7, path: '/'
      });
      return response;
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
    
    // Set simple cookie
    response.cookies.set('userId', user._id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
