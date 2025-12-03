// PublicResults.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FileText } from 'lucide-react';

const PublicResults = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [studentResults, setStudentResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            toast.error('Please enter enrollment number to search');
            return;
        }

        try {
            setLoading(true);
            setError('');
            
            const response = await api.get(`/results/student-results/${searchQuery.trim()}`);

            if (response.data.success) {
                setStudentResults(response.data);
                toast.success('Results found successfully');
            } else {
                setStudentResults(null);
                toast.error('No results found');
            }
        } catch (error) {
            console.error('Error searching results:', error);
            const errorMessage = error.response?.data?.message || 'Failed to search results';
            setError(errorMessage);
            toast.error(errorMessage);
            setStudentResults(null);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handlePrint = () => {
        // Add print-specific styles to hide headers/footers
        const printStyle = document.createElement('style');
        printStyle.innerHTML = `
            @media print {
                @page {
                    margin: 0.5in;
                    size: A4;
                }
                
                /* Hide browser headers and footers */
                body { 
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
            }
        `;
        document.head.appendChild(printStyle);
        
        // Trigger print
        window.print();
        
        // Clean up
        setTimeout(() => {
            document.head.removeChild(printStyle);
        }, 1000);
    };

    const getGradeColor = (grade) => {
        const colors = {
            'O': 'bg-green-100 text-green-800 border-green-200',
            'A': 'bg-blue-100 text-blue-800 border-blue-200',
            'B': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'C': 'bg-orange-100 text-orange-800 border-orange-200',
            'D': 'bg-red-100 text-red-800 border-red-200',
            'E': 'bg-red-100 text-red-800 border-red-200',
            'F': 'bg-red-100 text-red-800 border-red-200'
        };
        return colors[grade] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center mb-8 no-print">
                    <h1 className="text-2xl font-bold mb-2">August-2025 Examination Results</h1>
                </div>

                <Card className="overflow-hidden bg-white shadow-md no-print">
                    <CardContent className="p-6">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="enrollmentNo">Enrollment Number</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="enrollmentNo"
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Enter your enrollment number"
                                        className="flex-1"
                                    />
                                    <Button 
                                        onClick={handleSearch} 
                                        disabled={loading}
                                        className="px-6"
                                    >
                                        {loading ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        ) : (
                                            <Search className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {error && (
                    <div className="text-red-500 text-center p-4 no-print">{error}</div>
                )}

                {studentResults && (
                    <>
                        {/* Print Button */}
                        <div className="flex justify-center mb-4 no-print">
                            <Button onClick={handlePrint} variant="outline" size="sm">
                                <FileText className="w-4 h-4 mr-2" />
                                Print Results
                            </Button>
                        </div>
                        
                        <Card className="overflow-hidden bg-white shadow-md print-content">
                            <CardContent className="p-8">
                                {studentResults.results.map((semester, index) => (
                                    <div key={index} className="border-b pb-8 last:border-b-0 mb-8 last:mb-0 avoid-page-break">
                                        {/* Header */}
                                        <div className="text-center mb-8">
                                            <h1 className="text-2xl font-bold mb-2">Acharya Nagarjuna University</h1>
                                            <h2 className="text-xl font-semibold mb-2">Centre for Distance Education - Online Diploma Programs</h2>
                                            <h3 className="text-lg font-semibold">August-2025 Examination Results</h3>
                                        </div>                                    {/* Student Information */}
                                    <div className="mb-8 space-y-1 text-left">
                                        <div>
                                            <span className="font-semibold">Enrollment No : </span>{studentResults.enrollmentNo}
                                        </div>
                                        <div>
                                            <span className="font-semibold">Student Name : </span>{studentResults.studentName}
                                        </div>
                                        <div>
                                            <span className="font-semibold">Father Name : </span>{studentResults.fatherName || 'N/A'}
                                        </div>
                                        <div>
                                            <span className="font-semibold">Course : </span>{semester.courseName}
                                        </div>
                                    </div>
                                    
                                    {/* Results Table */}
                                    <div className="mb-6">
                                        <table className="w-full border-collapse border border-black">
                                            <thead>
                                                <tr>
                                                    <th className="border border-black p-3 text-left font-semibold">Subject</th>
                                                    <th className="border border-black p-3 text-center font-semibold">Credits</th>
                                                    <th className="border border-black p-3 text-center font-semibold">Grade Points</th>
                                                    <th className="border border-black p-3 text-center font-semibold">Grade Letter</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {semester.subjects.map((subject, idx) => {
                                                    return (
                                                        <tr key={idx}>
                                                            <td className="border border-black p-3">
                                                                {subject.subjectCode} {subject.subjectName}
                                                            </td>
                                                            <td className="border border-black p-3 text-center">{subject.credits || 4}</td>
                                                            <td className="border border-black p-3 text-center">{subject.gradePoints || 0}</td>
                                                            <td className="border border-black p-3 text-center font-semibold">{subject.grade}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {/* Grade Point Average */}
                                    <div className="mb-6">
                                        <div className="text-base">
                                            <span className="font-semibold">Grade Point Average: </span>{semester.sgpa}
                                        </div>
                                    </div>
                                    
                                    {/* Note */}
                                    <div className="mb-8">
                                        <p className="text-base">
                                            <span className="font-semibold">Note : </span>Grade Letter 'W' - Absent, 'F' - Fail
                                        </p>
                                    </div>
                                    
                                    {/* Coordinator Signature */}
                                    <div className="flex justify-end mt-16">
                                        <div className="text-right">
                                            <div className="font-semibold">
                                                Director <br/>
                                                Centre for Distance Education
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                ))}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
};

export default PublicResults;