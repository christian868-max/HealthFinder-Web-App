import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, SlidersHorizontal, MapPin, Clock, Users, Building2, User, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { FacilityCard } from './FacilityCard';
import { BookingDialog } from './BookingDialog';
import { mockFacilities, illnessToSpecialtyMap } from '../data/mockData';
import { Facility, FacilityType, CrowdLevel } from '../types/facility';
import { useAuth } from '../context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const illness = searchParams.get('illness') || '';
  const { user, isAuthenticated, signOut } = useAuth();

  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCrowd, setSelectedCrowd] = useState<string>('all');
  const [maxDistance, setMaxDistance] = useState<number[]>([10]);
  const [sortBy, setSortBy] = useState<string>('distance');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const handleBookAppointment = (facility: Facility) => {
    setSelectedFacility(facility);
    setIsBookingOpen(true);
  };

  // Filter and sort facilities
  const filteredFacilities = useMemo(() => {
    let results = [...mockFacilities];

    // Filter by illness/specialty
    const relevantSpecialties = illnessToSpecialtyMap[illness] || [];
    if (relevantSpecialties.length > 0) {
      results = results.map(facility => {
        const matchScore = facility.specialties.filter(s => 
          relevantSpecialties.some(rs => rs.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(rs.toLowerCase()))
        ).length;
        return { ...facility, matchScore };
      });
      // Prioritize but don't exclude facilities
      results.sort((a, b) => (b as any).matchScore - (a as any).matchScore);
    }

    // Filter by facility type
    if (selectedType !== 'all') {
      results = results.filter(f => f.type === selectedType);
    }

    // Filter by crowd level
    if (selectedCrowd !== 'all') {
      results = results.filter(f => f.crowdLevel === selectedCrowd);
    }

    // Filter by distance
    results = results.filter(f => f.distance <= maxDistance[0]);

    // Sort results
    switch (sortBy) {
      case 'distance':
        results.sort((a, b) => a.distance - b.distance);
        break;
      case 'wait-time':
        results.sort((a, b) => a.waitTime - b.waitTime);
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'crowd':
        const crowdOrder = { 'Low': 0, 'Moderate': 1, 'High': 2 };
        results.sort((a, b) => crowdOrder[a.crowdLevel] - crowdOrder[b.crowdLevel]);
        break;
    }

    return results;
  }, [illness, selectedType, selectedCrowd, maxDistance, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold">
                  Results for "{illness}"
                </h1>
                <p className="text-sm text-gray-600">
                  Found {filteredFacilities.length} facilities
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <aside className={`lg:w-80 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <Card className="p-6 sticky top-24">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <SlidersHorizontal className="size-5" />
                Filter & Sort
              </h2>

              <div className="space-y-6">
                {/* Sort By */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Sort by</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distance">Nearest First</SelectItem>
                      <SelectItem value="wait-time">Shortest Wait Time</SelectItem>
                      <SelectItem value="rating">Highest Rating</SelectItem>
                      <SelectItem value="crowd">Least Crowded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Distance Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <MapPin className="size-4" />
                    Max Distance: {maxDistance[0]} km
                  </label>
                  <Slider
                    value={maxDistance}
                    onValueChange={setMaxDistance}
                    min={1}
                    max={20}
                    step={0.5}
                    className="mt-2"
                  />
                </div>

                {/* Facility Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Building2 className="size-4" />
                    Facility Type
                  </label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Hospital">Hospital</SelectItem>
                      <SelectItem value="Clinic">Clinic</SelectItem>
                      <SelectItem value="Urgent Care">Urgent Care</SelectItem>
                      <SelectItem value="Specialized Center">Specialized Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Crowd Level */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Users className="size-4" />
                    Crowd Level
                  </label>
                  <Select value={selectedCrowd} onValueChange={setSelectedCrowd}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reset Filters */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedType('all');
                    setSelectedCrowd('all');
                    setMaxDistance([10]);
                    setSortBy('distance');
                  }}
                >
                  Reset Filters
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-medium mb-3">Quick Stats</p>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Available Now:</span>
                    <span className="font-semibold text-green-600">
                      {filteredFacilities.filter(f => f.nextAvailable === 'Now').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>24/7 Emergency:</span>
                    <span className="font-semibold">
                      {filteredFacilities.filter(f => f.emergencyServices).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low Crowd:</span>
                    <span className="font-semibold text-green-600">
                      {filteredFacilities.filter(f => f.crowdLevel === 'Low').length}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </aside>

          {/* Results List */}
          <main className="flex-1">
            {filteredFacilities.length > 0 ? (
              <div className="space-y-4">
                {filteredFacilities.map((facility) => (
                  <FacilityCard key={facility.id} facility={facility} onBookAppointment={handleBookAppointment} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <Building2 className="size-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No facilities found</h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your filters or search for a different condition
                  </p>
                  <Button onClick={() => navigate('/')}>
                    New Search
                  </Button>
                </div>
              </Card>
            )}
          </main>
        </div>
      </div>

      {/* Booking Dialog */}
      <BookingDialog
        facility={selectedFacility}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
      />
    </div>
  );
}