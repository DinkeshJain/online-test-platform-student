import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { LogOut, User, Settings, Menu, X, Home } from 'lucide-react';

// Get the server base URL for static assets
const SERVER_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://online-test-platform-server-1q1h.onrender.com';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center flex-1 min-w-0">
            <Link to="/dashboard" className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-800 rounded-xl flex items-center justify-center mr-4 shadow-md">
                <span className="text-white font-bold text-lg">AU</span>
              </div>
              <div className="hidden lg:block">
                <span className="text-lg font-bold text-gray-900 leading-tight">
                  <span className="text-gray-900">Acharya Nagarjuna University</span>
                  <br />
                  <span className="text-sm text-green-600 font-semibold">Student Portal</span>
                </span>
              </div>
              <div className="block lg:hidden">
                <span className="text-xl font-bold text-gray-900">AU Student</span>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    isActive
                      ? "bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md flex items-center"
                      : "text-gray-700 hover:text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  }
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </NavLink>

                <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                  {user.studentPhoto ? (
                    <img
                      src={user.studentPhoto.startsWith('http') ? user.studentPhoto : `${SERVER_BASE_URL}/uploads/${user.studentPhoto}`}
                      alt="Profile"
                      className="h-8 w-8 rounded-full object-cover border-2 border-green-200"
                      onError={(e) => {
                        console.error('Failed to load profile photo:', user.studentPhoto);
                        console.error('Full photo URL:', e.target.src);
                        console.error('User object:', user);
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center border-2 border-green-200">
                      <span className="text-xs text-green-600 font-medium">{user.fullName?.charAt(0) || user.name?.charAt(0) || 'U'}</span>
                    </div>
                  )}
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-gray-500">{user.enrollmentNo}</span>
                    <span className="text-sm font-medium text-gray-900">{user.fullName || user.name}</span>
                  </div>
                  {isAdmin && (
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full ml-2">
                      Admin
                    </span>
                  )}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="p-2"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && user && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-4">
            <div className="flex items-center space-x-2 px-2">
              {user.studentPhoto ? (
                <img
                  src={user.studentPhoto.startsWith('http') ? user.studentPhoto : `${SERVER_BASE_URL}/uploads/${user.studentPhoto}`}
                  alt="Profile"
                  className="h-8 w-8 rounded-full object-cover border"
                  onError={(e) => {
                    console.error('Failed to load profile photo (mobile):', user.studentPhoto);
                    console.error('Full photo URL (mobile):', e.target.src);
                    console.error('User object (mobile):', user);
                  }}
                />
              ) : (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-xs text-gray-500">{user.fullName?.charAt(0) || user.name?.charAt(0) || 'U'}</span>
                </div>
              )}
              <div className="flex flex-col items-start">
                <span className="text-xs text-gray-500">{user.enrollmentNo}</span>
                <span className="text-sm font-medium">{user.fullName || user.name}</span>
              </div>
              {isAdmin && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded ml-2">
                  Admin
                </span>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="w-full justify-start"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

