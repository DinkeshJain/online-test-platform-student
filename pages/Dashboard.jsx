import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Clock, User, Calendar, EyeOff, FileText } from 'lucide-react';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const [tests, setTests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [testsResponse, submissionsResponse] = await Promise.all([
        api.get('/tests'),
        api.get('/submissions/my-submissions')
      ]);
      
      setTests(testsResponse.data.tests);
      setSubmissions(submissionsResponse.data.submissions);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate display title from subject info
  const getDisplayTitle = (test) => {
    if (test.subject && test.subject.subjectCode && test.subject.subjectName) {
      const lastDigit = test.subject.subjectCode.slice(-1);
      return `${test.subject.subjectCode}: ${test.subject.subjectName} (Paper ${lastDigit})`;
    }
    return 'Untitled Test';
  };

  const handleStartTest = (testId) => {
    navigate(`/test/${testId}`);
  };

  const hasSubmitted = (testId) => {
    const result = submissions.some(submission => {
      return submission.testId === testId;
    });
    
    return result;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-gray-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-700">Loading your dashboard...</p>
            <p className="text-sm text-gray-500 mt-1">Please wait while we fetch your tests</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:py-8 sm:px-6 lg:px-8">
        <div className="space-y-8 sm:space-y-10">
          {/* Welcome Header */}
          <div className="text-center sm:text-left bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                  Welcome back, <span className="text-gray-700">{user?.fullName || user?.name || user?.username}</span>!
                </h1>
                {user?.course && (
                  <div className="mb-3">
                    <p className="text-lg sm:text-xl font-semibold text-gray-800">
                      Course: <span className="text-gray-600">{user.course}</span>
                    </p>
                  </div>
                )}
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                  Ready to take your examinations? Here are your available tests.
                </p>
              </div>
              <div className="hidden sm:flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full">
                <User className="h-8 w-8 text-gray-600" />
              </div>
            </div>
          </div>

          {/* Available Tests Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Available Tests</h2>
              </div>
            </div>
            
            <div className="p-6">
              {tests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4">
                    <FileText className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No tests available</h3>
                  <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                    {user?.course ? 
                      `No tests are currently available for your course (${user.course}). Please check back later.` :
                      'New tests will appear here when they become available.'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {tests.map((test) => (
                    <Card key={test._id} className="group hover:shadow-lg transition-all duration-200 border border-gray-300 hover:border-gray-400 overflow-hidden">
                      <CardHeader className="pb-4 bg-gray-50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-bold text-gray-900 leading-tight mb-3 group-hover:text-gray-700 transition-colors">
                              {getDisplayTitle(test)}
                            </CardTitle>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {hasSubmitted(test._id) && (
                                <Badge className="bg-green-100 text-green-800 border-green-300 font-medium px-3 py-1">
                                  <span className="flex items-center gap-1">
                                    ✓ Completed
                                  </span>
                                </Badge>
                              )}
                              <Badge 
                                variant={test.testType === 'demo' ? 'secondary' : 'default'} 
                                className={test.testType === 'demo' ? 'text-orange-600 border-orange-600 bg-orange-50' : 'text-blue-600 border-blue-600 bg-blue-50'}
                              >
                                {test.testType === 'demo' ? 'Demo (Optional)' : 'Official Exam'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6 pb-6">
                        <div className="space-y-4 mb-6">
                          <div className="flex items-center text-sm bg-gray-100 p-3 rounded-lg">
                            <Clock className="h-5 w-5 mr-3 text-gray-600" />
                            <span className="font-semibold text-gray-700">Duration: {test.duration} minutes</span>
                          </div>
                        </div>
                        
                        {hasSubmitted(test._id) ? (
                          <Button 
                            variant="outline" 
                            className="w-full h-12 border-2 border-green-300 bg-green-50 text-green-700 font-semibold cursor-not-allowed"
                            disabled
                          >
                            ✓ Test Completed
                          </Button>
                        ) : (
                          <Button 
                            className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-base transition-all duration-200 shadow-sm hover:shadow-md" 
                            onClick={() => handleStartTest(test._id)}
                          >
                            Start Test →
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

