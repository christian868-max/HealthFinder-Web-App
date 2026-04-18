import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CalendarDays, CheckCircle, XCircle, Building2, Plus, Users, Shield, UserCircle2, Trash2 } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useAuth } from '../context/AuthContext';
import { Facility, FacilityType } from '../types/facility';
import { getFacilities, saveFacilities } from '../storage/facilitiesStore';
import { LocalAccountSummary, listLocalAccounts, localSignUp, deleteLocalAccount } from '../auth/localAuth';

type AppointmentStatus = 'pending' | 'confirmed' | 'rejected';

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
  status?: AppointmentStatus;
  createdAt: string;
  updatedAt?: string;
}

function readAppointments(): AppointmentRecord[] {
  try {
    const raw = localStorage.getItem('healthfinder_appointments');
    const parsed = raw ? (JSON.parse(raw) as AppointmentRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAppointments(rows: AppointmentRecord[]) {
  localStorage.setItem('healthfinder_appointments', JSON.stringify(rows));
}

function makeFacilityDefaults(partial: Partial<Facility> & Pick<Facility, 'name' | 'type' | 'address'>): Facility {
  return {
    id: partial.id ?? `${Date.now()}`,
    name: partial.name,
    type: partial.type,
    address: partial.address,
    distance: partial.distance ?? 1,
    rating: partial.rating ?? 4.5,
    crowdLevel: partial.crowdLevel ?? 'Low',
    waitTime: partial.waitTime ?? 10,
    availableToday: partial.availableToday ?? true,
    nextAvailable: partial.nextAvailable ?? 'Now',
    capabilities: partial.capabilities ?? ['Consultation'],
    specialties: partial.specialties ?? ['General Medicine'],
    phoneNumber: partial.phoneNumber ?? '',
    operatingHours: partial.operatingHours ?? '8:00 AM - 5:00 PM',
    emergencyServices: partial.emergencyServices ?? false,
  };
}

export function AdminPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentRecord[]>(() =>
    readAppointments()
      .map((a) => ({ ...a, status: a.status ?? 'pending' }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );

  const refreshAppointments = () => {
    setAppointments(
      readAppointments()
        .map((a) => ({ ...a, status: a.status ?? 'pending' }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  };

  const pendingCount = useMemo(() => appointments.filter((a) => (a.status ?? 'pending') === 'pending').length, [appointments]);

  const setStatus = (id: string, status: AppointmentStatus) => {
    const next = readAppointments().map((a) =>
      a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a
    );
    writeAppointments(next);
    refreshAppointments();
  };

  const deleteAppointment = (id: string) => {
    const next = readAppointments().filter((a) => a.id !== id);
    writeAppointments(next);
    refreshAppointments();
  };

  // Facilities
  const [facilities, setFacilities] = useState<Facility[]>(() => getFacilities());
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>('Clinic');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [facilityPhone, setFacilityPhone] = useState('');
  const [facilityHours, setFacilityHours] = useState('8:00 AM - 5:00 PM');

  const saveFacilityList = (rows: Facility[]) => {
    saveFacilities(rows);
    setFacilities(rows);
  };

  const addFacility = () => {
    const created = makeFacilityDefaults({
      name: facilityName.trim(),
      type: facilityType,
      address: facilityAddress.trim(),
      phoneNumber: facilityPhone.trim(),
      operatingHours: facilityHours.trim() || '8:00 AM - 5:00 PM',
    });
    const next = [created, ...facilities];
    saveFacilityList(next);
    setFacilityName('');
    setFacilityAddress('');
    setFacilityPhone('');
  };

  // Accounts (local only)
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [accountMsg, setAccountMsg] = useState<string>('');
  const [accounts, setAccounts] = useState<LocalAccountSummary[]>([]);

  const fetchAccountsFromApi = async () => {
    const localAccounts = listLocalAccounts();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '';
    
    if (apiBaseUrl) {
      try {
        const res = await fetch(`${apiBaseUrl}/api/users`);
        if (res.ok) {
           const dbUsers = await res.json();
           const dbMapped = dbUsers.map((u: any) => ({
              id: u.id.toString(),
              name: u.name,
              email: u.email,
              role: u.role || 'user',
              isActive: false
           }));
           
           // Merge local accounts (which contains your Admins) with DB users
           const combined = [...localAccounts];
           dbMapped.forEach((dbUser: any) => {
             // Add the DB user if they aren't already in the local list
             if (!combined.some(c => c.email === dbUser.email)) {
               combined.push(dbUser);
             }
           });
           return combined;
        }
      } catch (e) {
        console.warn('Failed API /api/users. Falling back to local', e)
      }
    }
    return localAccounts;
  };

  const refreshAccounts = async () => {
    const data = await fetchAccountsFromApi();
    setAccounts(data);
  };

  const deleteAccount = async (email: string) => {
    if (!window.confirm(`Are you sure you want to delete ${email}?`)) return;

    deleteLocalAccount(email);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '';
    if (apiBaseUrl) {
      try {
        await fetch(`${apiBaseUrl}/api/users/${encodeURIComponent(email)}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('Failed API delete', e);
      }
    }

    refreshAccounts();
  };

  useMemo(() => { refreshAccounts(); }, []);

  const userAccounts = accounts.filter((a) => a.role === 'user');
  const adminAccounts = accounts.filter((a) => a.role === 'admin');

  const formatLastSeen = (value?: string) => {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString();
  };

  const createAccount = () => {
    setAccountMsg('');
    if (newPassword.length < 6) {
      setAccountMsg('Password must be at least 6 characters.');
      return;
    }
    const result = localSignUp(newName, newEmail, newPassword, newRole);
    if (!result.ok) {
      setAccountMsg('Email already exists.');
      return;
    }
    setAccountMsg(`Created ${newRole} account for ${result.user.email}`);
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('user');
    refreshAccounts();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              Admin Dashboard
              {pendingCount > 0 ? <Badge variant="secondary">{pendingCount} pending</Badge> : null}
            </h1>
            <p className="text-sm text-gray-600">Signed in as {user?.email}</p>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              signOut();
              navigate('/admin/signin');
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="appointments" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-xl">
            <TabsTrigger value="appointments" className="gap-2">
              <CalendarDays className="size-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="facilities" className="gap-2">
              <Building2 className="size-4" />
              Facilities
            </TabsTrigger>
            <TabsTrigger value="accounts" className="gap-2">
              <Users className="size-4" />
              Accounts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Appointment Requests</h2>
                <Button variant="outline" onClick={refreshAppointments}>
                  Refresh
                </Button>
              </div>

              {appointments.length === 0 ? (
                <p className="text-sm text-gray-600">No appointments found.</p>
              ) : (
                <div className="space-y-3">
                  {appointments.map((a) => (
                    <div key={a.id} className="border rounded-lg p-4 bg-white relative">
                      <div className="flex items-start justify-between gap-4 pb-4">
                        <div>
                          <p className="font-semibold">{a.facilityName}</p>
                          <p className="text-sm text-gray-600">{a.facilityAddress}</p>
                          <p className="text-sm text-gray-600">
                            {a.selectedDate} @ {a.selectedTime}
                          </p>
                          <p className="text-sm text-gray-600">
                            Patient: <span className="font-medium">{a.patientName}</span> ({a.patientEmail})
                          </p>
                          <p className="text-sm text-gray-600">Phone: {a.patientPhone}</p>
                          {a.reason ? <p className="text-sm text-gray-700 mt-2">{a.reason}</p> : null}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant={a.status === 'rejected' ? 'destructive' : 'secondary'}
                            className={
                              a.status === 'confirmed'
                                ? 'relative overflow-hidden border-emerald-200 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.35)]'
                                : undefined
                            }
                          >
                            {a.status === 'confirmed' ? (
                              <>
                                <span className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/10 to-transparent pointer-events-none" />
                                <span className="relative">Confirmed</span>
                              </>
                            ) : (
                              (a.status ?? 'pending')
                            )}
                          </Badge>

                          {a.status !== 'confirmed' && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                className="gap-2"
                                disabled={(a.status ?? 'pending') === 'confirmed'}
                                onClick={() => setStatus(a.id, 'confirmed')}
                              >
                                <CheckCircle className="size-4" />
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-2"
                                disabled={(a.status ?? 'pending') === 'rejected'}
                                onClick={() => setStatus(a.id, 'rejected')}
                              >
                                <XCircle className="size-4" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50 absolute bottom-3 right-3 shadow-none border-none hover:shadow-none"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this appointment?')) {
                            deleteAppointment(a.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="facilities">
            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="p-6 lg:col-span-1">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Plus className="size-4" />
                  Add Facility
                </h2>

                <div className="space-y-3">
                  <div>
                    <Label>Facility Name</Label>
                    <Input value={facilityName} onChange={(e) => setFacilityName(e.target.value)} placeholder="New clinic/hospital" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={facilityType} onValueChange={(v) => setFacilityType(v as FacilityType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hospital">Hospital</SelectItem>
                        <SelectItem value="Clinic">Clinic</SelectItem>
                        <SelectItem value="Urgent Care">Urgent Care</SelectItem>
                        <SelectItem value="Specialized Center">Specialized Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input value={facilityAddress} onChange={(e) => setFacilityAddress(e.target.value)} placeholder="Address" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={facilityPhone} onChange={(e) => setFacilityPhone(e.target.value)} placeholder="+63..." />
                  </div>
                  <div>
                    <Label>Operating Hours</Label>
                    <Input value={facilityHours} onChange={(e) => setFacilityHours(e.target.value)} placeholder="8:00 AM - 5:00 PM" />
                  </div>

                  <Button
                    className="w-full"
                    disabled={!facilityName.trim() || !facilityAddress.trim()}
                    onClick={addFacility}
                  >
                    Add Facility
                  </Button>
                </div>
              </Card>

              <Card className="p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">Current Facilities</h2>
                  <Badge variant="secondary">{facilities.length} total</Badge>
                </div>

                <div className="space-y-3">
                  {facilities.map((f) => (
                    <div key={f.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{f.name}</p>
                          <p className="text-sm text-gray-600">{f.type}</p>
                          <p className="text-sm text-gray-600">{f.address}</p>
                          {f.phoneNumber ? <p className="text-sm text-gray-600">Phone: {f.phoneNumber}</p> : null}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const next = facilities.filter((x) => x.id !== f.id);
                            saveFacilityList(next);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="accounts">
            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="p-6 lg:col-span-1">
                <h2 className="font-semibold text-lg mb-4">Create Account (Admin)</h2>
                <div className="space-y-3">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@example.com" />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="At least 6 characters" />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={newRole} onValueChange={(v) => setNewRole(v as 'user' | 'admin')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full" onClick={createAccount} disabled={!newName.trim() || !newEmail.trim() || !newPassword}>
                    Create Account
                  </Button>

                  {accountMsg ? <p className="text-sm font-medium text-gray-900">{accountMsg}</p> : null}
                </div>
              </Card>

              <Card className="p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">Registered Accounts</h2>
                  <Button size="sm" variant="outline" onClick={refreshAccounts}>
                    Refresh
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <UserCircle2 className="size-4 text-blue-600" />
                      <h3 className="font-semibold">Users</h3>
                      <Badge variant="secondary">{userAccounts.length}</Badge>
                    </div>

                    <div className="space-y-2">
                      {userAccounts.length === 0 ? (
                        <p className="text-sm text-gray-500">No user accounts yet.</p>
                      ) : (
                        userAccounts.map((account) => (
                          <div key={account.id} className="border rounded-lg p-3 bg-white">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm truncate">{account.name}</p>
                              <div className="flex items-center gap-1">
                                <Badge
                                  variant="secondary"
                                  className={
                                    account.isActive
                                      ? 'relative overflow-hidden border-emerald-200 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.35)]'
                                      : undefined
                                  }
                                >
                                  {account.isActive ? (
                                    <>
                                      <span className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/10 to-transparent pointer-events-none" />
                                      <span className="relative">Active</span>
                                    </>
                                  ) : (
                                    'Inactive'
                                  )}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                                  onClick={() => deleteAccount(account.email)}
                                  title="Delete account"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{account.email}</p>
                            <p className="text-xs text-gray-500 mt-1">Last seen: {formatLastSeen(account.lastActiveAt)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="size-4 text-blue-600" />
                      <h3 className="font-semibold">Admins</h3>
                      <Badge variant="secondary">{adminAccounts.length}</Badge>
                    </div>

                    <div className="space-y-2">
                      {adminAccounts.length === 0 ? (
                        <p className="text-sm text-gray-500">No admin accounts yet.</p>
                      ) : (
                        adminAccounts.map((account) => (
                          <div key={account.id} className="border rounded-lg p-3 bg-white">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm truncate">{account.name}</p>
                              <div className="flex items-center gap-1">
                                <Badge
                                  variant="secondary"
                                  className={
                                    account.isActive
                                      ? 'relative overflow-hidden border-emerald-200 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.35)]'
                                      : undefined
                                  }
                                >
                                  {account.isActive ? (
                                    <>
                                      <span className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/10 to-transparent pointer-events-none" />
                                      <span className="relative">Active</span>
                                    </>
                                  ) : (
                                    'Inactive'
                                  )}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                                  onClick={() => deleteAccount(account.email)}
                                  title="Delete account"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{account.email}</p>
                            <p className="text-xs text-gray-500 mt-1">Last seen: {formatLastSeen(account.lastActiveAt)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Status is tracked for this browser storage. "Active" means currently signed in on this app in this browser.
                </p>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

