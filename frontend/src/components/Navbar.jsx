import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, PlusCircle, MessageSquare, Bell, User, LogOut, Package, ChevronDown, ArrowRight, Home, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const visibleSections = useRef(new Map());

  // Notifications logic
  useEffect(() => {
    if (isAuthenticated) {
      const fetchCounts = async () => {
        if (document.hidden) return;
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

  const scrollToTarget = (sectionId = '') => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.requestAnimationFrame(() => {
      if (!sectionId) {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        return;
      }

      document.getElementById(sectionId)?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  };

  const navigateToSection = (sectionId) => {
    setUserDropdownOpen(false);
    if (location.pathname === '/') {
      navigate({ pathname: '/', hash: `#${sectionId}` });
      scrollToTarget(sectionId);
    } else {
      navigate({ pathname: '/', hash: `#${sectionId}` });
    }
  };

  const handleLogoClick = (event) => {
    event.preventDefault();
    navigate('/', { replace: location.pathname === '/' });
    setActiveSection('');
    scrollToTarget();
  };

  // Hash navigation works both on initial load and after navigating from another route.
  useEffect(() => {
    if (location.pathname !== '/') return;
    const sectionId = location.hash.slice(1);
    if (!['how-it-works', 'why-lostlink'].includes(sectionId)) {
      if (!location.hash) setActiveSection('');
      return;
    }
    const frame = window.requestAnimationFrame(() => scrollToTarget(sectionId));
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  // IntersectionObserver scroll-spy for landing page sections.
  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('');
      return;
    }

    const sections = ['how-it-works', 'why-lostlink']
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    visibleSections.current.clear();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visibleSections.current.set(entry.target.id, entry.isIntersecting));
      const visible = sections.filter((section) => visibleSections.current.get(section.id));
      setActiveSection(visible.length ? visible[visible.length - 1].id : '');
    }, {
      rootMargin: '-64px 0px -52% 0px',
      threshold: [0, 0.05, 0.25]
    });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [location.pathname]);

  const handleLogout = () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  const authenticatedLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/search', label: 'Find Item', icon: Search },
    { to: '/report-found', label: 'Report Found', icon: PlusCircle },
    { to: '/my-posts', label: 'My Posts', icon: Package }
  ];

  const SectionLink = ({ sectionId, children, compact = false }) => {
    const active = activeSection === sectionId;
    return (
      <button
        type="button"
        onClick={() => navigateToSection(sectionId)}
        className={`nav-section-link ${compact ? 'nav-section-link-compact' : ''} ${active ? 'nav-section-link-active' : ''}`}
        aria-current={active ? 'location' : undefined}
      >
        {children}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-50 navbar-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid h-16 sm:h-[68px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          {/* Logo */}
          <Link
            to="/"
            onClick={handleLogoClick}
            className="col-start-1 flex items-center shrink-0 justify-self-start"
            aria-label="Go to LostLink home"
          >
            <BrandLogo className="!h-10 sm:!h-11 object-contain" />
          </Link>

          {/* Navigation Links */}
          {isAuthenticated ? (
            <nav className="col-start-2 hidden lg:flex items-center gap-1 justify-self-center" aria-label="Primary navigation">
              {authenticatedLinks.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} aria-current={isActive(to) ? 'page' : undefined} className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${isActive(to) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                  {Icon && <Icon className="w-4 h-4" />}{label}
                </Link>
              ))}
            </nav>
          ) : (
            <nav className="col-start-2 hidden md:flex items-center gap-6 justify-self-center">
              <SectionLink sectionId="how-it-works">How It Works</SectionLink>
              <SectionLink sectionId="why-lostlink">Why LostLink</SectionLink>
            </nav>
          )}

          {/* Right Action Icons & User Dropdown */}
          <div className="col-start-3 justify-self-end flex items-center gap-1 sm:gap-2">
            {isAuthenticated ? (
              <>
                {/* Messages Icon */}
                <Link
                  to="/messages"
                  className={`relative p-2 rounded-full transition-colors ${isActive('/messages') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'}`}
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
                  className={`relative p-2 rounded-full transition-colors ${isActive('/notifications') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'}`}
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
                    className={`flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none ${isActive('/profile') ? 'bg-blue-50' : ''}`}
                    aria-expanded={userDropdownOpen}
                    aria-haspopup="menu"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="hidden sm:inline-block text-sm font-semibold text-gray-700">
                      {user?.name ? user.name.split(' ')[0] : 'Student'}
                    </span>
                    <ChevronDown className={`hidden sm:block w-4 h-4 text-gray-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
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
                <button type="button" onClick={() => setMobileMenuOpen(open => !open)} className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Toggle navigation menu" aria-expanded={mobileMenuOpen}>
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
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
                  className="px-4 py-2 rounded-xl text-sm font-semibold gradient-register text-white electric-glow-dual hover:-translate-y-0.5 transition-transform flex items-center gap-1 group"
                >
                  Register
                  <ArrowRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            )}
          </div>
        </div>
        {isAuthenticated ? mobileMenuOpen && (
          <nav className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-1 pb-3 border-t border-gray-100 pt-2" aria-label="Mobile primary navigation">
            {authenticatedLinks.map(({ to, label, icon: Icon }) => <Link key={to} to={to} aria-current={isActive(to) ? 'page' : undefined} className={`px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 ${isActive(to) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>{Icon && <Icon className="w-4 h-4" />}{label}</Link>)}
          </nav>
        ) : (
          <nav className="md:hidden grid grid-cols-2 gap-2 pb-2" aria-label="Landing page sections">
            <SectionLink compact sectionId="how-it-works">How It Works</SectionLink>
            <SectionLink compact sectionId="why-lostlink">Why LostLink</SectionLink>
          </nav>
        )}
      </div>
    </header>
  );
}
