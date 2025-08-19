import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { GraduationCap } from 'lucide-react';

const StudentRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
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

    if (!formData.name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }

    if (!formData.username.trim()) {
      setError('Username is required');
      setLoading(false);
      return;
    }

    const result = await register(formData.name, formData.username, 'user');
    
    if (result.success) {
      navigate('/student/dashboard');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="h-8 w-8 text-gray-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight mb-3">
            <span className="text-gray-800">Acharya Nagarjuna University</span>
            <br />
            <span className="text-gray-600 text-lg"> in collaboration with </span>
            <br />
            <span className="text-gray-800">National Institute of Fire and Safety</span>
          </h1>
          <p className="text-sm text-gray-600">Student Registration Portal</p>
        </div>
        
        <Card className="shadow-lg border border-gray-300 overflow-hidden">
          <CardHeader className="space-y-1 pb-4 bg-white">
            <CardTitle className="text-lg sm:text-xl text-center font-bold text-gray-900">
              Create Student Account
            </CardTitle>
            <CardDescription className="text-center text-sm text-gray-600">
              Enter your information to create your account
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="Enter your username"
                  className="h-11"
                />
              </div>
              
              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Student Account'}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm">
              Already have an account?{' '}
              <Link to="/student/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentRegister;
