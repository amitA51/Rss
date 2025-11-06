import React, { useState, useEffect, useMemo, useContext, useRef, useCallback } from 'react';
import type { PersonalItem } from '../types';
import { AppContext } from '../state/AppContext';
import { PlayIcon, PauseIcon, SkipNextIcon, StopIcon } from './icons';

interface SessionTimerProps {
  item: PersonalItem;
  onEndSession: (loggedDuration?: number, isCancel?: boolean) => void;
}

type IntervalType = 'work' | 'short-break' | 'long-break' | 'workout-set';

const SessionTimer: React.FC<SessionTimerProps> = ({ item, onEndSession }) => {
    const { state } = useContext(AppContext);
    const { intervalTimerSettings, pomodoroSettings } = state.settings;
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isPomodoro = item.type !== 'workout';

    const sessionPlan = useMemo(() => {
        const plan: { type: IntervalType; duration: number; label: string }[] = [];
        if (isPomodoro) {
            for (let i = 1; i <= pomodoroSettings.sessionsUntilLongBreak; i++) {
                plan.push({ type: 'work', duration: pomodoroSettings.workDuration * 60, label: `פוקוס #${i}`});
                if (i < pomodoroSettings.sessionsUntilLongBreak) {
                    plan.push({ type: 'short-break', duration: pomodoroSettings.shortBreak * 60, label: 'הפסקה קצרה'});
                } else {
                    plan.push({ type: 'long-break', duration: pomodoroSettings.longBreak * 60, label: 'הפסקה ארוכה'});
                }
            }
        } else { // Workout plan logic
            if (item.exercises && item.exercises.length > 0) {
                item.exercises.forEach((ex, exIndex) => {
                    for (let i = 0; i < ex.sets.length; i++) {
                        plan.push({ type: 'workout-set', duration: 0, label: `${ex.name} - סט ${i + 1}` });
                        if (i < ex.sets.length - 1) {
                            plan.push({ type: 'short-break', duration: intervalTimerSettings.restDuration, label: 'מנוחה' });
                        }
                    }
                    if (exIndex < item.exercises!.length - 1) {
                        plan.push({ type: 'long-break', duration: intervalTimerSettings.restDuration * 2, label: 'מנוחה בין תרגילים' });
                    }
                });
            }
        }
        return plan;
    }, [item, intervalTimerSettings, pomodoroSettings, isPomodoro]);

    const [currentIntervalIndex, setCurrentIntervalIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(sessionPlan[0].duration);
    const [isRunning, setIsRunning] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    const [totalWorkSeconds, setTotalWorkSeconds] = useState(0);
    
    const currentInterval = sessionPlan[currentIntervalIndex];

    const advanceToNextInterval = useCallback((forceFinish = false) => {
        setIsRunning(false);
        const isLastInterval = currentIntervalIndex >= sessionPlan.length - 1;

        if (forceFinish || isLastInterval) {
            setIsFinished(true);
            if (audioRef.current) audioRef.current.play();
            if (isPomodoro) {
                onEndSession(Math.round(totalWorkSeconds / 60));
            }
        } else {
            const nextIndex = currentIntervalIndex + 1;
            setCurrentIntervalIndex(nextIndex);
            const nextInterval = sessionPlan[nextIndex];
            setTimeLeft(nextInterval.duration);
            if (nextInterval.duration > 0 && (intervalTimerSettings.autoStartNext || isPomodoro)) {
                setIsRunning(true);
            }
        }
    }, [currentIntervalIndex, sessionPlan, intervalTimerSettings.autoStartNext, isPomodoro, onEndSession, totalWorkSeconds]);

    useEffect(() => {
        audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
        
        const firstIntervalDuration = sessionPlan[0]?.duration || 0;
        setTimeLeft(firstIntervalDuration);
        
        if (firstIntervalDuration === 0) {
             setIsRunning(false); // Pause for user to start workout set
        } else {
             setIsRunning(true);
        }

    }, [sessionPlan]);


    useEffect(() => {
        if (!isRunning || isFinished) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                 if (currentInterval.type === 'work') {
                    setTotalWorkSeconds(s => s + 1);
                }
                if (prev <= 1) {
                    clearInterval(timer);
                    if (audioRef.current) audioRef.current.play();
                    advanceToNextInterval();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isRunning, advanceToNextInterval, isFinished, currentInterval.type]);

    const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const seconds = String(timeLeft % 60).padStart(2, '0');
    const progress = currentInterval.duration > 0 ? (timeLeft / currentInterval.duration) : 1;
    const circumference = 2 * Math.PI * 120;
    const strokeDashoffset = circumference * (1 - progress);

    const handlePlayPause = () => {
        if (currentInterval.type === 'workout-set') { // Manual start for workout set
            advanceToNextInterval();
        } else {
            setIsRunning(!isRunning);
        }
    }
    
    // For non-pomodoro, user clicks this to finish
    const handleFinishWorkout = () => {
        onEndSession(Math.round(totalWorkSeconds / 60));
    }
    
    // User cancels session, no time logged
    const handleCancelSession = () => {
        onEndSession(undefined, true);
    }
    
    const isBreak = currentInterval.type.includes('break');

    return (
        <div className={`fixed inset-0 bg-[var(--bg-primary)] z-50 flex flex-col items-center justify-between p-8 text-white animate-screen-enter transition-colors duration-500 ${isBreak ? 'bg-blue-900/20' : ''}`}>
            <div className="text-center">
                <h1 className="text-4xl font-bold">{item.title}</h1>
                <p className="text-xl text-[var(--text-secondary)] mt-2">{isFinished ? "הסשן הושלם!" : currentInterval.label}</p>
            </div>
            
            <div className="relative w-80 h-80 flex items-center justify-center" style={{ filter: `drop-shadow(0 0 20px var(--dynamic-accent-glow))`}}>
                <svg className="w-full h-full" viewBox="0 0 250 250">
                    <circle className="text-white/10" stroke="currentColor" strokeWidth="8" fill="transparent" r="120" cx="125" cy="125" />
                    <circle 
                        stroke={isBreak ? "#60A5FA" : "url(#progress-gradient)"}
                        strokeWidth="8" fill="transparent" r="120" cx="125" cy="125" 
                        strokeLinecap="round"
                        transform="rotate(-90 125 125)"
                        style={{ strokeDasharray: circumference, strokeDashoffset, transition: 'stroke-dashoffset 1s linear' }}
                    />
                    <defs>
                        <linearGradient id="progress-gradient">
                            <stop offset="0%" stopColor="var(--dynamic-accent-start)"/>
                            <stop offset="100%" stopColor="var(--dynamic-accent-end)"/>
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    {currentInterval.duration > 0 && !isFinished && (
                        <span className="font-mono font-bold text-8xl tracking-tighter">{minutes}:{seconds}</span>
                    )}
                     {isFinished && <span className="text-6xl font-bold">מעולה!</span>}
                     {currentInterval.type === 'workout-set' && !isFinished && <span className="text-5xl font-bold">מוכן?</span>}
                </div>
            </div>

            {isFinished ? (
                 <button onClick={() => onEndSession(Math.round(totalWorkSeconds/60))} className="bg-[var(--accent-gradient)] text-black font-bold py-4 px-12 rounded-full text-xl transition-transform transform active:scale-95 shadow-[0_4px_20px_var(--dynamic-accent-glow)]">
                    סיים וחזור
                </button>
            ) : (
                <div className="flex items-center justify-center gap-6">
                     <button onClick={handleCancelSession} className="bg-white/10 text-white p-5 rounded-full transition-transform transform active:scale-95">
                        <StopIcon className="w-8 h-8"/>
                    </button>
                    <button onClick={handlePlayPause} className="bg-[var(--accent-gradient)] text-black p-7 rounded-full transition-transform transform active:scale-95 shadow-[0_4px_20px_var(--dynamic-accent-glow)]">
                       {isRunning ? <PauseIcon className="w-10 h-10"/> : <PlayIcon className="w-10 h-10"/>}
                    </button>
                    <button onClick={() => advanceToNextInterval(false)} className="bg-white/10 text-white p-5 rounded-full transition-transform transform active:scale-95">
                        <SkipNextIcon className="w-8 h-8"/>
                    </button>
                </div>
            )}
        </div>
    );
};

export default SessionTimer;