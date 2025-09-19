// Critical fixes for empty answers array bug
// Apply these changes to TakeTest.jsx

// ✅ FIX 1: Add answers state protection with useRef
const answersRef = useRef({});
const reviewFlagsRef = useRef({});

// Update refs when state changes
useEffect(() => { answersRef.current = answers; }, [answers]);
useEffect(() => { reviewFlagsRef.current = reviewFlags; }, [reviewFlags]);

// ✅ FIX 2: Enhanced handleAnswerChange with state protection
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
    // ✅ CRITICAL: Use functional update with protection
    setAnswers(prev => {
      // Protect against state corruption
      const safePrev = prev || {};
      const newAnswers = { ...safePrev, [questionId]: validatedAnswer };
      
      // ✅ CRITICAL: Immediate localStorage backup
      try {
        const backupData = {
          testId,
          answers: newAnswers,
          timestamp: new Date().toISOString(),
          questionId,
          answerValue: validatedAnswer
        };
        localStorage.setItem(`answers_backup_${testId}`, JSON.stringify(backupData));
      } catch (e) {
        console.error('Failed to backup answer:', e);
      }
      
      return newAnswers;
    });
    
    // Remove review flag if answer is provided
    setReviewFlags(prev => {
      const safePrev = prev || {};
      const newFlags = { ...safePrev };
      delete newFlags[questionId];
      return newFlags;
    });
    
    // ✅ CRITICAL: Immediate validation and logging
    setTimeout(() => {
      const currentAnswers = answersRef.current;
      if (!currentAnswers[questionId]) {
        console.error('❌ CRITICAL: Answer was lost after setting!', {
          questionId,
          answerIndex: validatedAnswer,
          currentState: currentAnswers,
          allKeys: Object.keys(currentAnswers)
        });
        
        // Emergency recovery attempt
        setAnswers(prev => ({ ...prev, [questionId]: validatedAnswer }));
      }
    }, 100);
    
  } else {
    // Alert user about the issue
    toast.error(`Answer validation failed for question. Please try selecting the option again.`, {
      duration: 5000
    });
  }
};

