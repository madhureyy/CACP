import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { CloudProvider } from '../types';

export default function ConnectScreen() {
  const { connect, isScanning, isConnected, logout } = useAppContext();
  const navigate = useNavigate();
  const [scanStep, setScanStep] = useState(0);

  const handleConnect = async (provider: CloudProvider) => {
    await connect(provider);
  };

  useEffect(() => {
    if (isConnected) {
      navigate('/dashboard');
    }
  }, [isConnected, navigate]);

  useEffect(() => {
    let timer1: ReturnType<typeof setTimeout>, timer2: ReturnType<typeof setTimeout>;
    if (isScanning) {
      setScanStep(1);
      timer1 = setTimeout(() => setScanStep(2), 1000);
      timer2 = setTimeout(() => setScanStep(3), 2000);
    }
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isScanning]);

  const getStepText = () => {
    switch (scanStep) {
      case 1: return 'Authenticating...';
      case 2: return 'Connecting to bucket...';
      case 3: return 'Scanning files...';
      default: return 'Starting...';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative font-sans">
      
      {/* Top right logout button */}
      <div className="absolute top-6 right-6">
        <button 
          onClick={logout}
          className="text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="max-w-2xl w-full text-center space-y-8 z-10">
        <div className="flex justify-center text-teal-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Connect your cloud storage
          </h1>
          <p className="text-lg text-slate-600 max-w-lg mx-auto">
            Discover the hidden cost and carbon footprint of your creative cloud storage
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <button 
            onClick={() => handleConnect('gcs')}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium shadow-sm transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            Connect Google Cloud Storage
          </button>
          
          <button 
            onClick={() => handleConnect('azure')}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 border border-teal-600 text-teal-700 hover:bg-teal-50 bg-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Connect Azure Blob Storage
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-8">
          This prototype uses simulated data for demonstration purposes.
        </p>
      </div>

      {isScanning && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-sm w-full mx-4 border border-gray-100">
            <div className="relative w-16 h-16 flex items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-teal-600 border-t-transparent animate-spin-slow"></div>
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Analyzing Storage</h3>
            <p className="text-slate-600 animate-pulse">{getStepText()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
