import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot, User, Settings, Palette, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// Types for the chatbot
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface AIChatbotProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
  onPositionChange?: (position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
}

// Placeholder functions for future integration
const getUserLoginStatus = () => {
  // This will be replaced with actual auth integration
  return null;
};

const getBotResponse = async (message: string): Promise<string> => {
  // Placeholder function - will be replaced with RAG API integration
  const responses = [
    "I'm here to help you with your property management needs! How can I assist you today?",
    "That's a great question about property management. Let me help you with that.",
    "I can help you with rent collection, tenant management, property maintenance, and more. What would you like to know?",
    "For property-related queries, I can provide information about rent calculations, lease agreements, and property maintenance schedules.",
    "I'm designed to help property owners like you manage their investments more effectively. What specific area would you like assistance with?",
    "I can assist with payment tracking, document management, tenant communication, and property analytics. What do you need help with?",
  ];
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  
  return responses[Math.floor(Math.random() * responses.length)];
};

export const AIChatbot: React.FC<AIChatbotProps> = ({ 
  position = 'bottom-right',
  className = '',
  onPositionChange
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [customPosition, setCustomPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fontColor, setFontColor] = useState('#053725');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatButtonRef = useRef<HTMLButtonElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('ai-chatbot-messages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Error loading saved messages:', error);
      }
    } else {
      // Add welcome message if no saved messages
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        text: user 
          ? `Hi ${user.name || 'there'}, welcome back! How can I help you with your property management today?`
          : "Hi there! How can I help you today?",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [user]);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai-chatbot-messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const botResponse = await getBotResponse(userMessage.text);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error getting bot response:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble responding right now. Please try again later.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('ai-chatbot-messages');
    // Add welcome message after clearing
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      text: user 
        ? `Hi ${user.name || 'there'}, welcome back! How can I help you with your property management today?`
        : "Hi there! How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleFontColorChange = (color: string) => {
    setFontColor(color);
  };

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if clicking on the header or button, not on input fields
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('input') || target.closest('textarea')) {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Get the element being dragged (button or window)
    const draggedElement = chatButtonRef.current || chatWindowRef.current;
    const elementWidth = draggedElement?.offsetWidth || 56;
    const elementHeight = draggedElement?.offsetHeight || 56;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - elementWidth;
    const maxY = window.innerHeight - elementHeight;
    
    const boundedX = Math.max(0, Math.min(newX, maxX));
    const boundedY = Math.max(0, Math.min(newY, maxY));
    
    setCustomPosition({ x: boundedX, y: boundedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset to default position when chat is closed
  const handleCloseChat = () => {
    setIsOpen(false);
    setCustomPosition(null); // Reset to default position
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, dragOffset]);

  // Position classes and styles
  const getPositionStyles = () => {
    if (customPosition) {
      return {
        position: 'fixed' as const,
        left: `${customPosition.x}px`,
        top: `${customPosition.y}px`,
        right: 'auto',
        bottom: 'auto'
      };
    }
    
    switch (position) {
      case 'top-left':
        return { position: 'fixed' as const, top: '1rem', left: '1rem', right: 'auto', bottom: 'auto' };
      case 'top-right':
        return { position: 'fixed' as const, top: '1rem', right: '1rem', left: 'auto', bottom: 'auto' };
      case 'bottom-left':
        return { position: 'fixed' as const, bottom: '1rem', left: '1rem', right: 'auto', top: 'auto' };
      case 'bottom-right':
      default:
        return { position: 'fixed' as const, bottom: '1rem', right: '1rem', left: 'auto', top: 'auto' };
    }
  };

  return (
    <div 
      className={`z-50 ${className}`}
      style={getPositionStyles()}
    >
      {/* Chat Window */}
      {isOpen && (
        <div 
          ref={chatWindowRef}
          onMouseDown={handleMouseDown}
          className={`mb-4 w-80 h-96 sm:w-96 sm:h-[28rem] backdrop-blur-xl border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-300 ${isDragging ? 'cursor-grabbing scale-105 shadow-3xl' : 'cursor-grab'} transition-all ${
            isDarkMode 
              ? 'bg-gray-900/90 border-gray-700/20' 
              : 'bg-white/90 border-[#053725]/20'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 text-[#F9F7E7] ${
            isDarkMode 
              ? 'bg-gradient-to-r from-gray-800 to-gray-900' 
              : 'bg-gradient-to-r from-[#053725] to-[#053725]/90'
          }`}>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#F9F7E7]/20 rounded-full flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Assistant</h3>
                <p className="text-xs text-[#F9F7E7]/80">Property Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-[#F9F7E7]/60">
              <div className="w-1 h-1 bg-current rounded-full"></div>
              <div className="w-1 h-1 bg-current rounded-full"></div>
              <div className="w-1 h-1 bg-current rounded-full"></div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 hover:bg-[#F9F7E7]/20 rounded-md transition-colors"
                title="Settings"
              >
                <Settings size={14} />
              </button>
              <button
                onClick={handleCloseChat}
                className="p-1 hover:bg-[#F9F7E7]/20 rounded-md transition-colors"
                title="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className={`p-4 border-b ${
              isDarkMode 
                ? 'bg-gray-800/30 border-gray-700/10' 
                : 'bg-[#F9F7E7]/30 border-[#053725]/10'
            }`}>
              <div className="space-y-4">
                {/* Theme Toggle */}
                <div className="space-y-2">
                  <div className={`flex items-center space-x-2 text-sm ${
                    isDarkMode ? 'text-gray-200' : 'text-[#053725]'
                  }`}>
                    {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                    <span className="font-medium">Theme</span>
                  </div>
                  <button
                    onClick={handleThemeToggle}
                    className={`w-full px-3 py-2 text-xs rounded-lg transition-all flex items-center justify-center space-x-2 ${
                      isDarkMode
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-[#F9F7E7]/50 text-[#053725] hover:bg-[#F9F7E7]/80'
                    }`}
                  >
                    {isDarkMode ? <Moon size={14} /> : <Sun size={14} />}
                    <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                  </button>
                </div>

                {/* Font Color */}
                <div className="space-y-2">
                  <div className={`flex items-center space-x-2 text-sm ${
                    isDarkMode ? 'text-gray-200' : 'text-[#053725]'
                  }`}>
                    <Palette size={16} />
                    <span className="font-medium">Font Color</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { color: '#053725', name: 'Dark Green' },
                      { color: '#1f2937', name: 'Dark Gray' },
                      { color: '#7c3aed', name: 'Purple' },
                      { color: '#dc2626', name: 'Red' },
                      { color: '#059669', name: 'Green' },
                      { color: '#0ea5e9', name: 'Blue' },
                      { color: '#f59e0b', name: 'Orange' },
                      { color: '#ec4899', name: 'Pink' }
                    ].map((colorOption) => (
                      <button
                        key={colorOption.color}
                        onClick={() => handleFontColorChange(colorOption.color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          fontColor === colorOption.color
                            ? 'border-white scale-110 shadow-lg'
                            : 'border-gray-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: colorOption.color }}
                        title={colorOption.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${
            isDarkMode ? 'bg-gray-900/50' : 'bg-transparent'
          }`}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-[#053725] to-[#053725]/90 text-[#F9F7E7] ml-4'
                      : isDarkMode
                        ? 'bg-gray-800/50 text-gray-200 mr-4 border border-gray-700/20'
                        : 'bg-[#F9F7E7]/50 mr-4 border border-[#053725]/10'
                  }`}
                  style={{ color: message.sender === 'bot' ? fontColor : undefined }}
                >
                  <div className="flex items-start space-x-2">
                    {message.sender === 'bot' && (
                      <Bot size={14} className="mt-0.5 flex-shrink-0" />
                    )}
                    {message.sender === 'user' && (
                      <User size={14} className="mt-0.5 flex-shrink-0" />
                    )}
                    <div className="text-sm leading-relaxed">
                      {message.text}
                    </div>
                  </div>
                  <div className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-[#F9F7E7]/70' : 'text-[#053725]/60'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className={`rounded-2xl px-3 py-2 mr-4 ${
                  isDarkMode
                    ? 'bg-gray-800/50 text-gray-200 border border-gray-700/20'
                    : 'bg-[#F9F7E7]/50 text-[#053725] border border-[#053725]/10'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Bot size={14} />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: fontColor + '40' }}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: fontColor + '40', animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: fontColor + '40', animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={`p-4 border-t ${
            isDarkMode ? 'border-gray-700/10' : 'border-[#053725]/10'
          }`}>
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={isTyping}
                className={`flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                  isDarkMode
                    ? 'bg-gray-800/60 border border-gray-600/20 text-gray-200 placeholder-gray-400 focus:ring-gray-500/20 focus:border-gray-500/40'
                    : 'bg-[#F9F7E7]/60 border border-[#053725]/20 text-[#053725] placeholder-[#053725]/60 focus:ring-[#053725]/20 focus:border-[#053725]/40'
                }`}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className={`p-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200 hover:from-gray-600 hover:to-gray-700'
                    : 'bg-gradient-to-r from-[#053725] to-[#053725]/90 text-[#F9F7E7] hover:from-[#053725]/90 hover:to-[#053725]'
                }`}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Button */}
      <button
        ref={chatButtonRef}
        onClick={() => {
          if (!isOpen) {
            setCustomPosition(null); // Reset to default position when opening
          }
          setIsOpen(!isOpen);
        }}
        onMouseDown={handleMouseDown}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowSettings(!showSettings);
          if (!isOpen) {
            setCustomPosition(null); // Reset to default position when opening
            setIsOpen(true);
          }
        }}
        className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-[#053725] to-[#053725]/90 text-[#F9F7E7] rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 flex items-center justify-center group ${isDragging ? 'cursor-grabbing scale-110 shadow-3xl' : 'cursor-grab'}`}
        title="Chat with AI Assistant (Drag to move, Right-click for settings)"
      >
        <MessageCircle 
          size={20} 
          className={`sm:w-6 sm:h-6 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'group-hover:scale-110'}`} 
        />
      </button>
    </div>
  );
};

export default AIChatbot;
