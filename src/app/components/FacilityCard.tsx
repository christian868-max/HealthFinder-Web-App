import { 
  MapPin, 
  Clock, 
  Star, 
  Phone, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Building2,
  CalendarCheck
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Facility } from '../types/facility';

interface FacilityCardProps {
  facility: Facility;
  onBookAppointment?: (facility: Facility) => void;
}

export function FacilityCard({ facility, onBookAppointment }: FacilityCardProps) {
  const getCrowdColor = (level: string) => {
    switch (level) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Hospital': return 'bg-blue-100 text-blue-800';
      case 'Clinic': return 'bg-purple-100 text-purple-800';
      case 'Urgent Care': return 'bg-orange-100 text-orange-800';
      case 'Specialized Center': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left Section */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {facility.name}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getTypeColor(facility.type)}>
                  {facility.type}
                </Badge>
                {facility.emergencyServices && (
                  <Badge className="bg-red-100 text-red-800">
                    24/7 Emergency
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Star className="size-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{facility.rating}</span>
            </div>
          </div>

          {/* Location & Distance */}
          <div className="flex items-start gap-2 mb-2 text-gray-600">
            <MapPin className="size-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{facility.address} • {facility.distance} km away</span>
          </div>

          {/* Operating Hours */}
          <div className="flex items-center gap-2 mb-3 text-gray-600">
            <Clock className="size-4 flex-shrink-0" />
            <span className="text-sm">{facility.operatingHours}</span>
          </div>

          {/* Capabilities */}
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-700 mb-1">Capabilities:</p>
            <div className="flex flex-wrap gap-1">
              {facility.capabilities.map((capability, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {capability}
                </Badge>
              ))}
            </div>
          </div>

          {/* Specialties */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Specialties:</p>
            <div className="flex flex-wrap gap-1">
              {facility.specialties.map((specialty, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Right Section - Availability Info */}
        <div className="md:w-64 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
          <div className="space-y-4">
            {/* Availability Status */}
            <div>
              {facility.availableToday ? (
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <CheckCircle className="size-5" />
                  <span className="font-semibold">Available Today</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <AlertCircle className="size-5" />
                  <span className="font-semibold">Not Available Today</span>
                </div>
              )}
              <p className="text-sm text-gray-600">
                Next available: {facility.nextAvailable}
              </p>
            </div>

            {/* Wait Time */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Estimated wait time</p>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-gray-500" />
                <span className="text-lg font-semibold">{facility.waitTime} min</span>
              </div>
            </div>

            {/* Crowd Level */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Current crowd level</p>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-gray-500" />
                <Badge className={getCrowdColor(facility.crowdLevel)}>
                  {facility.crowdLevel}
                </Badge>
              </div>
            </div>

            {/* Contact */}
            <div className="pt-2 border-t">
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <a href={`tel:${facility.phoneNumber}`}>
                  <Phone className="size-4" />
                  Call Now
                </a>
              </Button>
            </div>

            {/* Book Appointment */}
            {onBookAppointment && (
              <div>
                <Button 
                  className="w-full justify-start gap-2" 
                  onClick={() => onBookAppointment(facility)}
                >
                  <CalendarCheck className="size-4" />
                  Book Appointment
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}