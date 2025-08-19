import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import StudentLogin from './pages/StudentLogin';
import StudentRegister from './pages/StudentRegister';
import Dashboard from './pages/Dashboard';
import TakeTest from './pages/TakeTest';
import PublicResults from './pages/PublicResults';
import './App.css';
import './index.css';

function StudentApp() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#10b981',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />
          <Routes>
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/register" element={<StudentRegister />} />
            <Route path="/results" element={<PublicResults />} />
            <Route path="/login" element={<Navigate to="/student/login" replace />} />
            <Route path="/register" element={<Navigate to="/student/register" replace />} />
            <Route 
              path="/student/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/test/:testId" 
              element={
                <ProtectedRoute>
                  <TakeTest />
                </ProtectedRoute>
              } 
            />
            <Route path="/student" element={<Navigate to="/student/login" replace />} />
            <Route path="/" element={<Navigate to="/student/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default StudentApp;
