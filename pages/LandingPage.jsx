// LandingPage.jsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, GraduationCap, Users, BookOpen } from 'lucide-react';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center">
            <div className="container mx-auto px-4 py-4">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-3">
                        <img 
                            src="/logo-anu.png" 
                            alt="Acharya Nagarjuna University" 
                            className="h-12 w-12 object-contain"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Acharya Nagarjuna University
                    </h1>
                    <p className="text-base text-gray-600 mb-1">
                        Centre for Distance Education - Online Diploma Programs
                    </p>
                    <p className="text-sm text-gray-500">
                        Student Portal & Examination Results
                    </p>
                </div>

                {/* Navigation Cards */}
                <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-4">
                    {/* Student Login */}
                    <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer group">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto mb-2 p-2 bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <CardTitle className="text-sm">Student Portal</CardTitle>
                            <CardDescription className="text-xs">
                                Login to access your dashboard
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3">
                            <Link to="/login" className="block">
                                <Button className="w-full" size="sm">
                                    Login to Portal
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Public Results */}
                    <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer group">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto mb-2 p-2 bg-green-100 rounded-full w-10 h-10 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                <FileText className="h-5 w-5 text-green-600" />
                            </div>
                            <CardTitle className="text-sm">Regular Results</CardTitle>
                            <CardDescription className="text-xs">
                                Regular examination results
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3">
                            <Link to="/results" className="block">
                                <Button variant="outline" className="w-full" size="sm">
                                    View Results
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Supplementary Results */}
                    <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer group">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto mb-2 p-2 bg-orange-100 rounded-full w-10 h-10 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                                <GraduationCap className="h-5 w-5 text-orange-600" />
                            </div>
                            <CardTitle className="text-sm">Supplementary Results</CardTitle>
                            <CardDescription className="text-xs">
                                Supplementary examination results
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3">
                            <Link to="/supplementary-results" className="block">
                                <Button variant="outline" className="w-full" size="sm">
                                    View Supplementary Results
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                {/* Footer */}
                <div className="text-center text-gray-500 text-xs">
                    <p>© 2025 Acharya Nagarjuna University - Centre for Distance Education</p>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;