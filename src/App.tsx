import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import ConnectScreen from './pages/ConnectScreen';
import { DashboardScreen } from './pages/DashboardScreen';
import { InventoryScreen } from './pages/InventoryScreen';
import ReportScreen from './pages/ReportScreen';
import AuthScreen from './pages/AuthScreen';
import { useAppContext } from './context/AppContext';

function AppLayout() {
  const { isConnected, isAuthenticated } = useAppContext();
  
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  if (!isConnected) {
    return <ConnectScreen />;
  }
  
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/inventory" element={<InventoryScreen />} />
          <Route path="/report" element={<ReportScreen />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </HashRouter>
  );
}

export default App;
