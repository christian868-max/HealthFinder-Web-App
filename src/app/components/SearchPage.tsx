import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Heart, Activity, Stethoscope, User, LogOut, CalendarCheck, ChevronDown } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { commonIllnesses } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export function SearchPage() {
  const [illness, setIllness] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const handleLogOut = () => {
    setIsAccountMenuOpen(false);
    signOut();
    navigate('/signin');
  };

  const handleViewAppointments = () => {
    setIsAccountMenuOpen(false);
    navigate('/appointments');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (value: string) => {
    setIllness(value);
    if (value.length > 0) {
      const filtered = commonIllnesses.filter(item =>
        item.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const handleSearch = (searchTerm?: string) => {
    const term = searchTerm || illness;
    if (term.trim()) {
      navigate(`/results?illness=${encodeURIComponent(term)}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="size-8 text-blue-600" />
              <h1 className="text-2xl font-semibold text-gray-900">HealthFinder</h1>
            </div>

            {/* User Menu */}
            <div className="relative" ref={accountMenuRef}>
              <Button
                variant="outline"
                className="gap-2 rounded-full px-4"
                onClick={() => setIsAccountMenuOpen((prev) => !prev)}
              >
                <User className="size-5" />
                <span className="hidden sm:inline">{user?.name || 'Account'}</span>
                <ChevronDown className="size-4 text-gray-500" />
              </Button>
              {isAccountMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-md border bg-white p-1 shadow-lg z-50">
                  <div className="px-2 py-1.5 text-sm font-medium text-gray-900">My Account</div>
                  <div className="my-1 h-px bg-gray-200" />
                  <button
                    type="button"
                    onClick={handleViewAppointments}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
                  >
                    <CalendarCheck className="size-4" />
                    My Appointments
                  </button>
                  <button
                    type="button"
                    onClick={handleLogOut}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="size-4" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 bg-blue-100 rounded-full mb-4">
            <Stethoscope className="size-8 text-blue-600" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Find the Right Healthcare Facility
          </h2>
          <p className="text-lg text-gray-600">
            Search for clinics and hospitals based on your health needs
          </p>
        </div>

        {/* Search Box */}
        <Card className="p-6 shadow-lg">
          <div className="relative">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Enter your illness or symptoms (e.g., fever, cough, chest pain)"
                  value={illness}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button
                onClick={() => handleSearch()}
                size="lg"
                className="px-8"
              >
                Search
              </Button>
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-20">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setIllness(suggestion);
                      setSuggestions([]);
                      handleSearch(suggestion);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b last:border-b-0"
                  >
                    <Heart className="size-4 text-blue-500" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Quick Access Buttons */}
        <div className="mt-8">
          <p className="text-sm text-gray-600 mb-3">Common searches:</p>
          <div className="flex flex-wrap gap-2">
            {commonIllnesses.slice(0, 8).map((item) => (
              <Button
                key={item}
                variant="outline"
                size="sm"
                onClick={() => {
                  setIllness(item);
                  handleSearch(item);
                }}
                className="rounded-full"
              >
                {item}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 text-center">
            <div className="inline-flex items-center justify-center size-12 bg-green-100 rounded-full mb-4">
              <Activity className="size-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">Real-time Availability</h3>
            <p className="text-sm text-gray-600">
              Check current wait times and facility crowdedness
            </p>
          </Card>
          <Card className="p-6 text-center">
            <div className="inline-flex items-center justify-center size-12 bg-purple-100 rounded-full mb-4">
              <Search className="size-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Location Based</h3>
            <p className="text-sm text-gray-600">
              Find facilities near you with distance information
            </p>
          </Card>
          <Card className="p-6 text-center">
            <div className="inline-flex items-center justify-center size-12 bg-orange-100 rounded-full mb-4">
              <Stethoscope className="size-6 text-orange-600" />
            </div>
            <h3 className="font-semibold mb-2">Specialized Care</h3>
            <p className="text-sm text-gray-600">
              Match with facilities that can treat your specific condition
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}