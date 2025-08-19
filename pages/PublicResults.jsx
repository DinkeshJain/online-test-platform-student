import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { GraduationCap, Search, ArrowLeft, FileText, Trophy, Clock, User, BookOpen } from 'lucide-react';

const PublicResults = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCoursesWithResults();
  }, []);

  const fetchCoursesWithResults = async () => {
    try {
      setCoursesLoading(true);
      const response = await api.get('/results/courses-with-results');
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses with results:', error);
      setError('Failed to load available courses');
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!selectedCourse) {
      toast.error('Please select a course first');
      return;
    }

    if (!searchQuery.trim()) {
      toast.error('Please enter a roll number to search');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/results/search`, {
        params: {
          courseId: selectedCourse,
          rollNumber: searchQuery.trim()
        }
      });

      setSearchResults(response.data.results || []);
      
      if (response.data.results.length === 0) {
        toast.error('No results found for the given roll number');
      } else {
        toast.success(`Found ${response.data.results.length} result(s)`);
      }
    } catch (error) {
      console.error('Error searching results:', error);
      const errorMessage = error.response?.data?.message || 'Failed to search results';
      setError(errorMessage);
      toast.error(errorMessage);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (percentage >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (percentage >= 60) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    return 'F';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                  <span className="text-gray-800">Acharya Nagarjuna University</span>
                  <br className="sm:hidden" />
                  <span className="text-gray-600 text-sm sm:text-base"> in collaboration with </span>
                  <br className="sm:hidden" />
                  <span className="text-gray-800">National Institute of Fire and Safety</span>
                </h1>
                <p className="text-gray-600 text-sm">Public Results Portal</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/student/login')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Results
            </CardTitle>
            <CardDescription>
              Select a course and enter a roll number to search for results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                {coursesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <select
                    id="course"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.courseCode} - {course.courseName}
                      </option>
                    ))}
                  </select>
                )}
                {courses.length === 0 && !coursesLoading && (
                  <p className="text-sm text-gray-500">No courses with published results found</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rollNumber">Roll Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="rollNumber"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter roll number (e.g., A24DA01001)"
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSearch} 
                    disabled={loading || !selectedCourse}
                    className="px-6"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  You can search with partial roll numbers (e.g., "A24DA" will show all matching students)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {searchResults.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Search Results</h2>
            
            <div className="grid gap-6">
              {searchResults.map((result, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{result.student.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span>Roll No: {result.student.rollNumber}</span>
                            <span>•</span>
                            <span>{result.course.courseCode}</span>
                          </CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-sm">
                          {result.course.courseName}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Subject Results */}
                      {result.subjects && result.subjects.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Subject-wise Results
                          </h4>
                          <div className="grid gap-4">
                            {result.subjects.map((subject, subIndex) => (
                              <div key={subIndex} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900">
                                      {subject.subjectName}
                                    </h5>
                                    <p className="text-sm text-gray-600">
                                      Code: {subject.subjectCode}
                                    </p>
                                  </div>
                                  
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    {/* Internal Marks */}
                                    {subject.internalMarks !== undefined && (
                                      <div className="text-center">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Internal</p>
                                        <p className="text-lg font-semibold text-blue-600">
                                          {subject.internalMarks}/{subject.internalMaxMarks || 30}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {/* External Marks */}
                                    {subject.externalMarks !== undefined && (
                                      <div className="text-center">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">External</p>
                                        <p className="text-lg font-semibold text-green-600">
                                          {subject.externalMarks}/{subject.externalMaxMarks || 70}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {/* Total Marks */}
                                    {subject.totalMarks !== undefined && (
                                      <div className="text-center">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                                        <p className="text-xl font-bold text-gray-900">
                                          {subject.totalMarks}/{subject.totalMaxMarks || 100}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {/* Percentage & Grade */}
                                    {subject.percentage !== undefined && (
                                      <div className="text-center">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Grade</p>
                                        <Badge className={`${getGradeColor(subject.percentage)} font-bold`}>
                                          {getGrade(subject.percentage)} ({subject.percentage.toFixed(1)}%)
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Overall Performance */}
                      {result.overall && (
                        <div className="border-t pt-6">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            Overall Performance
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Marks</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {result.overall.totalMarks}/{result.overall.maxMarks}
                              </p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Percentage</p>
                              <p className="text-2xl font-bold text-green-600">
                                {result.overall.percentage.toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Grade</p>
                              <p className="text-2xl font-bold text-purple-600">
                                {getGrade(result.overall.percentage)}
                              </p>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                              <Badge className={result.overall.percentage >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {result.overall.percentage >= 50 ? 'PASS' : 'FAIL'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Publication Info */}
                      {result.publishedAt && (
                        <div className="border-t pt-4">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>Results published on {new Date(result.publishedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {searchResults.length === 0 && searchQuery && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600 mb-4">
                No results found for roll number "{searchQuery}" in the selected course.
              </p>
              <p className="text-sm text-gray-500">
                Please check the roll number and try again, or try searching with partial roll number.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PublicResults;

