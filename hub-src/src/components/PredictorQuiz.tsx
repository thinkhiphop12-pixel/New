import { useState } from 'react';
import { PREDICTIONS_TODAY, QUIZ_BANK } from '@/data/footballData';

interface Props {
  addXP: (amount: number, achievementId?: string) => void;
}

export default function PredictorQuiz({ addXP }: Props) {
  const [mode, setMode] = useState<'predict' | 'quiz'>('predict');
  const [predictions, setPredictions] = useState<Record<string, 'home' | 'draw' | 'away'>>({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});

  // Get 10 random quiz questions
  const [dailyQuiz] = useState(() => {
    const shuffled = [...QUIZ_BANK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  });

  const currentQuestion = dailyQuiz[quizIndex];

  const handlePrediction = (matchId: string, choice: 'home' | 'draw' | 'away') => {
    setPredictions(prev => ({ ...prev, [matchId]: choice }));
  };

  const submitPredictions = () => {
    let correct = 0;
    const newResults: Record<string, boolean> = {};
    // Simulate results
    Object.keys(predictions).forEach(key => {
      const isCorrect = Math.random() > 0.5;
      newResults[key] = isCorrect;
      if (isCorrect) correct++;
    });
    setResults(newResults);
    addXP(correct * 20, 'a3');
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizComplete(false);
    setSelectedAnswer(null);
  };

  const answerQuestion = (optionIdx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionIdx);
    const isCorrect = optionIdx === currentQuestion.correct;
    if (isCorrect) setQuizScore(prev => prev + 1);

    setTimeout(() => {
      if (quizIndex < 9) {
        setQuizIndex(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        setQuizComplete(true);
        const score = isCorrect ? quizScore + 1 : quizScore;
        const xpGain = score * 50;
        addXP(xpGain, score === 10 ? 'a7' : undefined);
      }
    }, 1000);
  };

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button onClick={() => setMode('predict')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'predict' ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-white/5 text-white/50'}`}>
          Predictions
        </button>
        <button onClick={() => setMode('quiz')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'quiz' ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-white/5 text-white/50'}`}>
          Daily Quiz
        </button>
      </div>

      {mode === 'predict' ? (
        <div className="glass-card p-6">
          <h2 className="text-2xl font-black text-white mb-4">Match Predictions</h2>
          <p className="text-sm text-white/50 mb-4">Predict today's matches and earn XP!</p>
          <div className="space-y-3">
            {PREDICTIONS_TODAY.map(pred => (
              <div key={pred.id} className="bg-white/5 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-white">{pred.match}</span>
                  <span className="text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded">{pred.league}</span>
                </div>
                <div className="flex gap-2">
                  {(['home', 'draw', 'away'] as const).map(choice => {
                    const isSelected = predictions[pred.id] === choice;
                    const hasResult = results[pred.id] !== undefined;
                    const isCorrect = results[pred.id];
                    let btnClass = 'flex-1 py-2 rounded-lg text-xs font-medium transition-all border ';
                    if (hasResult) {
                      btnClass += isCorrect && isSelected ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-white/30';
                    } else {
                      btnClass += isSelected ? 'bg-[#FFD700]/20 border-[#FFD700]/50 text-[#FFD700]' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10';
                    }
                    return (
                      <button key={choice} onClick={() => !hasResult && handlePrediction(pred.id, choice)} className={btnClass}>
                        {choice === 'home' ? `Home (${pred.homeOdds})` : choice === 'draw' ? `Draw (${pred.drawOdds})` : `Away (${pred.awayOdds})`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button onClick={submitPredictions} className="btn-gold w-full mt-4">Submit Predictions</button>
          {Object.keys(results).length > 0 && (
            <div className="mt-3 text-center text-sm text-[#FFD700]">
              Correct: {Object.values(results).filter(Boolean).length} / {Object.keys(results).length} · +{Object.values(results).filter(Boolean).length * 20} XP
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card p-6">
          <h2 className="text-2xl font-black text-white mb-4">Daily Quiz</h2>
          {!quizStarted ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">⚽</div>
              <p className="text-white/60 mb-2">10 questions · 50 XP per correct answer</p>
              <p className="text-white/40 text-sm mb-6">Perfect score = 500 XP bonus!</p>
              <button onClick={startQuiz} className="btn-gold px-8 py-3">Start Quiz</button>
            </div>
          ) : quizComplete ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">{quizScore >= 8 ? '🏆' : quizScore >= 5 ? '👍' : '📚'}</div>
              <h3 className="text-2xl font-bold text-white mb-2">Quiz Complete!</h3>
              <p className="text-lg text-[#FFD700] mb-4">{quizScore} / 10 correct</p>
              <p className="text-white/50 mb-6">+{quizScore * 50} XP earned</p>
              <button onClick={startQuiz} className="btn-gold px-6 py-2 mr-2">Try Again</button>
              <button onClick={() => setMode('predict')} className="px-6 py-2 bg-white/5 rounded-lg text-sm text-white/60 hover:bg-white/10 transition-all">Back</button>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-white/40">Question {quizIndex + 1} of 10</span>
                <span className="text-xs text-[#FFD700]">Score: {quizScore}</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full mb-6">
                <div className="h-full bg-[#FFD700] rounded-full transition-all" style={{ width: `${((quizIndex + 1) / 10) * 100}%` }} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{currentQuestion.question}</h3>
              <div className="flex gap-1 mb-4">
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40">{currentQuestion.difficulty}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFD700]/10 text-[#FFD700]/60">{currentQuestion.category}</span>
              </div>
              <div className="space-y-2">
                {currentQuestion.options.map((opt, i) => {
                  let btnClass = 'w-full text-left p-3 rounded-lg border transition-all text-sm ';
                  if (selectedAnswer === null) {
                    btnClass += 'bg-white/5 border-white/10 text-white hover:bg-white/10';
                  } else if (i === currentQuestion.correct) {
                    btnClass += 'bg-green-500/20 border-green-500/50 text-green-400';
                  } else if (i === selectedAnswer) {
                    btnClass += 'bg-red-500/20 border-red-500/50 text-red-400';
                  } else {
                    btnClass += 'bg-white/5 border-white/10 text-white/30';
                  }
                  return (
                    <button key={i} onClick={() => answerQuestion(i)} disabled={selectedAnswer !== null} className={btnClass}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
