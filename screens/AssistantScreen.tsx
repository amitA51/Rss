import React, { useState, useEffect, useRef } from 'react';
import type { Screen } from '../types';
import { createAssistantChat } from '../services/geminiService';
import type { Chat } from '@google/genai';
import { SendIcon, SettingsIcon } from '../components/icons';
import MarkdownRenderer from '../components/MarkdownRenderer';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface AssistantScreenProps {
    setActiveScreen: (screen: Screen) => void;
}

const AssistantScreen: React.FC<AssistantScreenProps> = ({ setActiveScreen }) => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const chatSession = await createAssistantChat();
        setChat(chatSession);
        
        const initialHistory = (await chatSession.getHistory()).map((h, i) => ({
             id: `initial-${i}`,
             role: h.role as 'user' | 'model',
             text: h.parts[0].text || ''
        }));
        
        const modelMessages = initialHistory.filter(m => m.role === 'model');
        if (modelMessages.length > 0) {
           setMessages(modelMessages);
        }

      } catch (error) {
        console.error("Failed to initialize assistant chat:", error);
        setMessages([{id: 'error', role: 'model', text: 'שגיאה בהפעלת היועץ. נסה שוב מאוחר יותר.'}])
      } finally {
        setIsLoading(false);
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !chat || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
        const stream = await chat.sendMessageStream({ message: userMessage.text });

        let modelResponse = '';
        const modelMessageId = `model-${Date.now()}`;

        // Add a placeholder for the model's message
        setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);
        
        for await (const chunk of stream) {
            modelResponse += chunk.text;
            // Update the model's message in the state as it streams in
            setMessages(prev => prev.map(msg => 
                msg.id === modelMessageId ? { ...msg, text: modelResponse } : msg
            ));
        }

    } catch (error) {
      console.error("Failed to get assistant response:", error);
      const errorMessage: Message = { id: `error-${Date.now()}`, role: 'model', text: 'התנצלותי, נתקלתי בשגיאה.'};
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const TypingIndicator = () => (
    <div className="flex items-center space-x-1 p-3">
        <div className="w-2 h-2 bg-[var(--accent-start)] rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-[var(--accent-start)] rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-[var(--accent-start)] rounded-full animate-pulse"></div>
    </div>
  );

  return (
    <div className="pt-4 flex flex-col h-[calc(100vh-80px)] px-4">
      <header className="flex justify-between items-center mb-4 px-4 sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md py-3 z-20 border-b border-[var(--border-primary)] -mx-4">
        <div>
            <h1 className="text-3xl font-bold text-white">יועץ אישי</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">שאל שאלות על הספארקים והפידים שלך</p>
        </div>
         <button 
            onClick={() => setActiveScreen('settings')}
            className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors"
            aria-label="הגדרות"
        >
            <SettingsIcon className="w-6 h-6"/>
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-6 pb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl p-4 rounded-3xl shadow-md ${msg.role === 'user' ? 'bg-[var(--bg-card)] text-white rounded-br-lg' : 'bg-[var(--bg-secondary)] text-gray-200 rounded-bl-lg'}`}>
               <MarkdownRenderer content={msg.text} />
            </div>
          </div>
        ))}
         {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
            <div className="flex justify-start">
                <div className="bg-[var(--bg-secondary)] rounded-3xl rounded-bl-lg">
                    <TypingIndicator/>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto pt-4 pb-2 bg-[var(--bg-primary)]">
        <div className="flex items-center space-x-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-full p-2 shadow-lg">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="הקלד כאן..."
            className="flex-1 w-full bg-transparent text-white py-2 px-3 focus:outline-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="bg-[var(--accent-gradient)] text-white rounded-full p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-110 active:scale-95"
            aria-label="שלח הודעה"
          >
            <SendIcon className="h-5 w-5 -rotate-45" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssistantScreen;