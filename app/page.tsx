"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Terminal, User, FileText, Square } from "lucide-react";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ✅ Update this with your actual PDF path
  const PDF_SRC = '/myresume.pdf';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const renderMessageText = (m: any) => {
    if (Array.isArray(m.parts)) {
      return m.parts
        .map((p: any) => {
          if (p.type === "text") return p.text ?? p.content ?? "";
          return "";
        })
        .join("");
    }
    return m.content ?? "";
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // optional: simple clear behavior
    if (text.toLowerCase() === "clear") {
      setMessages([]);
      setInput("");
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get response");
      }

      // Create placeholder for assistant message
      const assistantId = (Date.now() + 1).toString();
      const assistantMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };
      
      setMessages((prev) => [...prev, assistantMessage]);

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Update the assistant message with accumulated text
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: fullText }
              : msg
          )
        );
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        // Keep the partial response that was already received
      } else {
        console.error("Error sending message:", error);
        setMessages((prev) => prev.slice(0, -1)); // Remove the last message if error
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[100dvh] bg-black flex flex-col md:flex-row overflow-hidden font-mono fixed inset-0 md:static">
      {/* Left side - PDF Viewer */}
      <div className={`${showPdf ? 'flex' : 'hidden'} md:flex md:w-1/2 w-full md:border-r-2 border-green-500 flex-col fixed md:relative inset-0 md:inset-auto z-10 md:z-auto bg-black`}>
        <div className="bg-black border-b-2 border-green-500 p-4 flex items-center gap-3">
          <FileText className="w-5 h-5 text-green-500" />
          <span className="text-green-500 text-sm tracking-wide">NEVIEN-UDUGAMA-RESUME.PDF</span>
          <button 
            onClick={() => setShowPdf(false)}
            className="ml-auto md:hidden text-green-500 text-xs border border-green-500 px-3 py-1 hover:bg-green-500 hover:text-black transition-colors"
          >
            BACK TO CHAT
          </button>
          <div className="ml-auto hidden md:block text-green-500 text-xs">
            [VIEWING MODE: ACTIVE]
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-black overflow-hidden">
          <iframe
            src={PDF_SRC}
            title="Resume PDF"
            className="w-full h-full border-0"
          />
        </div>
      </div>

      {/* Right side - Chat Interface */}
      <div className={`${showPdf ? 'hidden' : 'flex'} md:flex w-full md:w-1/2 flex-col bg-black fixed md:relative inset-0 md:inset-auto`}>
        {/* Header */}
        <div className="bg-black border-b-2 border-green-500 p-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-green-500" />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-green-500 tracking-wide">nev@resume-terminal</h1>
              <p className="text-green-500 text-xs opacity-75">
                {isLoading ? "thinking..." : "online"}
              </p>
            </div>
            <button 
              onClick={() => setShowPdf(true)}
              className="md:hidden text-green-500 text-xs border border-green-500 px-3 py-1 hover:bg-green-500 hover:text-black transition-colors"
            >
              VIEW RESUME
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black overscroll-contain">
          {messages.length === 0 && (
            <div className="space-y-2 text-green-500">
              <div className="flex items-center gap-2 text-sm">
                <Terminal className="w-4 h-4" />
                <span className="opacity-75">SYSTEM@ai:~$</span>
              </div>
              <div className="pl-6 text-sm">
                <pre className="whitespace-pre-wrap">
                  {"> System initialized...\n> Ready for queries\n\nAsk me anything about my experience, projects, or skills.\n\nTip: type 'clear' to reset."}
                </pre>
              </div>
            </div>
          )}

          {messages.map((m: any) => (
            <div key={m.id} className="space-y-2">
              <div className="flex items-center gap-2 text-green-500 text-sm">
                {m.role === 'user' ? (
                  <>
                    <User className="w-4 h-4" />
                    <span className="opacity-75">USER@terminal:~$</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-4 h-4" />
                    <span className="opacity-75">SYSTEM@ai:~$</span>
                  </>
                )}
              </div>
              <div className={`pl-6 text-sm ${m.role === 'user' ? 'text-green-300' : 'text-green-500'}`}>
                <pre className="whitespace-pre-wrap font-mono">{renderMessageText(m)}</pre>
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-black border-t-2 border-green-500 w-full">
          <div className="flex gap-2 items-center">
            <span className="text-green-500 text-sm">$</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about toughest problems, projects, skills..."
              disabled={isLoading}
              className="flex-1 bg-black text-green-500 placeholder-green-700 border-2 border-green-500 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 font-mono text-sm md:text-base disabled:opacity-50"
            />
            {isLoading ? (
              <button
                onClick={handleStop}
                className="bg-green-600 text-white px-4 md:px-6 py-2 font-bold hover:bg-green-500 transition-colors border-2 border-green-600 flex items-center gap-2"
              >
                <Square className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                <span className="hidden md:inline text-xs">STOP</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-green-500 text-black px-4 md:px-6 py-2 font-bold hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-2 border-green-500"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            )}
          </div>
          <div className="text-green-500 text-xs mt-2 opacity-50">
            {isLoading ? "> Processing query..." : "(Grounded answers from Astra resume + notes context)"}
          </div>
        </div>
      </div>
    </div>
  );
}