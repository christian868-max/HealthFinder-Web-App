import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Shield, Lock, Mail, User, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { useAuth } from '../context/AuthContext';

export function AdminSetupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signUp } = useAuth();
  const [alreadyHasAdmin, setAlreadyHasAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '';
      if (apiBaseUrl) {
        try {
          const res = await fetch(`${apiBaseUrl}/api/check-admin`);
          if (res.ok) {
            const data = await res.json();
            setAlreadyHasAdmin(data.hasAdmin);
            return;
          }
        } catch (err) {
          console.warn('API error, falling back to local Auth', err);
        }
      }
      const { localHasAnyAdmin } = await import('../auth/localAuth');
      setAlreadyHasAdmin(localHasAnyAdmin());
    };
    checkAdmin();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (alreadyHasAdmin) {
      setError('An admin account already exists.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const ok = await signUp(name, email, password, 'admin');
      if (!ok) {
        setError('An account with this email already exists or setup failed.');
        return;
      }
      navigate('/admin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 bg-blue-100 rounded-full mb-4">
            <Shield className="size-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Admin Account</h1>
          <p className="text-gray-600">One-time setup for your HealthFinder admin</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {alreadyHasAdmin ? (
              <Alert>
                <CheckCircle className="size-4 text-green-600" />
                <AlertDescription>
                  Admin already exists. Go to{' '}
                  <Link to="/admin/signin" className="text-blue-600 hover:underline font-medium">
                    admin login
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            ) : null}

            <div>
              <Label htmlFor="name" className="flex items-center gap-2 mb-2">
                <User className="size-4" />
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Admin Name"
                required
                autoComplete="name"
                disabled={alreadyHasAdmin}
              />
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                <Mail className="size-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@healthfinder.com"
                required
                autoComplete="email"
                disabled={alreadyHasAdmin}
              />
            </div>

            <div>
              <Label htmlFor="password" className="flex items-center gap-2 mb-2">
                <Lock className="size-4" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  autoComplete="new-password"
                  disabled={alreadyHasAdmin}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={alreadyHasAdmin}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="flex items-center gap-2 mb-2">
                <Lock className="size-4" />
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  autoComplete="new-password"
                  disabled={alreadyHasAdmin}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={alreadyHasAdmin}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={alreadyHasAdmin || isLoading}>
              {isLoading ? 'Creating...' : 'Create Admin'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link to="/admin/signin" className="text-blue-600 hover:underline font-medium">
              Back to admin login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

