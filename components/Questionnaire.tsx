
import React, { useState, useEffect } from 'react';
import { Question, Answer } from '../types';
import { CONSTITUTION_QUESTIONS } from '../constants';
import { ArrowRightIcon } from './icons';

interface QuestionnaireProps {
  onComplete: (answers: Answer[]) => void;
  onCancel: () => void;
}

const Questionnaire: React.FC<QuestionnaireProps> = ({ onComplete, onCancel }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  
  const currentQuestion = CONSTITUTION_QUESTIONS[currentQuestionIndex];
  
  const isFinalQuestion = currentQuestionIndex === CONSTITUTION_QUESTIONS.length - 1;

  useEffect(() => {
    if (answers.length === CONSTITUTION_QUESTIONS.length) {
        onComplete(answers);
    }
  }, [answers, onComplete]);


  const handleAnswer = (answer: string) => {
    const updatedAnswers = answers.filter(a => a.questionId !== currentQuestion.id);
    const newAnswers = [...updatedAnswers, { questionId: currentQuestion.id, answer }];
    setAnswers(newAnswers);

    if (!isFinalQuestion) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
        // The useEffect will catch the completion and call onComplete
    }
  };

  const progress = ((currentQuestionIndex + (isFinalQuestion && answers.length === CONSTITUTION_QUESTIONS.length ? 1 : 0)) / CONSTITUTION_QUESTIONS.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-secondary rounded-lg shadow-2xl w-full max-w-2xl transform transition-all">
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-brand-text mb-2">Create New AI Member</h2>
            <p className="text-brand-light">Complete the Character Profile to craft a new member of society.</p>
            <div className="w-full bg-brand-accent rounded-full h-2.5 mt-4">
              <div className="bg-brand-blue h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
            </div>
          </div>
          
          <div>
            {currentQuestionIndex < CONSTITUTION_QUESTIONS.length && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-brand-text">
                  Question {currentQuestionIndex + 1}/{CONSTITUTION_QUESTIONS.length}:
                </h3>
                <p className="text-xl mb-6 text-brand-text">{currentQuestion.text}</p>
                {currentQuestion.type === 'yes-no' && (
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => handleAnswer('Yes')}
                      className="flex-1 bg-brand-action hover:bg-opacity-80 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnswer('No')}
                      className="flex-1 bg-brand-red hover:bg-opacity-80 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105"
                    >
                      No
                    </button>
                  </div>
                )}
                {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleAnswer(option)}
                        className="w-full text-left bg-brand-accent hover:bg-brand-light text-brand-text font-semibold py-3 px-5 rounded-lg transition-colors flex justify-between items-center"
                      >
                        {option}
                        <ArrowRightIcon className="h-5 w-5 opacity-70" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
             <div className="mt-8 flex justify-between items-center">
              <button
                type="button"
                onClick={onCancel}
                className="text-brand-light hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Questionnaire;