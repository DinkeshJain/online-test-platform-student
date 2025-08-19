import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { GraduationCap, Mail, Lock, ArrowRight, FileText } from 'lucide-react';

const StudentLogin = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      // Check if user is student after successful login
      const userData = JSON.parse(localStorage.getItem('user'));
      if (userData?.role === 'admin') {
        setError('Admin accounts cannot login through student portal. Please use admin login.');
        setLoading(false);
        return;
      }
      
      toast.success('Login successful!');
      navigate('/dashboard');
    } else {
      setError(result.message);
      toast.error(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center p-2">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border border-gray-300 overflow-hidden">
          <CardHeader className="text-center pb-3 bg-white">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <GraduationCap className="h-8 w-8 text-gray-600" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-lg font-bold text-gray-900 leading-tight">
                <span className="text-gray-800">Acharya Nagarjuna University</span>
                <br />
                <span className="text-gray-600 text-sm"> in collaboration with </span>
                <br />
                <span className="text-gray-800">National Institute of Fire and Safety</span>
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm font-medium">
                Student Portal - Online Examination
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Username
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
                    className="pl-10 h-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="pl-10 h-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-10 text-sm mt-4">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">Looking for your results?</p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/results')}
                  className="w-full h-10 text-sm"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Published Results
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentLogin;

