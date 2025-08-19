import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import screenfull from 'screenfull';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Monitor, Clock, AlertTriangle, Play, CheckCircle, Flag, Save } from 'lucide-react';

const TakeTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testStarted, setTestStarted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [reviewFlags, setReviewFlags] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [isInFullscreen, setIsInFullscreen] = useState(false);
  const [windowSwitches, setWindowSwitches] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [proctoringViolations, setProctoringViolations] = useState([]);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [testStartedAt, setTestStartedAt] = useState(null);

  // Refs for preventing re-renders in event handlers
  const testStartedRef = useRef(false);
  const testSubmittedRef = useRef(false);
  const windowSwitchesRef = useRef(0);
  const tabSwitchesRef = useRef(0);
  const fullscreenExitsRef = useRef(0);
  const timeLeftRef = useRef(0);
  const testRef = useRef(null);

  useEffect(() => { testStartedRef.current = testStarted; }, [testStarted]);
  useEffect(() => { testSubmittedRef.current = testSubmitted; }, [testSubmitted]);
  useEffect(() => { windowSwitchesRef.current = windowSwitches; }, [windowSwitches]);
  useEffect(() => { tabSwitchesRef.current = tabSwitches; }, [tabSwitches]);
  useEffect(() => { fullscreenExitsRef.current = fullscreenExits; }, [fullscreenExits]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { testRef.current = test; }, [test]);

  const recordViolation = useCallback((type, description) => {
    const violation = {
      type, description, timestamp: new Date().toISOString(),
      timeIntoTest: testRef.current ? (testRef.current.duration * 60) - timeLeftRef.current : 0
    };
    setProctoringViolations(prev => [...prev, violation]);
  }, []);

  const handleSubmitTest = useCallback(async () => {
    if (testSubmittedRef.current) return;
    setTestSubmitted(true);
    if (screenfull.isEnabled && screenfull.isFullscreen) screenfull.exit();
    const submissionData = {
      testId,
      answers: testRef.current.questions.map((question, index) => ({
        questionId: question._id,
        selectedAnswer: answers[question._id] !== undefined ? answers[question._id] : null,
        markedForReview: reviewFlags[question._id] || false,
        // Include original question number from the question object
        originalQuestionNumber: question.originalQuestionNumber || question.questionNumber || (index + 1),
        // NEW: Include shuffled to original mapping for correct answer checking
        shuffledToOriginal: question.shuffledToOriginal || []
      })),
      timeSpent: (testRef.current.duration * 60) - timeLeftRef.current,
      testStartedAt,
      proctoring: {
        fullscreenExits: fullscreenExitsRef.current,
        windowSwitches: windowSwitchesRef.current,
        tabSwitches: tabSwitchesRef.current,
        totalViolations: fullscreenExitsRef.current + windowSwitchesRef.current + tabSwitchesRef.current,
        violations: proctoringViolations,
        isAutoSubmitted: fullscreenExitsRef.current >= 3 || (windowSwitchesRef.current + tabSwitchesRef.current) >= 5,
        browserInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
        }
      }
    };

    try {
      await api.post('/submissions', submissionData);
      toast.success(
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <div>
            <div className="font-medium">Test submitted successfully!</div>
          </div>
        </div>,
        { duration: 4000 }
      );
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
      toast.error('Error submitting test. Please try again.');
      setTestSubmitted(false);
    }
  }, [testId, answers, reviewFlags, testStartedAt, proctoringViolations, navigate]);

  // Fetch test only on mount/change
  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await api.get(`/tests/${testId}`);
        setTest(response.data.test);
        setTimeLeft(response.data.test.duration * 60);
        if (response.data.test.timing?.testStartedAt)
          setTestStartedAt(response.data.test.timing.testStartedAt);
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to load test');
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [testId]);

  // Timer effect
  useEffect(() => {
    if (!testStarted || timeLeft <= 0 || testSubmitted) return;
    const timer = setTimeout(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime <= 0 && testStartedRef.current && !testSubmittedRef.current) {
          toast.error('Time is up! Submitting test automatically.');
          handleSubmitTest();
          return 0;
        }
        return newTime;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [testStarted, timeLeft, testSubmitted, handleSubmitTest]);

  // Keyboard and right-click prevention - only once
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 'c') ||
        (e.ctrlKey && e.key === 'v') ||
        (e.ctrlKey && e.key === 'x') ||
        (e.altKey && e.key === 'Tab') ||
        (e.altKey && e.code === 'Tab') ||
        (e.ctrlKey && e.key === 'Tab') ||
        (e.ctrlKey && e.key === 'w') ||
        (e.ctrlKey && e.key === 't') ||
        (e.ctrlKey && e.key === 'n') ||
        (e.ctrlKey && e.shiftKey && e.key === 'T') ||
        (e.key === 'Meta') ||
        (e.altKey && e.key === 'F4')
      ) {
        e.preventDefault();
        if (testStartedRef.current) {
          recordViolation('keyboard_shortcut', `Attempted to use: ${e.key}`);
          toast.error('Keyboard shortcuts are disabled during the test!');
        }
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [recordViolation]);

  // Proctoring monitoring
  useEffect(() => {
    const handleWindowBlur = () => {
      if (!testStartedRef.current || testSubmittedRef.current) return;
      setIsWindowFocused(false);
      setTabSwitches(prev => {
        const next = prev + 1;
        const total = windowSwitchesRef.current + next;
        recordViolation('window_blur', 'Switched away from window');
        if (total >= 5) { toast.error('Test auto-submitted due to violations!'); handleSubmitTest(); }
        else { toast.error(`Warning: Tab switching. ${5 - total} remaining.`); }
        return next;
      });
    };
    const handleWindowFocus = () => {
      if (!testStartedRef.current || testSubmittedRef.current) return;
      setIsWindowFocused(true);
      toast.warning('Focus returned.');
    };
    const handleVisibilityChange = () => {
      if (!testStartedRef.current || testSubmittedRef.current) return;
      if (document.hidden) {
        setWindowSwitches(prev => {
          const next = prev + 1;
          const total = next + tabSwitchesRef.current;
          recordViolation('tab_switch', 'Switched tab');
          if (total >= 5) { toast.error('Test auto-submitted due to tab switches!'); handleSubmitTest(); }
          else { toast.error(`Warning: Tab switching. ${5 - total} remaining.`); }
          return next;
        });
      }
    };
    const handleBeforeUnload = (e) => {
      if (testStartedRef.current && !testSubmittedRef.current) {
        const msg = 'Are you sure you want to leave? Progress will be lost.';
        e.returnValue = msg; return msg;
      }
    };
    const handleMouseLeave = () => {
      if (testStartedRef.current && !testSubmittedRef.current) {
        recordViolation('mouse_leave', 'Mouse left browser window');
      }
    };
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [recordViolation, handleSubmitTest]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsInFullscreen(isFS);
      if (testStartedRef.current && !isFS && !testSubmittedRef.current) {
        setFullscreenExits(prev => {
          const next = prev + 1;
          recordFullscreenExit();
          if (next >= 3) { toast.error('Test auto-submitted due to fullscreen exits.'); handleSubmitTest(); }
          else { toast.error(`Exited fullscreen. ${3 - next} more will auto-submit.`); }
          return next;
        });
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [handleSubmitTest]);

  const recordFullscreenExit = async () => {
    try { await api.post('/submissions/fullscreen-exit', { testId }); } catch (e) { }
  };

  const enterFullscreen = async () => {
    if (screenfull.isEnabled) {
      try { await screenfull.request(); return true; }
      catch (e) { return false; }
    }
    return false;
  };

  const startTest = async () => {
    const fullscreenSuccess = await enterFullscreen();
    if (!fullscreenSuccess) { toast.error('Fullscreen required.'); return; }
    setTestStartedAt(new Date().toISOString());
    setIsInFullscreen(true);
    toast.success('Test started!');
    setTestStarted(true);
  };

  const reEnterFullscreen = async () => {
    const fullscreenSuccess = await enterFullscreen();
    if (!fullscreenSuccess) {
      toast.error('Fullscreen required.');
      return;
    }
    setIsInFullscreen(true);
    toast.success('Fullscreen mode restored.');
  };

  const handleAnswerChange = (questionId, answerIndex) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
  };

  const getQuestionStatus = (questionIndex) => {
    if (!test?.questions) return 'not-answered';
    const question = test.questions[questionIndex];
    const questionId = question._id;
    const hasAnswer = answers[questionId] !== undefined;
    const isMarkedForReview = reviewFlags[questionId];
    if (isMarkedForReview && hasAnswer) return 'marked-answered';
    else if (isMarkedForReview) return 'marked';
    else if (hasAnswer) return 'answered';
    else return 'not-answered';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'answered': return 'bg-green-500 text-white';
      case 'marked': return 'bg-orange-500 text-white';
      case 'marked-answered': return 'bg-purple-500 text-white';
      default: return 'bg-gray-300 text-gray-700';
    }
  };


  const saveAndNext = () => {
    if (currentQuestionIndex < test.questions.length - 1)
      setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  const markForReviewAndNext = () => {
    const currentQuestion = test.questions[currentQuestionIndex];
    setReviewFlags(prev => ({ ...prev, [currentQuestion._id]: true }));
    if (currentQuestionIndex < test.questions.length - 1)
      setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  const goToQuestion = (questionIndex) => setCurrentQuestionIndex(questionIndex);
  const handleSubmitConfirmation = () => setShowSubmitConfirmation(true);
  const confirmSubmitTest = () => { setShowSubmitConfirmation(false); handleSubmitTest(); };
  const cancelSubmitTest = () => setShowSubmitConfirmation(false);
  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  const getDisplayTitle = (test) => test?.subject?.subjectCode && test?.subject?.subjectName
    ? `${test.subject.subjectCode}: ${test.subject.subjectName} (Paper ${test.subject.subjectCode.slice(-1)})`
    : test?.title || 'Untitled Test';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
        <span className="ml-4 text-gray-600">Loading test...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4 text-sm">{error}</p>
            <Button onClick={() => navigate('/dashboard')} className="w-full py-2 bg-gray-700 text-white">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-lg shadow border">
          <CardHeader className="text-center bg-gray-800 py-6">
            <CardTitle className="text-white text-2xl font-bold">{getDisplayTitle(test)}</CardTitle>
            <span className="text-gray-300 text-sm block mt-2">Online Examination System</span>
          </CardHeader>
          <CardContent className="py-6 px-8 space-y-6">
            <div className="flex gap-4 justify-center">
              <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-700 font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" /> Duration: {test?.duration}m
              </div>
              <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-700 font-medium">
                Questions: {test?.questions?.length}
              </div>
            </div>
            <Alert className="border-gray-300 bg-gray-50 p-3">
              <AlertTriangle className="h-4 w-4 text-gray-600" />
              <AlertDescription className="text-gray-700 ml-2">
                <strong>Examination Instructions:</strong>
                <ul className="space-y-1 text-xs mt-2">
                  <li>• Examination runs in fullscreen mode</li>
                  <li>• Exiting fullscreen may result in auto-submission</li>
                  <li>• Right-click and keyboard shortcuts are disabled</li>
                  <li>• Ensure stable internet connection</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="flex gap-4">
              <Button
                onClick={startTest}
                disabled={!screenfull.isEnabled}
                className="flex-1 h-10 bg-gray-700 text-white text-base font-medium"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Examination
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="h-10 text-base font-medium border-gray-300"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30" style={{ height: "56px" }}>
        <div className="flex items-center justify-between max-w-6xl mx-auto px-4 h-full">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-lg text-gray-800">{getDisplayTitle(test)}</h1>
            {test?.testType && (
              <span className={`text-xs px-3 py-1 rounded font-medium border ${test.testType === 'demo'
                  ? 'bg-gray-100 text-gray-700 border-gray-300'
                  : 'bg-gray-200 text-gray-800 border-gray-400'
                }`}>
                {test.testType === 'demo' ? 'Demo Examination' : 'Official Examination'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded border">
            <Clock className="h-4 w-4" />
            <span className="font-mono text-base">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      {/* Overlays */}
      {!isInFullscreen && testStarted && !testSubmitted && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <Card className="w-full max-w-sm bg-white shadow-lg">
            <CardContent className="py-6 text-center space-y-4">
              <Monitor className="mx-auto h-12 w-12 text-gray-600" />
              <h3 className="font-bold text-lg">Fullscreen Required</h3>
              <p className="text-gray-600 text-sm">
                You must remain in fullscreen mode to continue the examination.
              </p>
              <Button
                onClick={reEnterFullscreen}
                className="w-full bg-gray-700 text-white py-2"
              >
                <Monitor className="h-4 w-4 mr-2" /> Enter Fullscreen
              </Button>
              <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                {fullscreenExits} exit(s) detected. {fullscreenExits >= 2 ? 'One more exit will auto-submit.' : `${3 - fullscreenExits} remaining.`}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Focus warning */}
      {!isWindowFocused && testStarted && !testSubmitted && isInFullscreen && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center">
          <Card className="w-full max-w-sm bg-white border-gray-300">
            <CardContent className="py-6 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-600 mb-3" />
              <h3 className="font-bold text-lg text-gray-900">Focus Required</h3>
              <div className="text-sm text-gray-700 bg-gray-100 p-3 rounded mt-3">
                <p>Tab switches detected: {windowSwitches + tabSwitches}</p>
                <p>Remaining before auto-submission: {5 - (windowSwitches + tabSwitches)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto flex" style={{ height: 'calc(100vh - 56px)' }}>
        {/* Question Section */}
        <section className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
          <Card className="shadow-sm border h-full">
            <CardContent className="p-6 flex flex-col h-full justify-between">
              {test?.questions && test.questions.length > 0 && (
                <>
                  {/* Question */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold text-gray-800">Question {currentQuestionIndex + 1} of {test.questions.length}</h2>
                      <Badge variant="outline" className="px-3 py-1 border-gray-300 text-gray-700">
                        {getQuestionStatus(currentQuestionIndex).replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                    <div className="text-base text-gray-800 mb-6 leading-relaxed">
                      {test.questions[currentQuestionIndex]?.question}
                    </div>
                  </div>
                  {/* Options */}
                  <div className="space-y-3 mb-6">
                    {test.questions[currentQuestionIndex]?.options.map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center space-x-3 px-4 py-3 rounded border cursor-pointer transition-all ${answers[test.questions[currentQuestionIndex]._id] === index
                            ? 'border-gray-400 bg-gray-100'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                      >
                        <input
                          type="radio"
                          name={`question-${test.questions[currentQuestionIndex]._id}`}
                          value={index}
                          checked={answers[test.questions[currentQuestionIndex]._id] === index}
                          onChange={() => handleAnswerChange(test.questions[currentQuestionIndex]._id, index)}
                          className="h-4 w-4 text-gray-600 accent-gray-600"
                          disabled={!isInFullscreen}
                        />
                        <span className="text-gray-800">{option}</span>
                      </label>
                    ))}
                  </div>
                  {/* Controls */}
                  <div className="flex gap-4 pt-4 border-t border-gray-200">
                    <Button
                      onClick={saveAndNext}
                      disabled={!isInFullscreen}
                      className="flex-1 py-3 bg-gray-700 text-white font-medium"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save & Next
                    </Button>
                    <Button
                      onClick={markForReviewAndNext}
                      disabled={!isInFullscreen}
                      className="flex-1 py-3 border border-gray-400 text-gray-700 bg-white hover:bg-gray-50 font-medium"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Mark for Review
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Sidebar with question palette */}
        <aside
          className="w-72 h-full flex flex-col border-l bg-white"
          style={{ minWidth: '288px' }}
        >
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">Question Navigation</h3>
            </div>

            {/* Status Legend */}
            <div className="flex-shrink-0 px-4 py-3 border-b bg-white">
              <h4 className="text-xs font-medium text-gray-600 mb-2">Status Legend</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded"></div>
                  <span className="text-gray-600">Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span className="text-gray-600">For Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span className="text-gray-600">Review & Answered</span>
                </div>
              </div>
            </div>

            {/* Question Palette - scrollable */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3"
              style={{ maxHeight: 'calc(100vh - 240px)' }}
            >
              <div className="grid grid-cols-6 gap-2">
                {test?.questions?.map((_, idx) => {
                  const status = getQuestionStatus(idx);
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => goToQuestion(idx)}
                      disabled={!isInFullscreen}
                      className={`w-10 h-10 rounded text-xs font-medium border transition-all
                        ${getStatusColor(status)}
                        ${isCurrent ? 'ring-2 ring-gray-400 border-gray-600 scale-105' : 'border-gray-300'}
                        disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105`
                      }
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary and Submit */}
            <div className="border-t px-4 py-3 bg-gray-50">
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-600 mb-2">Summary</h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Questions:</span>
                    <span className="font-medium">{test?.questions?.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Answered:</span>
                    <span className="font-medium text-gray-800">
                      {test?.questions?.filter((_, i) => ['answered', 'marked-answered'].includes(getQuestionStatus(i))).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">For Review:</span>
                    <span className="font-medium text-gray-600">
                      {test?.questions?.filter((_, i) => ['marked', 'marked-answered'].includes(getQuestionStatus(i))).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Not Answered:</span>
                    <span className="font-medium text-gray-500">
                      {test?.questions?.filter((_, i) => getQuestionStatus(i) === 'not-answered').length}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSubmitConfirmation}
                disabled={testSubmitted || !isInFullscreen}
                className="w-full py-2 bg-gray-800 text-white font-medium text-sm"
              >
                {testSubmitted ? 'Submitting...' : 'Submit Examination'}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Fullscreen exits warning */}
      {fullscreenExits > 0 && isInFullscreen && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 w-96 z-20">
          <Alert className="border-gray-400 bg-gray-50 text-sm shadow">
            <AlertTriangle className="h-4 w-4 text-gray-600" />
            <AlertDescription className="text-gray-700 font-medium">
              Warning: {fullscreenExits} fullscreen exit(s) detected.
              {fullscreenExits >= 3
                ? ' Examination will be auto-submitted.'
                : ` ${3 - fullscreenExits} exits remaining before auto-submission.`}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-600 mb-4" />
              <h3 className="font-bold text-lg mb-2 text-gray-900">Confirm Submission</h3>
              <p className="text-gray-600 text-sm mb-6">
                Are you sure you want to submit your examination? Once submitted, no changes can be made.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelSubmitTest}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubmitTest}
                  className="flex-1 px-4 py-2 bg-gray-800 text-white hover:bg-gray-900 font-medium"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeTest;
