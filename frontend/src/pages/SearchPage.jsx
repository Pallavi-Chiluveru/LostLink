import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Sparkles, FileText, Package, CheckCircle2, ArrowUpDown, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ItemCard from '../components/ItemCard';
import api from '../services/api';

const CATEGORIES = [
  'All', 'Smartphone', 'Laptop', 'Smartwatch', 'Watch', 'Earphones',
  'ID Card', 'Wallet', 'Keys', 'Bag', 'Books', 'Documents', 'Accessories', 'Clothing', 'Other'
];

export default function SearchPage() {
  const [searchParams] = useSearchParams();

  const [itemName, setItemName] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState('All');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [location, setLocation] = useState('');

  const [results, setResults] = useState([]);
  const [highMatchesCount, setHighMatchesCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (itemName) params.append('itemName', itemName);
      if (category && category !== 'All') params.append('category', category);
      if (brand) params.append('brand', brand);
      if (color) params.append('color', color);
      if (location) params.append('location', location);

      const res = await api.get(`/search?${params.toString()}`);
      setResults(res.data.results || []);
      setHighMatchesCount(res.data.highMatchesCount || 0);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [category]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Notice Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Smart Match Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Search Found Items
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-2xl font-medium">
              Someone may have already found your item on campus. Search LostLink to check instant match scores before creating a missing request.
            </p>
          </div>

          <Link
            to="/create-missing"
            className="px-5 py-3 rounded-2xl bg-white border border-blue-300 text-blue-700 font-bold text-xs shadow-sm hover:bg-blue-100 transition-all shrink-0 flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            + Create Missing Request
          </Link>
        </div>

        {/* Search & Filter Form */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Item Name / Keywords
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Black Noise Smartwatch"
                  className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Brand
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Noise, Apple"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all"
              >
                <Search className="w-4 h-4" />
                Find My Item
              </button>
            </div>
          </form>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-gray-100 no-scrollbar">
            <span className="text-[11px] font-bold text-gray-400 uppercase shrink-0">Quick Filter:</span>
            {CATEGORIES.slice(0, 8).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all ${
                  category === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
              Found Item Matches ({results.length})
            </h2>
            {highMatchesCount > 0 && (
              <p className="text-xs font-bold text-blue-600 mt-0.5">
                ⚡ {highMatchesCount} High Confidence Match(es) found!
              </p>
            )}
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-gray-200 h-64 animate-pulse p-4">
                <div className="w-full h-32 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center max-w-lg mx-auto space-y-4">
            <Package className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Couldn't find your item?</h3>
              <p className="text-xs text-gray-500 mt-1">
                No matching found items registered yet. Create a Missing Item Request and LostLink will continuously search for you.
              </p>
            </div>
            <Link
              to="/create-missing"
              className="py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all"
            >
              <FileText className="w-4 h-4" /> Create Missing Item Request
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {results.map((item) => (
              <ItemCard
                key={item._id}
                item={item}
                matchScore={item.matchScore}
                matchConfidence={item.confidence}
                matchReasons={item.reasons}
              />
            ))}
          </div>
        )}

        {/* Bottom Banner to Create Missing Request */}
        <div className="bg-gradient-to-r from-gray-900 to-blue-950 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <h3 className="text-xl font-extrabold mb-1">Still haven't found your belonging?</h3>
            <p className="text-xs text-gray-300">
              Create a Missing Request so LostLink's match engine alerts you automatically when a finder posts it.
            </p>
          </div>
          <Link
            to="/create-missing"
            className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shrink-0 transition-all"
          >
            Create Missing Request
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
