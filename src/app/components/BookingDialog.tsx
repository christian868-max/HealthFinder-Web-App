import { useState } from 'react';
import { Calendar, Clock, User, Mail, Phone, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Facility } from '../types/facility';
import { useAuth } from '../context/AuthContext';

interface BookingDialogProps {
  facility: Facility | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BookingDialog({ facility, isOpen, onClose }: BookingDialogProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [reason, setReason] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Generate available dates (next 7 days)
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      value: date.toISOString().split('T')[0],
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      date: date,
    };
  });

  // Generate time slots based on facility operating hours
  const generateTimeSlots = () => {
    if (!facility) return [];
    
    const slots = [];
    const is24Hour = facility.operatingHours === '24/7';
    
    if (is24Hour) {
      // For 24/7 facilities, show slots throughout the day
      for (let hour = 0; hour < 24; hour++) {
        for (let minute of [0, 30]) {
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          const time = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
          const isPast = selectedDate === availableDates[0].value && 
            new Date().getHours() > hour || 
            (new Date().getHours() === hour && new Date().getMinutes() > minute);
          
          if (!isPast || selectedDate !== availableDates[0].value) {
            slots.push(time);
          }
        }
      }
    } else {
      // Parse operating hours (e.g., "8:00 AM - 10:00 PM")
      const [start, end] = facility.operatingHours.split(' - ');
      const startHour = parseInt(start.includes('PM') && !start.includes('12') ? 
        start.split(':')[0] : start.split(':')[0]) + (start.includes('PM') && !start.includes('12:') ? 12 : 0);
      const endHour = parseInt(end.includes('PM') && !end.includes('12') ? 
        end.split(':')[0] : end.split(':')[0]) + (end.includes('PM') && !end.includes('12:') ? 12 : 0);
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute of [0, 30]) {
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          const time = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
          const isPast = selectedDate === availableDates[0].value && 
            new Date().getHours() > hour || 
            (new Date().getHours() === hour && new Date().getMinutes() > minute);
          
          if (!isPast || selectedDate !== availableDates[0].value) {
            slots.push(time);
          }
        }
      }
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const formatPhoneForDisplay = (value: string) => {
    // Keep only common phone characters and limit length.
    return value.replace(/[^\d+\-()\s]/g, '').slice(0, 20);
  };

  const hasValidPhoneNumber = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidPhoneNumber(patientPhone)) {
      setPhoneError('Please enter a valid phone number with 10 to 15 digits.');
      return;
    }

    setPhoneError('');
    setIsLoading(true);
    
    const newAppointment = {
      userId: user?.id ?? null,
      userEmail: user?.email ?? patientEmail,
      patientName,
      patientEmail,
      patientPhone,
      reason,
      facilityName: facility.name,
      facilityAddress: facility.address,
      facilityPhone: facility.phoneNumber,
      selectedDate,
      selectedTime,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '';
    if (apiBaseUrl) {
      try {
        await fetch(`${apiBaseUrl}/api/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAppointment),
        });
      } catch (err) {
        console.warn('API error, falling back to local storage', err);
        const storedAppointments = localStorage.getItem('healthfinder_appointments');
        const appointments = storedAppointments ? JSON.parse(storedAppointments) : [];
        appointments.push({ ...newAppointment, id: Date.now().toString() });
        localStorage.setItem('healthfinder_appointments', JSON.stringify(appointments));
      }
    } else {
      const storedAppointments = localStorage.getItem('healthfinder_appointments');
      const appointments = storedAppointments ? JSON.parse(storedAppointments) : [];
      appointments.push({ ...newAppointment, id: Date.now().toString() });
      localStorage.setItem('healthfinder_appointments', JSON.stringify(appointments));
    }

    setIsLoading(false);
    setIsBooked(true);
    
    // Reset after showing confirmation
    setTimeout(() => {
      handleClose();
    }, 3000);
  };

  const handleClose = () => {
    setSelectedDate('');
    setSelectedTime('');
    setPatientName('');
    setPatientEmail('');
    setPatientPhone('');
    setPhoneError('');
    setReason('');
    setIsBooked(false);
    onClose();
  };

  if (!facility) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!isBooked ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Book Appointment</DialogTitle>
              <DialogDescription>
                Schedule your visit to {facility.name}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {/* Date Selection */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Calendar className="size-4" />
                  Select Date
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {availableDates.map((date) => (
                    <button
                      key={date.value}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date.value);
                        setSelectedTime(''); // Reset time when date changes
                      }}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedDate === date.value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {date.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slot Selection */}
              {selectedDate && (
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Clock className="size-4" />
                    Select Time Slot
                  </Label>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          selectedTime === time
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Patient Information */}
              {selectedDate && selectedTime && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="size-4" />
                    Patient Information
                  </h3>

                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => {
                        setPatientPhone(formatPhoneForDisplay(e.target.value));
                        if (phoneError) {
                          setPhoneError('');
                        }
                      }}
                      placeholder="+63 9XX XXX XXXX or 09XXXXXXXXX"
                      inputMode="tel"
                      required
                      className="mt-1"
                    />
                    {phoneError ? (
                      <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                    ) : null}
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason for Visit</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Brief description of your symptoms or reason for appointment"
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Booking Summary */}
              {selectedDate && selectedTime && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-blue-900">Appointment Summary</h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p><strong>Facility:</strong> {facility.name}</p>
                    <p><strong>Date:</strong> {availableDates.find(d => d.value === selectedDate)?.label}</p>
                    <p><strong>Time:</strong> {selectedTime}</p>
                    <p><strong>Address:</strong> {facility.address}</p>
                    <p><strong>Phone:</strong> {facility.phoneNumber}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!selectedDate || !selectedTime || !patientName || !patientEmail || !patientPhone || isLoading}
                >
                  {isLoading ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center size-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="size-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Booking Confirmed!</h3>
            <p className="text-gray-600 mb-6">
              Your appointment has been successfully scheduled.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Facility:</span>
                  <span className="font-semibold">{facility.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold">
                    {availableDates.find(d => d.value === selectedDate)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-semibold">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Patient:</span>
                  <span className="font-semibold">{patientName}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              A confirmation email has been sent to {patientEmail}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}