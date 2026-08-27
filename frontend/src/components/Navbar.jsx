import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Link2, Search, PlusCircle, MessageSquare, Bell, User, LogOut, Package, HelpCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchCounts = async () => {
        try {
          const [notifRes, convRes] = await Promise.all([
            api.get('/notifications'),
            api.get('/conversations')
          ]);
          setUnreadNotifications(notifRes.data.unreadCount || 0);
          const msgCount = convRes.data.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
          setUnreadMessages(msgCount);
        } catch (err) {
          // Silent ignore error
        }
      };
      fetchCounts();
      const interval = setInterval(fetchCounts, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
              <Link2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-gray-900">
                Lost<span className="text-blue-600">Link</span>
              </span>
              <span className="block text-[10px] font-semibold text-gray-400 -mt-1 tracking-wider uppercase">
                Anurag University
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          {isAuthenticated ? (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/dashboard') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/search"
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/search') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Search className="w-4 h-4" />
                Find Item
              </Link>
              <Link
                to="/report-found"
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/report-found') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Report Found
              </Link>
              <Link
                to="/my-posts"
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/my-posts') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Package className="w-4 h-4" />
                My Posts
              </Link>
            </nav>
          ) : (
            <nav className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                How It Works
              </a>
              <a href="#why-lostlink" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Why LostLink
              </a>
            </nav>
          )}

          {/* Right Action Icons & User Dropdown */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Messages Icon */}
                <Link
                  to="/messages"
                  className="relative p-2 rounded-full text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                  title="Messages"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadMessages}
                    </span>
                  )}
                </Link>

                {/* Notifications Icon */}
                <Link
                  to="/notifications"
                  className="relative p-2 rounded-full text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </Link>

                {/* Profile Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="hidden sm:inline-block text-sm font-semibold text-gray-700">
                      {user?.name ? user.name.split(' ')[0] : 'Student'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 fade-in">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider">
                          Roll: {user?.rollNumber} • Sec: {user?.section}
                        </span>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        My Profile
                      </Link>
                      <Link
                        to="/my-posts"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        <Package className="w-4 h-4 text-gray-400" />
                        My Posts & Requests
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium text-left border-t border-gray-100 mt-1"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
