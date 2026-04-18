import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Shield, Lock, Mail, User, AlertCircle, CheckCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { localHasAnyAdmin, localSignUp } from '../auth/localAuth';

export function AdminSetupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const alreadyHasAdmin = useMemo(() => localHasAnyAdmin(), []);

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
      const result = localSignUp(name, email, password, 'admin');
      if (!result.ok) {
        setError('An account with this email already exists.');
        return;
      }
      // auto-login admin
      localStorage.setItem('healthfinder_user', JSON.stringify(result.user));
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
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                autoComplete="new-password"
                disabled={alreadyHasAdmin}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="flex items-center gap-2 mb-2">
                <Lock className="size-4" />
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                autoComplete="new-password"
                disabled={alreadyHasAdmin}
              />
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

