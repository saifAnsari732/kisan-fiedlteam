"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.isAdmin) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f1f5f9] p-4 font-sans">
      
      {/* Logo Section */}
      <div className="mb-6 flex flex-col items-center">
        <div className="w-48 relative flex items-center justify-center mb-2">
          <Image 
            src="/5.png" 
            alt="Kisan India Logo" 
            width={300}
            height={100}
            priority
            className="w-full h-auto object-contain drop-shadow-md"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/50 p-8 w-full max-w-md border-t-[6px] border-rose-500 relative overflow-hidden">
        
        {/* Subtle background decoration */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-rose-50 rounded-full blur-2xl opacity-60 pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-blue-50 rounded-full blur-2xl opacity-60 pointer-events-none"></div>

        <h1 className="text-3xl font-extrabold text-center text-blue-600 mb-6 relative z-10">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl mb-5 text-sm text-center font-medium shadow-sm relative z-10">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Full Name</label>
              <input
                type="text"
                required
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition text-gray-800 placeholder:text-gray-400 font-medium"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          )}
          
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              required
              placeholder="name@company.com"
              className="w-full px-4 py-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition text-gray-800 placeholder:text-gray-400 font-medium"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition text-gray-800 placeholder:text-gray-400 font-medium tracking-widest"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-rose-200 disabled:opacity-70 mt-4 text-base"
          >
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-8 text-center relative z-10">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Log In"}
          </button>
        </div>
      </div>
    </div>
  );
}
