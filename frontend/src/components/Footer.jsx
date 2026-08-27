import React from 'react';
import { Link2, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900">LostLink</span>
              <p className="text-xs text-gray-500">Find What Matters. Return What Belongs.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <ShieldCheck className="w-3.5 h-3.5" /> Anurag University Exclusive
            </span>
            <span>Privacy Preserved</span>
            <span>Verifiable Returns</span>
          </div>

          <div className="text-xs text-gray-400 text-center md:text-right">
            <p>© {new Date().getFullYear()} LostLink — Anurag University Hackathon Project.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
