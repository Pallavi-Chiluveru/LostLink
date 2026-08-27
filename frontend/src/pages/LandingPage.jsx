import React from 'react';
import { Link } from 'react-router-dom';
import { Search, PlusCircle, ShieldCheck, Cpu, MessageSquare, CheckCircle2, ArrowRight, Link2, MapPin, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 text-blue-800 text-xs font-bold mb-6 border border-blue-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Anurag University's Official Lost & Found Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight max-w-4xl mx-auto mb-6">
            Lost something on campus? <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Search. Verify. Connect. Recover.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 font-normal leading-relaxed">
            LostLink securely connects Anurag University students with items they have lost or found. No spam. No leaked phone numbers. Pure intelligent returns.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
            <Link
              to={isAuthenticated ? "/search" : "/login"}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5"
            >
              <Search className="w-5 h-5 stroke-[2.5]" />
              Find My Item
            </Link>
            <Link
              to={isAuthenticated ? "/report-found" : "/login"}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-base border border-gray-300 shadow-sm flex items-center justify-center gap-2.5 transition-all"
            >
              <PlusCircle className="w-5 h-5 text-blue-600 stroke-[2.5]" />
              Report Found Item
            </Link>
          </div>

          {/* Trust Indicators Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-gray-200/60">
            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur border border-gray-200/80 shadow-xs flex flex-col items-center">
              <span className="text-2xl mb-1">🎓</span>
              <span className="text-sm font-bold text-gray-900">University Only</span>
              <span className="text-xs text-gray-500">@anurag.edu.in accounts</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur border border-gray-200/80 shadow-xs flex flex-col items-center">
              <span className="text-2xl mb-1">🔐</span>
              <span className="text-sm font-bold text-gray-900">Secure Verification</span>
              <span className="text-xs text-gray-500">Secret answer checks</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur border border-gray-200/80 shadow-xs flex flex-col items-center">
              <span className="text-2xl mb-1">🤖</span>
              <span className="text-sm font-bold text-gray-900">Smart Matching</span>
              <span className="text-xs text-gray-500">Instant % similarity</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur border border-gray-200/80 shadow-xs flex flex-col items-center">
              <span className="text-2xl mb-1">💬</span>
              <span className="text-sm font-bold text-gray-900">Private Chat</span>
              <span className="text-xs text-gray-500">Verification gated</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Workflow</h2>
            <p className="text-3xl font-extrabold text-gray-900">How LostLink Works</p>
            <p className="text-gray-600 mt-2">A simple 5-step lifecycle designed for Anurag University students.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center text-center relative group hover:border-blue-500 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-black text-lg flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Search</h3>
              <p className="text-xs text-gray-500">Search active found posts by brand, category, and campus location.</p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center text-center relative group hover:border-blue-500 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-black text-lg flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Match</h3>
              <p className="text-xs text-gray-500">Smart engine scores item similarity (e.g. 92% HIGH MATCH).</p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center text-center relative group hover:border-blue-500 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-black text-lg flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Verify</h3>
              <p className="text-xs text-gray-500">Answer private verification questions set by the finder.</p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center text-center relative group hover:border-blue-500 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-black text-lg flex items-center justify-center mb-4">
                4
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Connect</h3>
              <p className="text-xs text-gray-500">Once verified, 1-on-1 private chat unlocks automatically.</p>
            </div>

            {/* Step 5 */}
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center text-center relative group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center mb-4 shadow-md">
                5
              </div>
              <h3 className="text-base font-bold text-emerald-900 mb-1">Recover</h3>
              <p className="text-xs text-emerald-700">Meet safely on campus, return item, and mark DELIVERED.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why LostLink Section */}
      <section id="why-lostlink" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">The Problem We Solve</span>
              <h2 className="text-3xl font-extrabold text-gray-900 mt-2 mb-6">
                No more buried WhatsApp messages or fake claimers.
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                College WhatsApp groups get flooded with lost item notices that get buried in minutes. Finders receive messages from random people claiming items without proof.
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-700 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Zero Public Contact Leakage:</strong> Phone numbers are never published.</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Secret Ownership Checks:</strong> Claimants must know details only the owner knows.</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Automated Missing Watcher:</strong> Notifies you the moment a matching item is posted.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-lg relative">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900">Black Noise Smartwatch</h4>
                  <p className="text-xs text-blue-600 font-bold">92% HIGH MATCH</p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 text-xs font-semibold text-emerald-900 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Ownership Verified: Secret Answer matched ("Batman wallpaper")</span>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-xs text-gray-600 space-y-2">
                <div className="flex justify-start">
                  <span className="bg-white border px-3 py-2 rounded-xl text-gray-800 font-medium">Hi! I lost this watch in Central Library.</span>
                </div>
                <div className="flex justify-end">
                  <span className="bg-blue-600 text-white px-3 py-2 rounded-xl font-medium">Ownership verified! Let's meet at Library entrance.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
