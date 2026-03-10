import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import Markdown from 'react-markdown';
import { Send, Image as ImageIcon, Loader2, Search, BrainCircuit, X } from 'lucide-react';

const API_KEY = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.warn("GEMINI_API_KEY environment variable not set");
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
  isThinking?: boolean;
}

export const MarketAnalyst: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'think' | 'search'>('think');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      image: selectedImage || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setIsProcessing(true);

    try {
      if (!ai) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: "AI integration is not configured. Please set the GEMINI_API_KEY."
        }]);
        setIsProcessing(false);
        return;
      }

      let responseText = '';

      const parts: any[] = [];
      if (userMessage.image) {
        // Extract base64 data and mime type
        const [header, base64Data] = userMessage.image.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          }
        });
      }
      if (userMessage.text) {
        parts.push({ text: userMessage.text });
      }

      if (mode === 'think') {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts },
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
          }
        });
        responseText = response.text || 'No response generated.';
      } else {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts },
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
        responseText = response.text || 'No response generated.';

        // Append sources if available
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
          responseText += '\n\n**Sources:**\n';
          const uniqueUrls = new Set();
          chunks.forEach(chunk => {
            if (chunk.web?.uri && !uniqueUrls.has(chunk.web.uri)) {
              uniqueUrls.add(chunk.web.uri);
              responseText += `- [${chunk.web.title || chunk.web.uri}](${chunk.web.uri})\n`;
            }
          });
        }
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      }]);

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Sorry, I encountered an error processing your request. Please try again."
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const modeColors = {
    think: 'from-blue-900/40 to-indigo-900/40 border-blue-500/30',
    search: 'from-emerald-900/40 to-teal-900/40 border-emerald-500/30'
  };

  const modeAccent = mode === 'think' ? 'text-blue-400' : 'text-emerald-400';
  const modeBg = mode === 'think' ? 'bg-blue-600' : 'bg-emerald-600';

  return (
    <div className={`flex flex-col h-[600px] rounded-xl border overflow-hidden transition-colors duration-500 bg-gradient-to-b ${modeColors[mode]}`}>
      <div className="p-4 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/60 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          {mode === 'think' ? <BrainCircuit className={`w-5 h-5 ${modeAccent}`} /> : <Search className={`w-5 h-5 ${modeAccent}`} />}
          AI Market Analyst
        </h2>
        <div className="flex bg-gray-950/80 rounded-lg p-1 border border-gray-800">
          <button
            onClick={() => setMode('think')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-300 ${mode === 'think' ? `${modeBg} text-white shadow-lg` : 'text-gray-400 hover:text-gray-200'}`}
          >
            <BrainCircuit className="w-4 h-4" />
            Deep Think
          </button>
          <button
            onClick={() => setMode('search')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-300 ${mode === 'search' ? `${modeBg} text-white shadow-lg` : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Search className="w-4 h-4" />
            Live Search
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 animate-in fade-in duration-700">
            {mode === 'think' ? (
              <BrainCircuit className={`w-16 h-16 opacity-40 ${modeAccent}`} />
            ) : (
              <Search className={`w-16 h-16 opacity-40 ${modeAccent}`} />
            )}
            <p className="text-center max-w-sm text-sm leading-relaxed">
              {mode === 'think'
                ? "Ask me to analyze complex market trends, upload a chart for technical analysis, or break down trading strategies."
                : "Search the web for the latest crypto news, real-time asset prices, or breaking market events."}
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
              <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'user' ? `${modeBg} text-white rounded-tr-sm` : 'bg-gray-800/90 text-gray-200 border border-gray-700/50 rounded-tl-sm'}`}>
                {msg.image && (
                  <img src={msg.image} alt="Uploaded" className="max-w-full h-auto rounded-lg mb-3 shadow-md" />
                )}
                <div className="markdown-body text-sm leading-relaxed">
                  <Markdown>{msg.text}</Markdown>
                </div>
              </div>
            </div>
          ))
        )}
        {isProcessing && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-gray-800/90 border border-gray-700/50 text-gray-200 rounded-2xl rounded-tl-sm p-4 flex items-center gap-3 shadow-sm">
              <div className="relative flex items-center justify-center w-6 h-6">
                <div className={`absolute inset-0 rounded-full border-2 border-t-transparent animate-spin ${mode === 'think' ? 'border-blue-400' : 'border-emerald-400'}`}></div>
                <div className={`w-2 h-2 rounded-full animate-pulse ${mode === 'think' ? 'bg-blue-400' : 'bg-emerald-400'}`}></div>
              </div>
              <span className="text-sm font-medium animate-pulse">
                {mode === 'think' ? 'Analyzing deeply...' : 'Searching the web...'}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      <div className="p-4 border-t border-gray-700/50 bg-gray-900/80 backdrop-blur-md">
        {selectedImage && (
          <div className="mb-3 relative inline-block animate-in zoom-in-95 duration-200">
            <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border-2 border-gray-600 shadow-md object-cover" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg transition-transform hover:scale-110"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-white transition-colors border border-gray-700"
            title="Upload image for analysis"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={mode === 'think' ? "Ask for deep analysis or upload a chart..." : "Search for live market news..."}
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gray-500 resize-none min-h-[48px] max-h-[120px]"
              rows={1}
              style={{ height: 'auto' }}
            />
          </div>
          <button
            type="submit"
            disabled={isProcessing || (!input.trim() && !selectedImage)}
            className={`p-3 rounded-xl transition-all duration-300 shadow-md ${isProcessing || (!input.trim() && !selectedImage)
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              : `${modeBg} text-white hover:brightness-110 hover:shadow-lg hover:-translate-y-0.5`
              }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
