import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import screenfull from 'screenfull';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Monitor, Clock, AlertTriangle, Play, CheckCircle, Flag, Save, RefreshCw, Wifi, WifiOff } from 'lucide-react';

// Production logging utility
const isDevelopment = process.env.NODE_ENV === 'development';
const log = {
  info: (...args) => isDevelopment && console.log(...args),
  warn: (...args) => isDevelopment && console.warn(...args),
  error: (...args) => console.error(...args) // Always log errors
};

const TakeTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  // Existing state
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testStarted, setTestStarted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [reviewFlags, setReviewFlags] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [testStartedAt, setTestStartedAt] = useState(null);

  // NEW: Progress tracking state
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // ✅ NEW: Refresh handling state
  const [isRefreshRecovering, setIsRefreshRecovering] = useState(false);
  const [refreshAttempts, setRefreshAttempts] = useState(0);

  // Refs for preventing re-renders in event handlers
  const testStartedRef = useRef(false);
  const testSubmittedRef = useRef(false);
  const timeLeftRef = useRef(0);
  const testRef = useRef(null);

  // NEW: Heartbeat interval ref
  const heartbeatIntervalRef = useRef(null);

  // Add network status detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkStatus, setNetworkStatus] = useState('online'); // 'online', 'offline', 'slow'
  const [pendingData, setPendingData] = useState(null); // Store data when offline
  const [lastSavedAt, setLastSavedAt] = useState(null); // Only used for data recovery purposes
  const [lastBackendSavedAt, setLastBackendSavedAt] = useState(null); // Track backend save time (displayed)

  useEffect(() => { testStartedRef.current = testStarted; }, [testStarted]);
  useEffect(() => { testSubmittedRef.current = testSubmitted; }, [testSubmitted]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { testRef.current = test; }, [test]);

  // // Enhanced debug test state function
  // const debugTestState = useCallback(() => {
  //   console.log('=== ENHANCED TEST STATE DEBUG ===');
  //   console.log('testStarted:', testStarted);
  //   console.log('testSubmitted:', testSubmitted);
  //   console.log('currentQuestionIndex:', currentQuestionIndex);
  //   console.log('answers count:', Object.keys(answers).length);
  //   console.log('timeLeft:', timeLeft);
  //   console.log('test loaded:', !!test);
  //   console.log('test questions count:', test?.questions?.length || 0);
    
  //   // Detailed answers debugging
  //   console.log('=== ANSWERS ANALYSIS ===');
  //   console.log('answers object:', answers);
  //   console.log('answers stringify:', JSON.stringify(answers));
  //   console.log('answers keys:', Object.keys(answers));
  //   console.log('answers values:', Object.values(answers));
  //   Object.entries(answers).forEach(([questionId, answer], index) => {
  //     console.log(`Answer ${index + 1}: Q-${questionId} = ${answer} (type: ${typeof answer})`);
  //   });
    
  //   // Check if answers object is somehow corrupted
  //   console.log('Is answers an object?', typeof answers === 'object');
  //   console.log('Is answers null?', answers === null);
  //   console.log('Is answers undefined?', answers === undefined);
  //   console.log('Is answers empty object?', Object.keys(answers).length === 0);
    
  //   // Check for any questions without answers
  //   if (test?.questions) {
  //     console.log('=== MISSING ANSWERS CHECK ===');
  //     test.questions.forEach((q, index) => {
  //       const hasAnswer = answers[q._id] !== undefined;
  //       if (!hasAnswer) {
  //         console.log(`Question ${index + 1} (${q._id}): NO ANSWER`);
  //       } else {
  //         console.log(`Question ${index + 1} (${q._id}): HAS ANSWER = ${answers[q._id]}`);
  //       }
  //     });
  //   }
    
  //   // Memory and state info
  //   console.log('=== STATE INFO ===');
  //   console.log('Last saved:', lastSavedAt);
  //   console.log('Is saving:', isSaving);
  //   console.log('Network status:', networkStatus);
    
  //   console.log('=====================================');
  // }, [testStarted, testSubmitted, currentQuestionIndex, answers, timeLeft, test, lastSavedAt, isSaving, networkStatus]);

  // Debug keyboard shortcut (development only)
  // useEffect(() => {
  //   if (!isDevelopment) return;
    
  //   const handleDebugKey = (e) => {
  //     // Ctrl+Shift+D to debug test state
  //     if (e.ctrlKey && e.shiftKey && e.key === 'D') {
  //       e.preventDefault();
  //       debugTestState();
  //     }
  //   };
    
  //   document.addEventListener('keydown', handleDebugKey);
  //   return () => document.removeEventListener('keydown', handleDebugKey);
  // }, [debugTestState]);

  // Validate answers object for data integrity
  const validateAnswersObject = useCallback((answers) => {
    if (!answers || typeof answers !== 'object') {
      return {};
    }

    const cleanedAnswers = {};
    Object.entries(answers).forEach(([questionId, answer]) => {
      if (answer !== null &&
        answer !== undefined &&
        typeof answer === 'number' &&
        answer >= 0 &&
        answer <= 3 &&
        Number.isInteger(answer)) {
        cleanedAnswers[questionId] = answer;
      } else {
        console.warn(`🧹 Cleaned invalid answer for question ${questionId}:`, answer);
      }
    });

    return cleanedAnswers;
  }, []);

  // Simple recovery function - only from backend
  const recoverFromRefresh = useCallback(async () => {
    log.info('Attempting refresh recovery...');
    setIsRefreshRecovering(true);

    try {
      // Try backend recovery
      const progressResponse = await api.get(`/submissions/load-progress/${testId}`);

      if (progressResponse.data.hasProgress) {
        const backendProgress = progressResponse.data.progress;

        // Restore from backend
        setAnswers(validateAnswersObject(backendProgress.answers || {}));
        setReviewFlags(backendProgress.reviewFlags || {});
        setCurrentQuestionIndex(backendProgress.currentQuestionIndex || 0);
        setTimeLeft(backendProgress.timeLeft || 0);
        setTestStartedAt(backendProgress.testStartedAt);
        setLastSavedAt(backendProgress.lastSavedAt ? new Date(backendProgress.lastSavedAt) : null);

        if (backendProgress.savedTestStructure) {
          setTest(backendProgress.savedTestStructure);
        }

        toast.success('Test resumed from localStorage!');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Refresh recovery failed:', error);
      return false;
    } finally {
      setIsRefreshRecovering(false);
    }
  }, [testId, validateAnswersObject]);

  // Main test initialization
  useEffect(() => {
    const initializeTest = async () => {
      try {
        setLoading(true);

        // First, check localStorage for saved progress
        let hasLocalProgress = false;
        try {
          hasLocalProgress = loadFromLocalStorage();
          if (hasLocalProgress) {
            // console.log('Found localStorage progress - test initialized');
            setTestStarted(true);
            return;
          }
        } catch (localStorageError) {
          // No localStorage data available
        }

        // If no localStorage data, check backend for saved progress (for compatibility)
        let hasExistingProgress = false;
        let savedTestStructure = null;
        try {
          const progressResponse = await api.get(`/submissions/load-progress/${testId}`);
          if (progressResponse.data.hasProgress) {
            setSavedProgress(progressResponse.data.progress);
            hasExistingProgress = true;
            savedTestStructure = progressResponse.data.progress.savedTestStructure;
            // console.log('Found backend progress with saved test structure:', !!savedTestStructure);
          }
        } catch (progressError) {
          // No backend progress available
        }

        // Load test data (prioritize saved structures)
        if (savedTestStructure) {
          // console.log('Using saved test structure to preserve question order');
          setTest(savedTestStructure);
          setTimeLeft(savedTestStructure.duration * 60);
        } else {
          const response = await api.get(`/tests/${testId}`);
          setTest(response.data.test);
          setTimeLeft(response.data.test.duration * 60);
        }

        // Handle refresh recovery from backend if exists
        if (hasExistingProgress) {
          const recovered = await recoverFromRefresh();
          if (recovered) {
            setTestStarted(true);
            // console.log('Successfully recovered from refresh');
          } else {
            // Show resume dialog if automatic recovery failed
            setShowResumeDialog(true);
          }
        }
      } catch (error) {
        console.error('Failed to initialize test:', error);
        if (error.response?.status === 404) {
          setError('Test not found or no longer available');
        } else if (error.response?.status === 403) {
          setError('You do not have permission to take this test');
        } else {
          setError('Failed to load test. Please check your connection and try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (testId) {
      initializeTest();
    }
  }, [testId, recoverFromRefresh]);


  // localStorage save functionality
  const saveToLocalStorage = useCallback(() => {
    if (!testStarted || testSubmitted || !test) return;

    try {
      const saveData = {
        testId,
        answers,
        reviewFlags,
        currentQuestionIndex,
        timeLeft: timeLeftRef.current,
        testStartedAt,
        lastSavedAt: new Date().toISOString(),
        testStructure: {
          ...test,
          questions: test.questions.map((q, index) => ({
            ...q,
            originalQuestionNumber: q.originalQuestionNumber || index + 1,
            shuffledToOriginal: q.shuffledToOriginal || []
          }))
        }
      };

      localStorage.setItem(`test_progress_${testId}`, JSON.stringify(saveData));
      
      // Note: Only backend saves update the displayed "Last saved" time
      
      // Silent auto-save - no toast notification for automatic saves
      
    } catch (error) {
      // Silent error handling for localStorage saves
    }
  }, [testId, answers, reviewFlags, currentQuestionIndex, testStartedAt, test, testStarted, testSubmitted]);

  // Save to backend (for manual save and sync)
  const saveToBackend = useCallback(async (showToast = true) => {
    if (!testStartedRef.current || testSubmittedRef.current || !testRef.current) return;

    try {
      // Enhanced answer collection with multiple validation approaches (same as handleSubmitTest)
      const validAnswers = [];
      let correctAnswersCount = 0;
      
      // Method 1: Direct state iteration with enhanced validation
      Object.entries(answers).forEach(([questionId, selectedAnswer]) => {
        // Find the question in the test
        const question = test.questions.find(q => q._id === questionId);
        if (!question) {
          return;
        }
        
        const questionIndex = test.questions.findIndex(q => q._id === questionId);
        
        // Enhanced: More flexible validation that accepts strings and converts them
        let validatedAnswer = selectedAnswer;
        
        // Convert string numbers to actual numbers
        if (typeof selectedAnswer === 'string' && !isNaN(selectedAnswer)) {
          validatedAnswer = parseInt(selectedAnswer, 10);
        }
        
        // Validate answer with multiple checks
        const isValidAnswer = (
          validatedAnswer !== null &&
          validatedAnswer !== undefined &&
          !isNaN(validatedAnswer) &&
          typeof validatedAnswer === 'number' &&
          validatedAnswer >= 0 &&
          validatedAnswer <= 3 &&
          Number.isInteger(validatedAnswer)
        );

        if (isValidAnswer) {
          // Calculate isCorrect for this answer
          let isCorrect = false;
          const shuffledToOriginal = question.shuffledToOriginal || [0, 1, 2, 3];
          
          if (shuffledToOriginal && Array.isArray(shuffledToOriginal) && shuffledToOriginal.length > 0) {
            const originalIndex = shuffledToOriginal[validatedAnswer];
            if (originalIndex !== undefined && originalIndex !== null) {
              isCorrect = originalIndex === question.correctAnswer;
            } else {
              // Fallback to direct comparison if shuffledToOriginal is corrupted
              isCorrect = question.correctAnswer === validatedAnswer;
            }
          } else {
            isCorrect = question.correctAnswer === validatedAnswer;
          }
          
          if (isCorrect) {
            correctAnswersCount++;
          }
          
          validAnswers.push({
            questionId,
            selectedAnswer: validatedAnswer,
            isCorrect,
            markedForReview: reviewFlags[questionId] || false,
            originalQuestionNumber: question.originalQuestionNumber || (questionIndex + 1),
            shuffledPosition: questionIndex + 1,
            shuffledToOriginal: shuffledToOriginal
          });
        }
      });

      // Method 2: Question-based iteration as backup/verification
      const backupAnswers = [];
      let backupCorrectCount = 0;
      
      test.questions.forEach((question, index) => {
        const selectedAnswer = answers[question._id];
        
        if (selectedAnswer !== undefined && selectedAnswer !== null) {
          // Apply same enhanced validation
          let validatedAnswer = selectedAnswer;
          
          if (typeof selectedAnswer === 'string' && !isNaN(selectedAnswer)) {
            validatedAnswer = parseInt(selectedAnswer, 10);
          }
          
          const isValidAnswer = (
            validatedAnswer !== null &&
            validatedAnswer !== undefined &&
            !isNaN(validatedAnswer) &&
            typeof validatedAnswer === 'number' &&
            validatedAnswer >= 0 &&
            validatedAnswer <= 3 &&
            Number.isInteger(validatedAnswer)
          );

          if (isValidAnswer) {
            // Calculate isCorrect for this answer
            let isCorrect = false;
            const shuffledToOriginal = question.shuffledToOriginal || [0, 1, 2, 3];
            
            if (shuffledToOriginal && Array.isArray(shuffledToOriginal) && shuffledToOriginal.length > 0) {
              const originalIndex = shuffledToOriginal[validatedAnswer];
              if (originalIndex !== undefined && originalIndex !== null) {
                isCorrect = originalIndex === question.correctAnswer;
              } else {
                isCorrect = question.correctAnswer === validatedAnswer;
              }
            } else {
              isCorrect = question.correctAnswer === validatedAnswer;
            }
            
            if (isCorrect) {
              backupCorrectCount++;
            }
            
            backupAnswers.push({
              questionId: question._id,
              selectedAnswer: validatedAnswer,
              isCorrect,
              markedForReview: reviewFlags[question._id] || false,
              originalQuestionNumber: question.originalQuestionNumber || (index + 1),
              shuffledPosition: index + 1,
              shuffledToOriginal: shuffledToOriginal
            });
          }
        }
      });

      // Use the method that found more answers, or prefer state method if equal
      const finalAnswers = validAnswers.length >= backupAnswers.length ? validAnswers : backupAnswers;
      const finalCorrectCount = validAnswers.length >= backupAnswers.length ? correctAnswersCount : backupCorrectCount;

      // Calculate current score and time spent using enhanced validation results
      const currentScore = finalCorrectCount;
      const totalQuestions = test.questions.length;
      const answeredQuestions = finalAnswers.length;
      const unansweredQuestions = totalQuestions - answeredQuestions;
      const currentTimeSpent = testRef.current ? (testRef.current.duration * 60) - timeLeftRef.current : 0;
      const scorePercentage = totalQuestions > 0 ? Math.round((currentScore / totalQuestions) * 100) : 0;

      // Calculate statistics correctly - don't treat unanswered as rejected (same as handleSubmitTest)
      let actualRejectedCount = 0;
      test.questions.forEach((question, index) => {
        const providedAnswer = answers[question._id];
        const wasIncluded = finalAnswers.some(a => a.questionId === question._id);
        
        // Only count as rejected if an answer was provided but not included
        if (providedAnswer !== undefined && providedAnswer !== null && !wasIncluded) {
          actualRejectedCount++;
        }
      });

      const saveData = {
        answers: finalAnswers,
        reviewFlags: Object.entries(reviewFlags).reduce((acc, [questionId, flagged]) => {
          if (flagged) acc[questionId] = true;
          return acc;
        }, {}),
        currentQuestionIndex,
        timeLeft: timeLeftRef.current,
        timeSpent: currentTimeSpent,
        testStartedAt,
        totalQuestions,
        answeredQuestions,
        unansweredQuestions,
        currentScore,
        scorePercentage,
        rejectedAnswers: actualRejectedCount,
        validationMethod: finalAnswers === validAnswers ? 'direct_state' : 'question_based',
        status: 'in_progress'
      };

      const response = await api.post(`/submissions/auto-save/${testId}`, saveData);
      
      if (response.data.message) {
        // Update lastBackendSavedAt to reflect backend save time
        setLastBackendSavedAt(new Date());
        
        // Show success toast only for manual saves, not auto-saves
        if (showToast) {
          toast.success(
            `Progress saved!`,
            { duration: 3000 }
          );
        }
        return true;
      }
    } catch (error) {
      console.error('❌ Backend save failed:', error);
      
      // Store failed data for retry when online
      setPendingData({
        answers: { ...answers },
        reviewFlags: { ...reviewFlags },
        currentQuestionIndex,
        timeLeft: timeLeftRef.current
      });
      
      throw error; // Re-throw to be handled by calling function
    }
  }, [testId, answers, reviewFlags, currentQuestionIndex, testStartedAt, test, testStarted, testSubmitted]);

  // Load from localStorage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const savedData = localStorage.getItem(`test_progress_${testId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // console.log('� Loading from localStorage:', parsed);
        
        setAnswers(validateAnswersObject(parsed.answers || {}));
        setReviewFlags(parsed.reviewFlags || {});
        setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
        setTimeLeft(parsed.timeLeft || 0);
        setTestStartedAt(parsed.testStartedAt);
        setLastSavedAt(parsed.lastSavedAt ? new Date(parsed.lastSavedAt) : null);

        if (parsed.testStructure) {
          // console.log('Using saved test structure from localStorage');
          setTest(parsed.testStructure);
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return false;
    }
  }, [testId, validateAnswersObject]);

  // Manual save function for button - saves to both localStorage and backend
  const manualSave = useCallback(async () => {
    if (!testStarted || testSubmitted) return;
    
    setIsSaving(true);
    try {
      // First save to localStorage (instant)
      saveToLocalStorage();
      
      // Then save to backend if online
      if (isOnline && test && Object.keys(answers).length > 0) {
        await saveToBackend(true); // Manual save: show toast
        // Note: saveToBackend() already shows success toast, no need for duplicate
      } else if (!isOnline) {
        toast.info('Saved locally - will sync when online');
      } else {
        toast.success('Progress saved locally!');
      }
    } catch (error) {
      toast.error('Failed to save progress');
    } finally {
      setIsSaving(false);
    }
  }, [testStarted, testSubmitted, isOnline, test, answers]); // Removed function dependencies

  // Function to initialize test with localStorage check
  const initializeTest = useCallback(async () => {
    const hasLocalData = loadFromLocalStorage();
    if (hasLocalData) {
      return true;
    }
    return false;
  }, [loadFromLocalStorage]);

  const sendHeartbeat = useCallback(async () => {
    if (!testStarted || testSubmitted || !test) return;

    try {
      await api.post(`/submissions/heartbeat/${testId}`);
    } catch (error) {
      console.error('Heartbeat failed:', error);
      // ✅ NEW: Handle session expiry in heartbeat
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      }
    }
  }, [testId, testStarted, testSubmitted, test, navigate]);

  // ✅ ENHANCED: Network status handling with automatic data sync
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setNetworkStatus('online');
      toast.success('Connection restored!', { duration: 2000 });

      if (testStartedRef.current && !testSubmittedRef.current) {
        // ✅ Sync pending data when coming back online
        if (pendingData) {
          try {
            await saveToBackend(true); // Network sync: show toast since it's important
            setPendingData(null);
            // Note: saveToBackend() already shows success toast for sync
          } catch (error) {
            console.error('Failed to sync data:', error);
            toast.error('Failed to sync pending data');
          }
        }

        // Send heartbeat
        sendHeartbeat();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkStatus('offline');
      toast.error('Connection lost - answers saved locally', { duration: 3000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingData, saveToBackend, sendHeartbeat]); // ✅ Include dependencies

  // ✅ Heartbeat interval setup
  useEffect(() => {
    if (testStarted && !testSubmitted) {
      heartbeatIntervalRef.current = setInterval(() => {
        if (testStartedRef.current && !testSubmittedRef.current && testRef.current) {
          sendHeartbeat();
        }
      }, 30000);

      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      };
    }
  }, [testStarted, testSubmitted, sendHeartbeat]);

  // Auto-save to localStorage when answers change
  useEffect(() => {
    if (testStarted && !testSubmitted && Object.keys(answers).length > 0) {
      const timeoutId = setTimeout(() => {
        saveToLocalStorage();
      }, 1000); // Debounce saves by 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [answers, reviewFlags, currentQuestionIndex, testStarted, testSubmitted]); // Removed saveToLocalStorage dependency


  // ✅ REMOVED: Start fresh option - only resume test available
  const resumeTest = useCallback(async () => {
    if (!savedProgress) {
      // Try automatic recovery if no saved progress
      const recovered = await recoverFromRefresh();
      if (recovered) {
        setTestStarted(true);
        return;
      }
    }

    try {
      // console.log('Resuming test with progress:', savedProgress);

      // ✅ Call backend to increment resume count
      await api.post(`/submissions/resume-test/${testId}`);

      // ✅ RESTORE TEST STRUCTURE FIRST
      if (savedProgress.savedTestStructure) {
        // console.log('Restoring saved test structure');
        setTest(savedProgress.savedTestStructure);
      }

      // ✅ RESTORE ALL PROGRESS
      setAnswers(savedProgress.answers || {});
      setReviewFlags(savedProgress.reviewFlags || {});
      setCurrentQuestionIndex(savedProgress.currentQuestionIndex || 0);
      setTimeLeft(savedProgress.timeLeft || 0);
      setTestStartedAt(savedProgress.testStartedAt ? new Date(savedProgress.testStartedAt) : new Date());
      setLastSavedAt(savedProgress.lastSavedAt ? new Date(savedProgress.lastSavedAt) : null);

      // ✅ CRITICAL: Mark as started BEFORE hiding dialog
      setTestStarted(true);
      setShowResumeDialog(false);

      const minutes = Math.floor(savedProgress.timeLeft / 60);
      const seconds = savedProgress.timeLeft % 60;

      // ✅ OPTIONAL FULLSCREEN (no tracking)
      if (screenfull.isEnabled) {
        try {
          await screenfull.request();
        } catch (error) {
          console.error('Failed to enter fullscreen:', error);
        }
      }

      toast.success(`Test resumed! Time left: ${minutes}:${seconds.toString().padStart(2, '0')}`);

    } catch (error) {
      console.error('Error resuming test:', error);
      toast.error('Error resuming test');
    }
  }, [savedProgress, testId, recoverFromRefresh]);

  // Enhanced debug test state function
  // Optional fullscreen function - no enforcement
  const enterFullscreen = async () => {
    if (screenfull.isEnabled) {
      try {
        await screenfull.request();
        toast.success('Entered fullscreen mode');
        return true;
      } catch (e) {
        // Fullscreen request failed
        return false;
      }
    }
    return false;
  };

  const startFreshTest = useCallback(async () => {
    try {
      // Set test started timestamp
      const startTime = new Date().toISOString();
      setTestStartedAt(startTime);
      
      // Start the test
      setTestStarted(true);
      toast.success('Test started!');
      
      // Save initial state to localStorage
      saveToLocalStorage();
      
    } catch (error) {
      console.error('❌ Error starting test:', error);
      toast.error('Error starting test, but you can continue');
      
      // Still start the test even if submission creation fails
      setTestStartedAt(new Date().toISOString());
      setTestStarted(true);
    }
  }, [saveToLocalStorage]);

  // ✅ ENHANCED: Submit only answered questions with proper originalQuestionNumber mapping
  const handleSubmitTest = useCallback(async () => {
    if (testSubmittedRef.current) return;
    
    // Enhanced test data validation
    if (!testRef.current || !testRef.current.questions || !Array.isArray(testRef.current.questions) || testRef.current.questions.length === 0) {
      toast.error('Test data not loaded properly. Please refresh and try again.');
      setTestSubmitted(false);
      return;
    }
    
    setTestSubmitted(true);

    // Enhanced answer collection with multiple validation approaches
    const validAnswers = [];
    
    // Method 1: Direct state iteration with enhanced validation
    Object.entries(answers).forEach(([questionId, selectedAnswer]) => {
      // Find the question in the test
      const question = testRef.current.questions.find(q => q._id === questionId);
      if (!question) {
        return;
      }
      
      const questionIndex = testRef.current.questions.findIndex(q => q._id === questionId);
      
      // Enhanced: More flexible validation that accepts strings and converts them
      let validatedAnswer = selectedAnswer;
      
      // Convert string numbers to actual numbers
      if (typeof selectedAnswer === 'string' && !isNaN(selectedAnswer)) {
        validatedAnswer = parseInt(selectedAnswer, 10);
      }
      
      // Validate answer with multiple checks
      const isValidAnswer = (
        validatedAnswer !== null &&
        validatedAnswer !== undefined &&
        !isNaN(validatedAnswer) &&
        typeof validatedAnswer === 'number' &&
        validatedAnswer >= 0 &&
        validatedAnswer <= 3 &&
        Number.isInteger(validatedAnswer)
      );

      if (isValidAnswer) {
        validAnswers.push({
          questionId,
          selectedAnswer: validatedAnswer,
          markedForReview: reviewFlags[questionId] || false,
          originalQuestionNumber: question.originalQuestionNumber || (questionIndex + 1),
          shuffledPosition: questionIndex + 1,
          shuffledToOriginal: question.shuffledToOriginal || [0, 1, 2, 3]
        });
      }
    });

    // Method 2: Question-based iteration as backup/verification
    const backupAnswers = [];
    
    testRef.current.questions.forEach((question, index) => {
      const selectedAnswer = answers[question._id];
      
      if (selectedAnswer !== undefined && selectedAnswer !== null) {
        // Apply same enhanced validation
        let validatedAnswer = selectedAnswer;
        
        if (typeof selectedAnswer === 'string' && !isNaN(selectedAnswer)) {
          validatedAnswer = parseInt(selectedAnswer, 10);
        }
        
        const isValidAnswer = (
          validatedAnswer !== null &&
          validatedAnswer !== undefined &&
          !isNaN(validatedAnswer) &&
          typeof validatedAnswer === 'number' &&
          validatedAnswer >= 0 &&
          validatedAnswer <= 3 &&
          Number.isInteger(validatedAnswer)
        );

        if (isValidAnswer) {
          backupAnswers.push({
            questionId: question._id,
            selectedAnswer: validatedAnswer,
            markedForReview: reviewFlags[question._id] || false,
            originalQuestionNumber: question.originalQuestionNumber || (index + 1),
            shuffledPosition: index + 1,
            shuffledToOriginal: question.shuffledToOriginal || [0, 1, 2, 3]
          });
        }
      }
    });

    // Use the method that found more answers, or prefer state method if equal
    const finalAnswers = validAnswers.length >= backupAnswers.length ? validAnswers : backupAnswers;
    
    // Calculate statistics correctly - don't treat unanswered as rejected
    const totalQuestions = testRef.current.questions.length;
    const answeredCount = finalAnswers.length;
    const unansweredCount = totalQuestions - answeredCount;
    
    // Only count actual rejections (answers that were provided but failed validation)
    let actualRejectedCount = 0;
    testRef.current.questions.forEach((question, index) => {
      const providedAnswer = answers[question._id];
      const wasIncluded = finalAnswers.some(a => a.questionId === question._id);
      
      // Only count as rejected if an answer was provided but not included
      if (providedAnswer !== undefined && providedAnswer !== null && !wasIncluded) {
        actualRejectedCount++;
      }
    });

    // Only warn about actual rejections, not unanswered questions
    if (actualRejectedCount > 0) {      
      // Only show confirmation dialog for actual rejected answers (not unanswered)
      if (actualRejectedCount > 2) {
        const proceed = confirm(
          `WARNING: ${actualRejectedCount} of your provided answers have technical issues and were rejected. ` +
          `${answeredCount} valid answers will be submitted out of ${totalQuestions} total questions. ` +
          `Do you want to proceed or go back to review your answers?`
        );

        if (!proceed) {
          setTestSubmitted(false);
          return;
        }
      }
    }

    // Enhanced submission data logging
    // console.log('📋 FINAL SUBMISSION DATA:', {
    //   testId,
    //   totalQuestions,
    //   answeredQuestions: answeredCount,
    //   unansweredQuestions: unansweredCount,
    //   rejectedAnswers: actualRejectedCount,
    //   methodUsed,
    //   sampleAnswer: finalAnswers[0] || 'No answers',
    //   allAnswerIds: finalAnswers.map(a => ({ 
    //     id: a.questionId, 
    //     answer: a.selectedAnswer,
    //     origNum: a.originalQuestionNumber 
    //   }))
    // });

    const submissionData = {
      testId,
      answers: finalAnswers,
      totalQuestions: testRef.current.questions.length,
      answeredQuestions: finalAnswers.length,
      unansweredQuestions: testRef.current.questions.length - finalAnswers.length,
      timeSpent: (testRef.current.duration * 60) - timeLeftRef.current,
      testStartedAt,
      submittedAt: new Date().toISOString(), // Add submission timestamp
      status: 'completed' // Add completion status
    };

    try {
      const response = await api.post('/submissions', submissionData);

      // Clear pending data and localStorage on successful submission
      setPendingData(null);
      localStorage.removeItem(`test_progress_${testId}`);
      
      // Clear submission ID from localStorage
      localStorage.removeItem(`submission_id_${testId}`);

      const message = response.data.answeredQuestions
        ? `Test submitted! Answered ${response.data.answeredQuestions}/${response.data.totalQuestions} questions.`
        : 'Test submitted successfully!';

      toast.success(
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <div>
            <div className="font-medium">{message}</div>
          </div>
        </div>,
        { duration: 4000 }
      );
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
      console.error('Submission error:', error);

      // ✅ ENHANCED: Better error handling for submission
      if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        toast.error('Network error - submission will retry when connection is restored');
        // Keep the data for retry
        setTestSubmitted(false);
        return;
      }

      toast.error('Error submitting test. Please try again.');
      setTestSubmitted(false);
    }
  }, [testId, answers, reviewFlags, testStartedAt, navigate]);


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

  // Auto-save functionality - saves every 2 minutes
  useEffect(() => {
    if (!testStarted || testSubmitted) return;
    
    // Save immediately when test starts
    const saveImmediately = async () => {
      await saveToBackend(false); // Auto-save: don't show toast
    };
    
    // Set up interval for auto-save every 90 seconds
    const autoSaveInterval = setInterval(saveImmediately, 90000);
    
    // Trigger first save after 5 seconds to establish session
    setTimeout(saveImmediately, 5000);
    
    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [testStarted, testSubmitted, saveToBackend]); // Removed 'answers' to prevent interval reset

  const startTest = async () => {
    await startFreshTest();
  };

  // Enhanced answer handling with comprehensive validation and debugging
  const handleAnswerChange = (questionId, answerIndex) => {
    // Enhanced validation and type conversion
    let validatedAnswer = answerIndex;
    
    // Convert string numbers to actual numbers
    if (typeof answerIndex === 'string' && !isNaN(answerIndex)) {
      validatedAnswer = parseInt(answerIndex, 10);
    }
    
    // Comprehensive validation
    const isValidIndex = (
      validatedAnswer !== null &&
      validatedAnswer !== undefined &&
      !isNaN(validatedAnswer) &&
      typeof validatedAnswer === 'number' &&
      validatedAnswer >= 0 &&
      validatedAnswer <= 3 &&
      Number.isInteger(validatedAnswer)
    );

    if (isValidIndex) {
      // Update answers state with the validated number
      setAnswers(prev => {
        const newAnswers = { ...prev, [questionId]: validatedAnswer };
        return newAnswers;
      });
      
      // Remove review flag if answer is provided
      setReviewFlags(prev => {
        const newFlags = { ...prev };
        delete newFlags[questionId];
        return newFlags;
      });
      
    } else {
      // Alert user about the issue
      toast.error(`Answer validation failed for question. Please try selecting the option again.`, {
        duration: 5000
      });
    }
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
    const currentQuestion = test.questions[currentQuestionIndex];
    const questionId = currentQuestion._id;
    const hasAnswer = answers[questionId] !== undefined;

    if (hasAnswer) {
      setReviewFlags(prev => {
        const newFlags = { ...prev };
        delete newFlags[questionId];
        return newFlags;
      });
    }
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

  // ✅ ENHANCED: Loading screen with refresh recovery info
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
          <span className="ml-4 text-gray-600 block mt-4">
            {isRefreshRecovering ? 'Recovering your progress...' : 'Loading test...'}
          </span>
          {refreshAttempts > 0 && (
            <span className="text-sm text-gray-500 block mt-2">
              Recovery attempt {refreshAttempts}/3
            </span>
          )}
        </div>
      </div>
    );
  }

  // ✅ ENHANCED: Error screen with refresh retry option
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4 text-sm">{error}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-2 bg-gray-700 text-white"
              >
                Back to Dashboard
              </Button>
              {error.includes('Failed to load') && (
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1 py-2"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ REMOVED: Start fresh option from resume dialog
  if (showResumeDialog && savedProgress) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="w-5 h-5" />
              Resume Your Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <p><strong>Last saved:</strong> {new Date(savedProgress.lastSavedAt || savedProgress.timestamp).toLocaleString()}</p>
              <p><strong>Time left:</strong> {Math.floor(savedProgress.timeLeft / 60)}:{(savedProgress.timeLeft % 60).toString().padStart(2, '0')}</p>
              <p><strong>Progress:</strong> Question {savedProgress.currentQuestionIndex + 1} of {test?.questions?.length || 0}</p>
              <p><strong>Answers saved:</strong> {Object.keys(savedProgress.answers || {}).length}</p>
              <p><strong>Resume count:</strong> {savedProgress.resumeCount || 0}</p>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your test progress has been found. Click Resume to continue from where you left off.
                All your answers and progress are preserved.
              </AlertDescription>
            </Alert>

            <div className="flex justify-center">
              <Button
                onClick={resumeTest}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Resume Test
              </Button>
            </div>
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
                  <li>• Fullscreen mode available for better focus</li>
                  <li>• Ensure stable internet connection</li>
                  <li>• Progress is saved locally as you answer</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="flex gap-4">
              <Button
                onClick={startTest}
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
      {/* Header with Network Status Indicator */}
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
            {/* ✅ NEW: Network Status Indicator */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${networkStatus === 'online'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : networkStatus === 'offline'
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
              }`}>
              {networkStatus === 'online' ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span>Online</span>
                </>
              ) : networkStatus === 'offline' ? (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  <span>Slow</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={enterFullscreen}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Fullscreen</span>
            </Button>
            <div className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded border">
              <Clock className="h-4 w-4" />
              <span className="font-mono text-base">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Progress tracking UI with network status and better save info */}
      {testStarted && !testSubmitted && (
        <div className="bg-gray-100 border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  <span>
                    {lastBackendSavedAt
                      ? `Last saved: ${lastBackendSavedAt.toLocaleTimeString()}`
                      : 'Not saved to server yet'
                    }
                  </span>
                  {isSaving && <span className="text-blue-600">(Saving...)</span>}
                  {isRefreshRecovering && <span className="text-orange-600">(Recovering...)</span>}
                  {pendingData && <span className="text-yellow-600">(Pending sync)</span>}
                </div>
                {Object.keys(answers).length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    Answers: {Object.keys(answers).length}
                  </Badge>
                )}
                {networkStatus === 'offline' && (
                  <Badge variant="destructive" className="text-xs">
                    <WifiOff className="w-3 h-3 mr-1" />
                    Offline - Saved locally
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {pendingData && isOnline && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={manualSave}
                    disabled={isSaving}
                    className="text-xs px-3 py-1 h-7 bg-yellow-50 border-yellow-300 text-yellow-700"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Save Now
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={manualSave}
                  disabled={isSaving || networkStatus === 'offline'}
                  className="text-xs px-3 py-1 h-7"
                >
                  <Save className="w-3 h-3 mr-1" />
                  {isSaving ? 'Saving...' : 'Save Now'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md bg-white shadow-lg">
            <CardContent className="py-6 px-8 text-center space-y-4">
              <AlertTriangle className="mx-auto h-12 w-12 text-yellow-600" />
              <h3 className="font-bold text-lg text-gray-900">Submit Test</h3>
              <div className="text-gray-700 space-y-2">
                <p>Are you sure you want to submit your test?</p>
                <div className="text-sm bg-gray-50 p-3 rounded">
                  <p><span className="font-medium">Answered:</span> {Object.keys(answers).length} / {test?.questions?.length || 0} questions</p>
                  <p><span className="font-medium">Marked for Review:</span> {Object.keys(reviewFlags).length} questions</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowSubmitConfirmation(false)} className="flex-1">
                  Continue Test
                </Button>
                <Button onClick={handleSubmitTest} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                  Submit Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto flex" style={{ height: testStarted && !testSubmitted ? 'calc(100vh - 105px)' : 'calc(100vh - 56px)' }}>
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
                          onChange={() => {
                            // Enhanced validation for radio button
                            if (typeof index !== 'number' || index < 0 || index > 3) {
                              toast.error('Invalid option selected. Please try again.');
                              return;
                            }
                            handleAnswerChange(test.questions[currentQuestionIndex]._id, index);
                          }}
                          className="h-4 w-4 text-gray-600 accent-gray-600"
                        />
                        <span className="text-gray-800">{option}</span>
                      </label>
                    ))}
                  </div>
                  {/* Controls */}
                  <div className="flex gap-4 pt-4 border-t border-gray-200">
                    <Button
                      onClick={saveAndNext}
                      className="flex-1 py-3 bg-gray-700 text-white font-medium"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save & Next
                    </Button>
                    <Button
                      onClick={markForReviewAndNext}
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
              style={{ maxHeight: 'calc(100vh - 280px)' }}
            >
              <div className="grid grid-cols-6 gap-2">
                {test?.questions?.map((_, idx) => {
                  const status = getQuestionStatus(idx);
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => goToQuestion(idx)}
                      className={`w-10 h-10 rounded text-xs font-medium border transition-all
                        ${getStatusColor(status)}
                        ${isCurrent ? 'ring-2 ring-gray-400 border-gray-600 scale-105' : 'border-gray-300'}
                        hover:scale-105`
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
                disabled={testSubmitted}
                className="w-full py-2 bg-gray-800 text-white font-medium text-sm"
              >
                {testSubmitted ? 'Submitting...' : 'Submit Examination'}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default TakeTest;