// ✅ FIX 3: Protected saveToLocalStorage with multiple backups
const saveToLocalStorage = useCallback(() => {
  if (!testStarted || testSubmitted || !test) return;

  try {
    // Use refs for most current data
    const currentAnswers = answersRef.current || answers;
    const currentReviewFlags = reviewFlagsRef.current || reviewFlags;
    
    const saveData = {
      testId,
      answers: currentAnswers,
      reviewFlags: currentReviewFlags,
      currentQuestionIndex,
      timeLeft: timeLeftRef.current,
      testStartedAt,
      lastSavedAt: new Date().toISOString(),
      answerCount: Object.keys(currentAnswers).length, // Add count for validation
      testStructure: {
        ...test,
        questions: test.questions.map((q, index) => ({
          ...q,
          originalQuestionNumber: q.originalQuestionNumber || index + 1,
          shuffledToOriginal: q.shuffledToOriginal || []
        }))
      }
    };

    // ✅ CRITICAL: Multiple localStorage saves for redundancy
    localStorage.setItem(`test_progress_${testId}`, JSON.stringify(saveData));
    localStorage.setItem(`test_progress_backup_${testId}`, JSON.stringify(saveData));
    localStorage.setItem(`answers_only_${testId}`, JSON.stringify(currentAnswers));
    
    // ✅ Add timestamp tracking
    localStorage.setItem(`last_save_${testId}`, new Date().toISOString());
    
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}, [testId, answers, reviewFlags, currentQuestionIndex, testStartedAt, test, testStarted, testSubmitted]);

// ✅ FIX 4: Enhanced loadFromLocalStorage with recovery
const loadFromLocalStorage = useCallback(() => {
  try {
    // Try primary storage first
    let savedData = localStorage.getItem(`test_progress_${testId}`);
    let parsed = null;
    
    if (savedData) {
      parsed = JSON.parse(savedData);
    } else {
      // Try backup storage
      savedData = localStorage.getItem(`test_progress_backup_${testId}`);
      if (savedData) {
        parsed = JSON.parse(savedData);
        console.log('🔄 Recovered from backup localStorage');
      }
    }
    
    if (parsed) {
      // Validate and clean answers
      const validatedAnswers = validateAnswersObject(parsed.answers || {});
      
      // ✅ CRITICAL: Double-check with answers-only backup
      if (Object.keys(validatedAnswers).length === 0) {
        const answersOnly = localStorage.getItem(`answers_only_${testId}`);
        if (answersOnly) {
          const backupAnswers = JSON.parse(answersOnly);
          const validatedBackup = validateAnswersObject(backupAnswers);
          if (Object.keys(validatedBackup).length > 0) {
            console.log('🔄 Recovered answers from answers-only backup');
            setAnswers(validatedBackup);
          }
        }
      } else {
        setAnswers(validatedAnswers);
      }
      
      setReviewFlags(parsed.reviewFlags || {});
      setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
      setTimeLeft(parsed.timeLeft || 0);
      setTestStartedAt(parsed.testStartedAt);
      setLastSavedAt(parsed.lastSavedAt ? new Date(parsed.lastSavedAt) : null);

      if (parsed.testStructure) {
        setTest(parsed.testStructure);
      }

      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    
    // ✅ Try emergency answer recovery
    try {
      const emergencyAnswers = localStorage.getItem(`answers_backup_${testId}`);
      if (emergencyAnswers) {
        const backup = JSON.parse(emergencyAnswers);
        if (backup.answers && Object.keys(backup.answers).length > 0) {
          console.log('🚨 Emergency answer recovery successful');
          setAnswers(backup.answers);
          return true;
        }
      }
    } catch (e) {
      console.error('Emergency recovery failed:', e);
    }
    
    return false;
  }
}, [testId, validateAnswersObject]);

// ✅ FIX 5: Protected auto-save with answer verification
useEffect(() => {
  if (!testStarted || testSubmitted) return;

  const autoSaveInterval = setInterval(() => {
    // ✅ Verify answers exist before saving
    const currentAnswers = answersRef.current || answers;
    if (Object.keys(currentAnswers).length > 0) {
      saveToLocalStorage();
    } else {
      console.warn('⚠️ Auto-save skipped: no answers to save');
    }
  }, 30000); // Save every 30 seconds

  return () => clearInterval(autoSaveInterval);
}, [testStarted, testSubmitted, answers]); // Include answers in dependency

// ✅ FIX 6: Enhanced handleSubmitTest with answer recovery
const handleSubmitTest = useCallback(async () => {
  if (testSubmittedRef.current) return;
  
  // ✅ CRITICAL: Use multiple sources for answers
  let finalAnswersObject = answersRef.current || answers || {};
  
  // ✅ Emergency recovery if answers are empty
  if (Object.keys(finalAnswersObject).length === 0) {
    console.warn('🚨 Answers empty during submission - attempting recovery');
    
    try {
      // Try localStorage recovery
      const emergencyData = localStorage.getItem(`answers_only_${testId}`);
      if (emergencyData) {
        const recovered = JSON.parse(emergencyData);
        finalAnswersObject = validateAnswersObject(recovered);
        console.log('🔄 Recovered answers for submission:', Object.keys(finalAnswersObject).length);
      }
      
      // Try backup recovery
      if (Object.keys(finalAnswersObject).length === 0) {
        const backupData = localStorage.getItem(`answers_backup_${testId}`);
        if (backupData) {
          const backup = JSON.parse(backupData);
          finalAnswersObject = validateAnswersObject(backup.answers || {});
          console.log('🔄 Recovered from backup for submission:', Object.keys(finalAnswersObject).length);
        }
      }
    } catch (e) {
      console.error('Recovery attempt failed:', e);
    }
  }
  
  // Enhanced test data validation
  if (!testRef.current || !testRef.current.questions || !Array.isArray(testRef.current.questions) || testRef.current.questions.length === 0) {
    toast.error('Test data not loaded properly. Please refresh and try again.');
    setTestSubmitted(false);
    return;
  }
  
  setTestSubmitted(true);

  // Enhanced answer collection with recovery data
  const validAnswers = [];
  
  // Process recovered answers
  Object.entries(finalAnswersObject).forEach(([questionId, selectedAnswer]) => {
    const question = testRef.current.questions.find(q => q._id === questionId);
    if (!question) return;
    
    const questionIndex = testRef.current.questions.findIndex(q => q._id === questionId);
    
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
      validAnswers.push({
        questionId,
        selectedAnswer: validatedAnswer,
        markedForReview: reviewFlagsRef.current[questionId] || false,
        originalQuestionNumber: question.originalQuestionNumber || (questionIndex + 1),
        shuffledPosition: questionIndex + 1,
        shuffledToOriginal: question.shuffledToOriginal || [0, 1, 2, 3]
      });
    }
  });
  
  // ✅ CRITICAL: Log submission data for debugging
  console.log('📋 SUBMISSION DEBUG:', {
    totalQuestions: testRef.current.questions.length,
    answersInState: Object.keys(answers).length,
    answersInRef: Object.keys(answersRef.current).length,
    answersRecovered: Object.keys(finalAnswersObject).length,
    validAnswersForSubmission: validAnswers.length,
    sampleValidAnswer: validAnswers[0] || 'None'
  });
  
  // Continue with rest of submission logic...
  const submissionData = {
    testId,
    answers: validAnswers,
    totalQuestions: testRef.current.questions.length,
    answeredQuestions: validAnswers.length,
    unansweredQuestions: testRef.current.questions.length - validAnswers.length,
    timeSpent: (testRef.current.duration * 60) - timeLeftRef.current,
    testStartedAt,
    submittedAt: new Date().toISOString(),
    status: 'completed'
  };

  try {
    const response = await api.post('/submissions', submissionData);

    // Clear all localStorage data on successful submission
    localStorage.removeItem(`test_progress_${testId}`);
    localStorage.removeItem(`test_progress_backup_${testId}`);
    localStorage.removeItem(`answers_only_${testId}`);
    localStorage.removeItem(`answers_backup_${testId}`);
    localStorage.removeItem(`submission_id_${testId}`);
    localStorage.removeItem(`last_save_${testId}`);

    const message = response.data.answeredQuestions
      ? `Test submitted! Answered ${response.data.answeredQuestions}/${response.data.totalQuestions} questions.`
      : 'Test submitted successfully!';

    toast.success(message, { duration: 4000 });
    setTimeout(() => navigate('/dashboard'), 1500);
  } catch (error) {
    console.error('Submission error:', error);
    toast.error('Error submitting test. Please try again.');
    setTestSubmitted(false);
  }
}, [testId, answers, reviewFlags, testStartedAt, navigate]);

// ✅ FIX 7: Add emergency debugging function for production
window.debugAnswers = () => {
  const current = answersRef.current || {};
  const state = answers || {};
  
  console.log('🔍 ANSWER DEBUG:', {
    'Ref Count': Object.keys(current).length,
    'State Count': Object.keys(state).length,
    'Ref Answers': current,
    'State Answers': state,
    'LocalStorage Primary': localStorage.getItem(`test_progress_${testId}`),
    'LocalStorage Backup': localStorage.getItem(`answers_only_${testId}`)
  });
  
  return { current, state };
};
