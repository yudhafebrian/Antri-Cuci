import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import AntrianPage from './pages/AntrianPage';
import ReportPage from './pages/ReportPage';
import ActiveQueuePage from './pages/ActiveQueuePage';
import { loadActiveOrders, subscribeToOrders, type ServiceOrderRow } from './lib/db';
import './App.css';

export default function App() {
  const [queue, setQueue] = useState<ServiceOrderRow[]>([]);

  const refreshQueue = async () => {
    const data = await loadActiveOrders();
    setQueue(data);
  };

  useEffect(() => {
    refreshQueue();
    const unsubscribe = subscribeToOrders(refreshQueue);
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex justify-center">
      <Routes>
        <Route path="/" element={
          <AntrianPage queue={queue} />
        } />
        <Route path="/admin" element={
          <AdminPage />
        } />
        <Route path="/antrian" element={
          <AntrianPage queue={queue} />
        } />
        <Route path="/report" element={
          <ReportPage />
        } />
        <Route path="/report/active-queue" element={
          <ActiveQueuePage />
        } />
      </Routes>
    </div>
  );
}
