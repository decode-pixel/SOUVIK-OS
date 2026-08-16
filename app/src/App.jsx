import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './supabaseClient';
import { today } from './lib/date';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Checkin from './pages/Checkin';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Health from './pages/Health';
import Finance from './pages/Finance';
import Tasks from './pages/Tasks';
import Projects from './pages/Projects';
import Goals from './pages/Goals';
import More from './pages/More';
import Auth from './pages/Auth';
import Review from './pages/Review';
import NotFound from './pages/NotFound';
import PWAPrompt from './components/PWAPrompt';
import OfflineIndicator from './components/OfflineIndicator';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Loading Authentication...</div>;
  if (!user) return <Navigate to="/auth" />;
  
  return children;
}

function ThemeProvider({ children }) {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('theme_preference').eq('id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data?.theme_preference) {
            document.documentElement.setAttribute('data-theme', data.theme_preference);
          }
        });
    }
  }, [user]);

  return children;
}

function NotificationEngine() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window)) return;

    let intervalId;

    const checkAndNotify = async () => {
      try {
        const { data: settings } = await supabase.from('settings').select('notification_prefs').eq('user_id', user.id).maybeSingle();
        const prefs = settings?.notification_prefs || {};
        
        if (!prefs.checkin_reminder) return;
        
        const now = new Date();
        const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const start = prefs.window_start || "20:00";
        const end = prefs.window_end || "22:00";
        
        // We only notify if the window is currently active and check-in is pending
        // Added a sessionStorage flag so we don't spam them every 15 mins if they ignore it, maybe just once per session?
        // Let's stick to the simplest version first: it will notify every 15m inside the window until done.
        
        if (currentTimeStr >= start && currentTimeStr <= end) {
          const todayStr = today();
          const { data: checkin } = await supabase.from('daily_checkins').select('id').eq('user_id', user.id).eq('date', todayStr).maybeSingle();
          
          if (!checkin) {
            if (Notification.permission === "granted") {
              new Notification("Souvik OS", { body: "Time for your daily check-in!" });
            } else if (Notification.permission !== "denied") {
              const permission = await Notification.requestPermission();
              if (permission === "granted") {
                new Notification("Souvik OS", { body: "Time for your daily check-in!" });
              }
            }
          }
        }
      } catch (err) {
        console.error('Notification error:', err);
      }
    };

    // Check once immediately, then every 15 minutes
    checkAndNotify();
    intervalId = setInterval(checkAndNotify, 15 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <OfflineIndicator />
          <PWAPrompt />
          <NotificationEngine />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              
              <Route path="/" element={<ProtectedRoute><ErrorBoundary><Layout /></ErrorBoundary></ProtectedRoute>}>
                <Route index element={<Home />} />
                <Route path="checkin" element={<Checkin />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
                <Route path="more" element={<More />} />
                
                <Route path="health" element={<Health />} />
                <Route path="finance" element={<Finance />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="projects" element={<Projects />} />
                <Route path="goals" element={<Goals />} />
                <Route path="review" element={<Review />} />
              </Route>

              {/* Friendly redirect for /dashboard to / */}
              <Route path="/dashboard" element={<Navigate to="/" replace />} />

              {/* Catch-all 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
