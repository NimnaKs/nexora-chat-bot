/* src/components/ChatInterface.tsx */

import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, MessageSquare, Trash2, Globe } from "lucide-react";
import { ChatMessage } from "../../types";
import apiService from "../../services/api";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardContent } from "../ui/Card";

// Browser SpeechRecognition
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// Language options
const LANGUAGE_OPTIONS = [
  { code: "en-US", label: "English", flag: "🇺🇸" },
  { code: "si-LK", label: "සිංහල", flag: "🇱🇰" },
  { code: "ta-IN", label: "தமிழ்", flag: "🇱🇰", fallback: ["ta", "ta-LK"] },
];

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "bot",
      content:
        "Hello! I'm your Campus Copilot. Ask me anything about the uploaded documents.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en-US"); // Default to English
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Initialize SpeechRecognition
  useEffect(() => {
    if (!SpeechRecognition) return;

    const recog = new SpeechRecognition();
    recog.continuous = true; // Enable continuous recognition
    recog.interimResults = true; // Enable interim results for real-time display
    recog.lang = selectedLanguage; // Use selected language

    recog.onstart = () => {
      setIsRecognizing(true);
      setInterimTranscript("");
    };

    recog.onresult = (e: any) => {
      let finalTranscript = "";
      let interimText = "";

      for (let i = 0; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimText += transcript;
        }
      }

      // Update input value with final transcript
      if (finalTranscript) {
        setInputValue((prev) => prev + finalTranscript);
        setInterimTranscript("");
      } else {
        // Show interim results in real-time
        setInterimTranscript(interimText);
      }
    };

    recog.onerror = (err: any) => {
      console.error("SpeechRecognition error", err);
      setIsRecognizing(false);
      setInterimTranscript("");
    };

    recog.onend = () => {
      setIsRecognizing(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recog;
  }, [selectedLanguage]); // Recreate when language changes

  const toggleMic = () => {
    if (!recognitionRef.current) return;

    if (isRecognizing) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode);
    setShowLanguageDropdown(false);

    // Stop current recognition if active
    if (isRecognizing && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleSendMessage = async () => {
    const messageText = inputValue.trim();
    if (!messageText || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setInterimTranscript("");
    setIsLoading(true);

    try {
      const res: any = await apiService.askQuestion(userMsg.content);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: res.answer || "Sorry, couldn't process.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "bot",
          content: "Error occurred. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "1",
        type: "bot",
        content: "Chat cleared! How can I help you?",
        timestamp: new Date(),
      },
    ]);
  };

  // Combined display value for input (actual input + interim transcript)
  const displayValue = inputValue + interimTranscript;
  const currentLanguage = LANGUAGE_OPTIONS.find(
    (lang) => lang.code === selectedLanguage
  );

  return (
    <Card className="h-[80vh] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Chat Assistant
              </h2>
              <p className="text-gray-600 text-sm">
                Ask questions about your documents
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Language Selector */}
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="text-gray-600 border-gray-300 flex items-center space-x-2"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm">
                  {currentLanguage?.flag} {currentLanguage?.label}
                </span>
              </Button>

              {showLanguageDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 ${
                        selectedLanguage === lang.code
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700"
                      } first:rounded-t-lg last:rounded-b-lg`}
                    >
                      <span>{lang.flag}</span>
                      <span className="text-sm">{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="text-gray-600 border-gray-300"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`${
                  msg.type === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-gray-100 text-gray-800 rounded-bl-md"
                } max-w-xs lg:max-w-md px-4 py-2 rounded-2xl`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.type === "user" ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl rounded-bl-md">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-auto border-t border-gray-100 p-4">
          <div className="flex items-center space-x-2">
            <Button
              onClick={toggleMic}
              variant={isRecognizing ? "danger" : "outline"}
              size="md"
              className={`p-3 ${isRecognizing ? "animate-pulse" : ""}`}
              title={`Voice input (${currentLanguage?.label})`}
            >
              {isRecognizing ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={displayValue}
                onChange={(e) => {
                  // Only update inputValue if the change isn't from interim transcript
                  if (!isRecognizing) {
                    setInputValue(e.target.value);
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder={
                  isRecognizing
                    ? `Listening in ${currentLanguage?.label}...`
                    : "Type your message..."
                }
                className={`w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isRecognizing ? "bg-red-50 border-red-300" : ""
                }`}
                disabled={isLoading}
                style={{
                  color: interimTranscript ? "#666" : "#000",
                }}
              />
              {isRecognizing && (
                <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-red-500 font-medium">
                      Recording
                    </span>
                  </div>
                </div>
              )}
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="p-3"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          {/* Language indicator */}
          <div className="mt-2 text-center">
            <span className="text-xs text-gray-500">
              Voice language: {currentLanguage?.flag} {currentLanguage?.label}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
