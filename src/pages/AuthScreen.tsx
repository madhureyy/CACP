import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function AuthScreen() {
  const { login, register } = useAppContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLoginView) {
        const success = await login(email, password);
        if (!success) {
          setError('Invalid credentials. Try demo@example.com / password123');
        }
      } else {
        const displayName = name.trim() || email.split('@')[0];
        const success = await register(email, password, displayName);
        if (!success) {
          setError('Account creation failed. User may already exist.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-teal-600 mb-4">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900">
          Cinematic Asset Carbon Profiler
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {isLoginView ? 'Sign in to analyze your cloud storage impact' : 'Create an account to begin profiling'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-xl border border-gray-200 sm:px-10">
          
          <div className="flex border-b border-gray-200 mb-6">
            <button 
              type="button"
              className={`flex-1 py-2 font-medium text-sm ${isLoginView ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setIsLoginView(true); setError(''); }}
            >
              Sign In
            </button>
            <button 
              type="button"
              className={`flex-1 py-2 font-medium text-sm ${!isLoginView ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setIsLoginView(false); setError(''); }}
            >
              Create Account
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLoginView && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={name}
                    placeholder="e.g. Alex Mercer"
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-slate-900 bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">Email address</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-slate-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-slate-900 bg-white"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm font-medium bg-red-50 p-2.5 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:opacity-60"
              >
                {isLoading ? 'Processing...' : (isLoginView ? 'Sign in' : 'Create Account')}
              </button>
            </div>
          </form>
          
          {isLoginView && (
            <div className="mt-6 text-center text-xs text-slate-500 bg-slate-50 py-2 rounded border border-slate-100">
              Demo credentials: <strong className="text-slate-700">demo@example.com</strong> / <strong className="text-slate-700">password123</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
