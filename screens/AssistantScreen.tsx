import React, { useState, useEffect, useRef } from 'react';
import { getAllItems, createAssistantChat } from '../services/geminiService';
import type { FeedItem } from '../types';
import type { Chat } from '@google/genai';
import { SendIcon } from '../components/icons';
import MarkdownRenderer from '../components/MarkdownRenderer';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const AssistantScreen: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const allItems = await getAllItems();
        const chatSession = createAssistantChat(allItems);
        setChat(chatSession);
        
        // The createAssistantChat function now includes the introductory message in its history.
        const initialHistory = (await chatSession.getHistory()).map((h, i) => ({
             id: `initial-${i}`,
             role: h.role as 'user' | 'model',
             text: h.parts[0].text || ''
        }));
        
        // We only want to show the model's welcome message, not the context prompt.
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
        const stream = await chat.sendMessageStream(userMessage.text);

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
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
    </div>
  );

  return (
    <div className="pt-4 flex flex-col h-[calc(100vh-80px)]">
      <header className="mb-4 -mx-4 px-4">
        <h1 className="text-3xl font-bold text-gray-100">יועץ אישי</h1>
        <p className="text-sm text-gray-400 mt-1">שאל שאלות על הספארקים והפידים שלך</p>
      </header>
      
      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4 pb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-gray-800 text-gray-200 rounded-bl-lg'}`}>
               <MarkdownRenderer content={msg.text} />
            </div>
          </div>
        ))}
         {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
            <div className="flex justify-start">
                <div className="bg-gray-800 rounded-2xl rounded-bl-lg">
                    <TypingIndicator/>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto pt-2 pb-1 border-t border-[var(--border-color)] bg-gray-900/50 backdrop-blur-sm -mx-4 px-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="שאל את Sparky..."
            className="flex-1 w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-full p-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-3 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all transform hover:scale-110 active:scale-95"
            aria-label="שלח הודעה"
          >
            <SendIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssistantScreen;