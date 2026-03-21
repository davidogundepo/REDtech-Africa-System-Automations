import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Send, Bot, Clock, Plus, ChevronLeft, MessageSquare, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { GoogleGenAI } from "@google/genai";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSidebar } from "@/components/ui/sidebar";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updated_at: string;
}

interface AIAssistantProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

// Simple markdown-like bold renderer
function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export const AIAssistant = ({ isOpen, setIsOpen }: AIAssistantProps) => {
  const [view, setView] = useState<'chat' | 'history'>('chat');
  
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { setOpen: setSidebarOpen, open: sidebarOpen } = useSidebar();

  // Store the previous sidebar state so we can restore it on close
  const prevSidebarState = useRef<boolean>(true);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  // Panel Resizing Logic
  const [panelWidth, setPanelWidth] = useState(380);
  const isDragging = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= 800) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setIsDraggingState(false);
        document.body.style.cursor = 'default';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Collapse left sidebar when AI panel opens, restore on close
  useEffect(() => {
    if (isOpen) {
      prevSidebarState.current = sidebarOpen;
      setSidebarOpen(false);
    } else {
      setSidebarOpen(prevSidebarState.current);
    }
  }, [isOpen]);

  // Initialize and load saved chats
  useEffect(() => {
    if (isOpen && profile?.id) {
      fetchChatHistory();
      if (!currentChatId && messages.length === 0) {
        startNewChat();
      }
    }
  }, [isOpen, profile]);

  const fetchChatHistory = async () => {
    if (!profile) return;
    try {
      const { data, error } = await (supabase as any)
        .from('ai_chats')
        .select('*')
        .eq('user_id', profile.id)
        .order('updated_at', { ascending: false });
        
      if (!error && data) {
        setChatSessions(data as ChatSession[]);
      }
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([
      { id: Date.now().toString(), role: "assistant", content: "Hello! I am REDtech AI Assistance, your internal ERP Copilot.\n\nHere is what I can do for you:\n\n**Navigation** — Take you anywhere in the system instantly.\n**Data Intelligence** — Query any module (Attendance, Tasks, Profiles, Finance, etc.).\n**System Actions** — Create, log, or update live records.\n**Analysis** — Answer operational questions using live data.\n\nHow can I supercharge your workflow today?" }
    ]);
    setView('chat');
  };

  const loadChat = (session: ChatSession) => {
    setCurrentChatId(session.id);
    setMessages(session.messages || []);
    setView('chat');
  };

  const deleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await (supabase as any).from('ai_chats').delete().eq('id', id);
      setChatSessions(prev => prev.filter(c => c.id !== id));
      if (currentChatId === id) startNewChat();
      toast.success("Chat deleted.");
    } catch (err) {
      toast.error("Failed to delete chat.");
    }
  };

  const saveChatToDb = async (newMessages: Message[], title: string = "New Chat") => {
    if (!profile) return null;
    try {
      if (currentChatId) {
        await (supabase as any)
          .from('ai_chats')
          .update({ messages: newMessages, updated_at: new Date().toISOString() })
          .eq('id', currentChatId);
        return currentChatId;
      } else {
        const { data, error } = await (supabase as any)
          .from('ai_chats')
          .insert({
            user_id: profile.id,
            title: title,
            messages: newMessages
          })
          .select('id')
          .single();
          
        if (!error && data) {
          setCurrentChatId(data.id);
          fetchChatHistory();
          return data.id;
        }
      }
    } catch (err) {
      console.error("Failed saving chat to db", err);
    }
    return null;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, view]);

  // Generic Execution & Retrieval Switch
  const executeDatabaseAction = async (actionObj: any) => {
    const restrictedTables = ['finance', 'global_metrics', 'salaries', 'invoices', 'profiles', 'users'];
    if (!isAdmin && restrictedTables.includes(actionObj.target)) {
      return `SYSTEM OBLIGATION: PERMISSION DENIED. Active user lacks Admin clearance to manipulate or query '${actionObj.target}'.`;
    }

    try {
      if (actionObj.action === 'query_database') {
        let query = (supabase as any).from(actionObj.target).select('*').limit(30);
        if (actionObj.filters && typeof actionObj.filters === 'object') {
           Object.keys(actionObj.filters).forEach(k => { query = query.eq(k, actionObj.filters[k]); });
        }
        const { data, error } = await query;
        if (error) throw error;
        return JSON.stringify(data);
      }

      if (actionObj.action === 'insert_database') {
        let payload = { ...actionObj.payload };
        if (!payload.user_id && ['tasks', 'leaves', 'attendance'].includes(actionObj.target)) {
           payload.user_id = profile?.id;
        }
        const { data, error } = await (supabase as any).from(actionObj.target).insert(payload).select().single();
        if (error) throw error;
        toast.success(`Successfully created record in ${actionObj.target.toUpperCase()}`);
        return `Inserted successfully: ${JSON.stringify(data)}`;
      }

      if (actionObj.action === 'update_database') {
        if (!actionObj.id_to_update) throw new Error("Missing id_to_update");
        const { data, error } = await (supabase as any).from(actionObj.target).update(actionObj.payload).eq('id', actionObj.id_to_update).select().single();
        if (error) throw error;
        toast.success(`Successfully updated record in ${actionObj.target.toUpperCase()}`);
        return `Updated successfully: ${JSON.stringify(data)}`;
      }

    } catch (err: any) {
      toast.error(`AI Action Failed: ${err.message}`);
      return `Action Failed: ${err.message}`;
    }
  };

  // Main LLM Interaction Loop
  const invokeAgentLoop = async (messageHistory: Message[]) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    const roleText = profile?.role === 'super_admin' ? 'Super Admin - Full Access' : profile?.role === 'admin' ? 'Admin - Elevated Access' : 'Team Member - Restricted Access';
    
    // ⚡ HOT CONTEXT INJECTION (Prevents slow ReAct DB loops for common queries)
    const [tasksRes, leavesRes] = await Promise.all([
      (supabase as any).from('tasks').select('title, status, priority').eq('user_id', profile?.id).in('status', ['todo', 'in_progress']).limit(5),
      (supabase as any).from('leaves').select('status, type').eq('user_id', profile?.id).eq('status', 'pending').limit(1)
    ]);

    const systemPrompt = `You are REDtech AI Assistance, an elite Fortune 500 internal ERP Agent.
Current User: ${profile?.full_name || 'User'}
Role: ${profile?.role || 'user'} (${roleText})
Department: ${profile?.department || 'no department'}
Current Page URL: ${location.pathname}

⚡ HOT CONTEXT (Use this LIVE DATA instantly to answer questions. Do NOT use query_database for tasks or leaves unless they need more than the last 5):
- User's Active Tasks: ${JSON.stringify(tasksRes.data || [])}
- User's Pending Leaves: ${JSON.stringify(leavesRes.data || [])}

SECURITY & STRICT RBAC ENFORCEMENT:
If the user's Role is 'team-member', you MUST legally and strictly refuse to summarize global company analytics, staff utilisation stats of other users, or finance data. Act politely to deny. If they are 'super-admin' or 'admin', provide any requested global insights.

ABILITIES (JSON ACTION BLOCKS):
You have powerful agent capabilities. You can navigate the UI or manipulate the entire Supabase database by appending a JSON block (or array) EXACTLY at the end of your response.
Format:
\`\`\`json
[
  { "action": "navigate", "path": "/attendance" },
  { "action": "query_database", "target": "profiles", "filters": {"department": "Marketing"} },
  { "action": "insert_database", "target": "tasks", "payload": { "title": "Buy hardware", "priority": "high", "status": "todo" } },
  { "action": "update_database", "target": "invoices", "id_to_update": "uuid-here", "payload": { "status": "Paid" } }
]
\`\`\`
Valid tables for targets: 'profiles', 'tasks', 'clients', 'attendance', 'leaves', 'invoices', 'waybills', 'documents', 'finance_entries'.

IMPORTANT ReAct LOOP: If you need information to answer OR execute a modification, output ONLY the action command (e.g. 'query_database' or 'insert_database'). The system will intercept it, run it on Supabase, and feed the raw JSON result back to you in a SYSTEM MESSAGE. You will then automatically process that data and provide the conversational answer to the user in your NEXT turn. Do not ask the user to wait, just output the json block to let the loop spin.

Style & Formatting: Highly professional, warm, concise. ALWAYS use bullet points and clear line breaks when listing multiple items or explaining steps. Use **bold** for emphasis.
`;

    let historyString = messageHistory.map(m => `${m.role === 'system' ? 'SYSTEM' : m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`).join("\n");
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${systemPrompt}\n\n--- Chat History ---\n${historyString}`,
    });

    return response.text || "I was unable to process that request.";
  };

  const handleSend = async (e?: React.FormEvent, OverrideInput?: string) => {
    if (e) e.preventDefault();
    const messageText = OverrideInput || input;
    if (!messageText.trim() || isTyping) return;

    let currentHistory = [...messages, { id: Date.now().toString(), role: "user" as const, content: messageText.trim() }];
    setMessages(currentHistory);
    setInput("");
    setIsTyping(true);
    
    const chatTitle = currentChatId ? undefined : messageText.substring(0, 30) + "...";

    // ⚡ HYBRID KEYWORD-ROUTING (0ms Latency Navigation Bypass)
    const lowerInput = messageText.toLowerCase();
    if (lowerInput.includes('navigate to') || lowerInput.includes('go to') || lowerInput.includes('take me to') || lowerInput.includes('open')) {
      const routes: Record<string, string> = {
        'attendance': '/attendance',
        'task': '/tasks',
        'utilisation': '/staff-utilisation',
        'finance': '/finance',
        'social': '/social',
        'leave': '/leave',
        'dashboard': '/dashboard',
        'profile': '/profile',
        'client': '/clients'
      };
      
      for (const [key, path] of Object.entries(routes)) {
        if (lowerInput.includes(key)) {
          navigate(path);
          toast.success(`Navigating to ${path}...`);
          currentHistory.push({ id: Date.now().toString(), role: "assistant", content: `I have instantly navigated you to the **${key.charAt(0).toUpperCase() + key.slice(1)}** module. \n\nHow else can I help?` });
          setMessages(currentHistory);
          setIsTyping(false);
          await saveChatToDb(currentHistory, chatTitle);
          return; // Exit instantly. 0ms Gemini latency.
        }
      }
    }

    try {
      let requiresAnotherPass = true;
      let maximumLoops = 3;
      let loopCount = 0;

      while (requiresAnotherPass && loopCount < maximumLoops) {
        loopCount++;
        let aiOutput = await invokeAgentLoop(currentHistory);
        requiresAnotherPass = false;
        
        const actionRegex = /```json\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/g;
        let cleanText = aiOutput;
        let match;
        
        while ((match = actionRegex.exec(aiOutput)) !== null) {
          if (match[1]) {
            try {
              const parsed = JSON.parse(match[1]);
              const actions = Array.isArray(parsed) ? parsed : [parsed];
              let queryResults = [];
              
              for (const actionObj of actions) {
                if (actionObj.action === 'navigate') {
                  if (actionObj.path && actionObj.path.startsWith('/')) {
                    navigate(actionObj.path);
                    toast.success(`Navigating to ${actionObj.path}...`);
                  }
                } 
                else if (['query_database', 'insert_database', 'update_database'].includes(actionObj.action)) {
                  const dbResult = await executeDatabaseAction(actionObj);
                  queryResults.push(`[RESULT FOR '${actionObj.action}' ON '${actionObj.target}']: ${dbResult}`);
                }
              }
              
              if (queryResults.length > 0) {
                 const systemFeedback = queryResults.join("\n");
                 currentHistory.push({ id: Date.now().toString(), role: "assistant", content: cleanText.replace(actionRegex, '').trim() || "(Thinking... fetching data)" });
                 currentHistory.push({ id: Date.now().toString(), role: "system", content: systemFeedback });
                 requiresAnotherPass = true;
              }
              
            } catch (e) {
               console.error("Failed to parse AI action payload", e); 
            }
          }
        }
        
        if (!requiresAnotherPass) {
          let finalAssistantReply = cleanText.replace(actionRegex, '').trim();
          if (!finalAssistantReply) finalAssistantReply = "Done.";
          currentHistory.push({ id: Date.now().toString(), role: "assistant", content: finalAssistantReply });
        }
      }

      const visibleHistory = currentHistory.filter(m => m.role !== 'system');
      setMessages(visibleHistory);
      await saveChatToDb(visibleHistory, chatTitle);

    } catch (err: any) {
      console.error(err);
      toast.error("Error connecting to AI Copilot.");
    } finally {
      setIsTyping(false);
    }
  };

  const SUGGESTIONS = [
    "Navigate to Attendance",
    "List my tasks",
    "Show active users"
  ];
  
  const ADMIN_SUGGESTIONS = [
    "Staff Utilisation overview",
    "Who is at risk of burnout?",
    "Show users in Finance"
  ];

  return (
    <div 
      className="relative shrink-0 flex flex-col bg-background overflow-hidden border-border/50"
      style={{
        width: isOpen ? `${panelWidth}px` : '0px',
        opacity: isOpen ? 1 : 0,
        borderLeftWidth: isOpen ? '1px' : '0px',
        boxShadow: isOpen ? '-4px 0 20px rgba(0,0,0,0.03)' : 'none',
        transition: isDraggingState ? 'none' : 'width 300ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 300ms ease'
      }}
    >
      {/* Drag Handle */}
      {isOpen && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-[#bc7e57] active:bg-[#bc7e57] z-[100] transition-colors"
          style={{ cursor: 'ew-resize' }}
          onMouseDown={(e) => {
            e.preventDefault();
            isDragging.current = true;
            setIsDraggingState(true);
            document.body.style.cursor = 'ew-resize';
          }}
          title="Drag to resize panel"
        />
      )}

      {/* Wrapper prevents text squishing during close animation */}
      <div className="flex flex-col h-screen" style={{ width: `${panelWidth}px` }}>
      {/* VIEW: CHAT HISTORY */}
      {view === 'history' && (
        <div className="w-full h-full flex flex-col">
          <div className="p-4 border-b border-border/40 flex items-center gap-3 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setView('chat')} className="h-8 w-8 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="font-semibold text-sm">Chat History</h2>
          </div>
          <div className="p-4 shrink-0">
            <Button onClick={startNewChat} className="w-full gap-2 bg-[#bc7e57] hover:bg-[#a66c4a] text-white">
              <Plus className="h-4 w-4" /> Start New Chat
            </Button>
          </div>
          <ScrollArea className="flex-1 px-2">
            {chatSessions.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground text-sm">No recent chats.</div>
            ) : (
              <div className="space-y-1 p-2">
                {chatSessions.map(session => (
                  <div key={session.id} 
                       className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${currentChatId === session.id ? 'bg-[#bc7e57]/10' : 'hover:bg-muted/50'}`}
                       onClick={() => loadChat(session)}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare className={`h-4 w-4 shrink-0 ${currentChatId === session.id ? 'text-[#bc7e57]' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-medium truncate">{session.title}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-opacity" onClick={(e) => deleteChat(e, session.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* VIEW: ACTIVE CHAT */}
      {view === 'chat' && (
        <div className="w-full h-full flex flex-col">
          {/* Header */}
          <div className="bg-[#bc7e57] text-white px-4 py-3 flex items-center shadow-sm shrink-0">
            <div className="h-9 w-9 flex items-center justify-center bg-white/20 rounded-lg mr-3 border border-white/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-sm leading-tight">REDtech AI Assistance</h2>
              <p className="text-white/70 text-[11px] flex items-center gap-1"><Bot className="w-3 h-3" /> Powered by Gemini 2.5</p>
            </div>
            <div className="flex shrink-0 gap-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:bg-white/15 hover:text-white" onClick={startNewChat} title="New Chat">
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:bg-white/15 hover:text-white" onClick={() => setView('history')} title="Chat History">
                <Clock className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:bg-white/15 hover:text-white" onClick={() => setIsOpen(false)} title="Close">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="flex flex-col gap-4 pb-4">
              {messages.filter(m => m.role !== 'system').map((msg) => (
                <div key={msg.id} className={`flex gap-2.5 max-w-[92%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                  
                  <Avatar className="h-7 w-7 shrink-0 border border-border/40 shadow-sm mt-0.5">
                    {msg.role === 'user' ? (
                      <AvatarFallback className="bg-[#bc7e57]/10 text-[#bc7e57] text-[9px] font-bold">{(profile?.full_name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                    ) : (
                      <div className="bg-[#bc7e57] h-full w-full flex items-center justify-center">
                        <Bot className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </Avatar>

                  <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                    msg.role === 'user' ? 'bg-[#bc7e57] text-white rounded-tr-sm' 
                    : 'bg-muted/50 border border-border/40 text-foreground rounded-tl-sm'
                  }`}>
                    {renderFormattedText(msg.content)}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-2.5 self-start max-w-[85%]">
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <div className="bg-[#bc7e57] h-full w-full flex items-center justify-center rounded-full"><Bot className="h-3.5 w-3.5 text-white" /></div>
                  </Avatar>
                  <div className="px-4 py-3 rounded-2xl bg-muted/50 border border-border/40 rounded-tl-sm flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#bc7e57] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#bc7e57] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#bc7e57] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Suggestions */}
          {messages.length < 3 && !isTyping && (
            <div className="pt-2 pb-1 px-3 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {([...SUGGESTIONS, ...(isSuperAdmin ? ADMIN_SUGGESTIONS : [])]).map((s, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  className="whitespace-nowrap cursor-pointer hover:bg-[#bc7e57]/10 text-[11px] py-1 px-2.5 border border-border/50 transition-colors"
                  onClick={() => handleSend(undefined, s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t border-border/40 shrink-0">
            <form onSubmit={(e) => handleSend(e)} className="relative flex items-center">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AI Assistance anything..."
                className="pr-10 py-5 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-[#bc7e57]/40 text-sm"
                disabled={isTyping}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="absolute right-1.5 h-8 w-8 rounded-lg bg-[#bc7e57] hover:bg-[#a66c4a] text-white transition-transform hover:scale-105"
                disabled={isTyping || !input.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
            <div className="mt-1.5 text-center">
              <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest flex items-center justify-center opacity-50">
                <Sparkles className="w-2.5 h-2.5 mr-1" /> Dynamic System Intelligence
              </span>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
