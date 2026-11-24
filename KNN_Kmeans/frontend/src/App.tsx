import React, { useState, useEffect } from 'react';
import { api, getStoredToken } from './services/api';
import { User, NetworkTrafficItem } from './types';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { TrafficExplorerPage } from './pages/TrafficExplorerPage';
import { ThreatAnalyticsPage } from './pages/ThreatAnalyticsPage';
import { PredictionLabPage } from './pages/PredictionLabPage';
import { AlertsPage } from './pages/AlertsPage';
import { ModelEvaluationPage } from './pages/ModelEvaluationPage';
import { DatasetManagementPage } from './pages/DatasetManagementPage';
import { SettingsAuditPage } from './pages/SettingsAuditPage';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [openAlertsCount, setOpenAlertsCount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedRecordForPrediction, setSelectedRecordForPrediction] = useState<NetworkTrafficItem | null>(null);

  // Check existing session
  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.getMe();
        setUser(me);
        fetchAlertsCount();
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const fetchAlertsCount = async () => {
    try {
      const res = await api.getAlerts({ status: 'new', page: 1, page_size: 1 });
      setOpenAlertsCount(res.total);
    } catch {
      // ignore
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    fetchAlertsCount();
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAlertsCount();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSendToPrediction = (record: NetworkTrafficItem) => {
    setSelectedRecordForPrediction(record);
    setCurrentTab('prediction');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">Initializing CyberSecurity Threat Platform...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-100 font-sans">
      {/* Sidebar fixed */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        openAlertsCount={openAlertsCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen bg-slate-950">
        <Navbar
          currentTab={currentTab}
          user={user}
          onLogout={handleLogout}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <OverviewPage onNavigateTab={setCurrentTab} />
          )}
          {currentTab === 'traffic' && (
            <TrafficExplorerPage onSendToPrediction={handleSendToPrediction} />
          )}
          {currentTab === 'analytics' && (
            <ThreatAnalyticsPage />
          )}
          {currentTab === 'prediction' && (
            <PredictionLabPage initialRecord={selectedRecordForPrediction} />
          )}
          {currentTab === 'alerts' && (
            <AlertsPage user={user} onAlertUpdated={fetchAlertsCount} />
          )}
          {currentTab === 'models' && (
            <ModelEvaluationPage user={user} />
          )}
          {currentTab === 'datasets' && (
            <DatasetManagementPage user={user} onDatasetImported={fetchAlertsCount} />
          )}
          {currentTab === 'audit' && (
            <SettingsAuditPage user={user} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
