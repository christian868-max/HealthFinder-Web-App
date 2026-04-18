import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, CalendarDays, Clock3, Building2, Phone, FileText } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';

interface AppointmentRecord {
  id: string;
  userId: string | number | null;
  userEmail: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  reason: string;
  facilityName: string;
  facilityAddress: string;
  facilityPhone: string;
  selectedDate: string;
  selectedTime: string;
  status?: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}

export function AppointmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '';
      
      let allAppointments: AppointmentRecord[] = [];
      
      if (apiBaseUrl) {
        try {
          const res = await fetch(`${apiBaseUrl}/api/appointments`);
          if (res.ok) {
            allAppointments = await res.json();
          }
        } catch (err) {
          console.warn('API error, falling back to local storage', err);
          const raw = localStorage.getItem('healthfinder_appointments');
          allAppointments = raw ? JSON.parse(raw) : [];
        }
      } else {
        const raw = localStorage.getItem('healthfinder_appointments');
        allAppointments = raw ? JSON.parse(raw) : [];
      }

      const userAppts = allAppointments
        .filter((appointment) => appointment.userEmail === user?.email)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
      setAppointments(userAppts);
      setIsLoading(false);
    };

    if (user?.email) {
      fetchAppointments();
    } else {
      setAppointments([]);
      setIsLoading(false);
    }
  }, [user?.email]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2">
              <ArrowLeft className="size-4" />
              Home
            </Button>
            <h1 className="text-xl font-semibold">My Appointments</h1>
          </div>
          <Badge variant="secondary">{appointments.length} total</Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {isLoading ? (
          <Card className="p-10 text-center">
            <h2 className="text-lg font-semibold mb-2">Loading appointments...</h2>
          </Card>
        ) : appointments.length === 0 ? (
          <Card className="p-10 text-center">
            <CalendarDays className="size-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No appointments yet</h2>
            <p className="text-sm text-gray-600 mb-4">
              Book an appointment from the results page, then it will appear here.
            </p>
            <Button onClick={() => navigate('/')}>Find a Facility</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <Card key={appointment.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{appointment.facilityName}</h3>
                    <p className="text-sm text-gray-600">{appointment.facilityAddress}</p>
                  </div>
                  <Badge
                    variant={
                      appointment.status === 'confirmed'
                        ? 'secondary'
                        : appointment.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className={
                      appointment.status === 'confirmed'
                        ? 'relative overflow-hidden border-emerald-200 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.35)]'
                        : undefined
                    }
                  >
                    {appointment.status === 'confirmed' ? (
                      <>
                        <span className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/10 to-transparent pointer-events-none" />
                        <span className="relative">Confirmed</span>
                      </>
                    ) : appointment.status === 'rejected'
                      ? 'Rejected'
                      : 'Pending'}
                  </Badge>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-blue-600" />
                    <span>{appointment.selectedDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock3 className="size-4 text-blue-600" />
                    <span>{appointment.selectedTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-blue-600" />
                    <span>{appointment.patientName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-blue-600" />
                    <span>{appointment.facilityPhone}</span>
                  </div>
                  {appointment.reason ? (
                    <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-2">
                      <FileText className="size-4 text-blue-600" />
                      <span>{appointment.reason}</span>
                    </div>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
