import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Send, Bot, Clock, Plus, ChevronLeft, MessageSquare, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
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
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

const getInitials = (name?: string) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export const AIAssistant = ({ isOpen, setIsOpen }: AIAssistantProps) => {
  const [view, setView] = useState<'chat' | 'history'>('chat');
  
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const isProcessingClick = useRef(false);
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
    const restrictedTables = ['transactions', 'budgets', 'payment_requests', 'profiles'];
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
        if (!payload.user_id && ['tasks', 'leave_requests', 'attendance_records'].includes(actionObj.target)) {
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
    // ⚡ HOT CONTEXT — preloaded once per send
    let tasks: any[] = [];
    let leaves: any[] = [];
    let staff: any[] = [];
    try {
      const [tasksRes, leavesRes, staffRes] = await Promise.all([
        (supabase as any).from('tasks').select('title, status, priority').eq('user_id', profile?.id).in('status', ['todo', 'in_progress']).limit(5),
        (supabase as any).from('leave_requests').select('status, leave_type').eq('user_id', profile?.id).eq('status', 'pending').limit(1),
        (supabase as any).from('profiles').select('full_name, department, email, role, performance_score').limit(50),
      ]);
      tasks = tasksRes.data || [];
      leaves = leavesRes.data || [];
      staff = staffRes.data || [];
    } catch (dbErr) {
      console.warn('Failed to fetch hot context for AI, proceeding without it', dbErr);
    }

    const apiMessages = messageHistory
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        messages: apiMessages,
        profile: { full_name: profile?.full_name, role: profile?.role, department: profile?.department },
        hotContext: { tasks, leaves, staff },
        location: location.pathname,
      },
    });

    if (error) {
      const msg = (error as any)?.context?.error || (error as any)?.message || 'AI Copilot is unavailable.';
      throw new Error(msg);
    }
    return (data?.content as string) || 'I was unable to process that request.';
  };

  const handleSend = async (e?: React.FormEvent, OverrideInput?: string) => {
    if (e) e.preventDefault();
    const messageText = OverrideInput || input;
    if (!messageText.trim() || isProcessingClick.current) return;

    isProcessingClick.current = true;
    let currentHistory = [...messages, { id: crypto.randomUUID(), role: "user" as const, content: messageText.trim() }];
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
          currentHistory.push({ id: crypto.randomUUID(), role: "assistant", content: `I have instantly navigated you to the **${key.charAt(0).toUpperCase() + key.slice(1)}** module. \n\nHow else can I help?` });
          setMessages(currentHistory);
          setIsTyping(false);
          isProcessingClick.current = false;
          await saveChatToDb(currentHistory, chatTitle);
          return;
        }
      }
    }

    // ⚡ 0ms LATENCY SUGESTION BYPASS (Skips Google Gemini's 2-second LLM processing time)
    if (lowerInput === 'list my tasks' || lowerInput === 'what are my tasks') {
       const { data } = await (supabase as any).from('tasks').select('title, status, priority').eq('user_id', profile?.id).in('status', ['todo', 'in_progress']).limit(10);
       const tasksText = data?.length 
            ? `Here are your current active tasks:\n\n${data.map((t: any) => `- **${t.title}** (${t.priority})`).join('\n')}\n`
            : "You have no active tasks currently.";
            
       currentHistory.push({ id: crypto.randomUUID(), role: "assistant", content: tasksText });
       setMessages(currentHistory);
       setIsTyping(false);
       isProcessingClick.current = false;
       await saveChatToDb(currentHistory, chatTitle);
       return;
    }

    if (lowerInput === 'show active users' || lowerInput === 'who is active') {
       const today = new Date().toISOString().split('T')[0];
       const { data } = await (supabase as any).from('attendance_records').select('user_id').eq('date', today).is('clock_out', null).limit(10);
       const activeText = data?.length 
            ? `There are currently ${data.length} users clocked in right now.`
            : "No users are currently clocked in.";
            
       currentHistory.push({ id: crypto.randomUUID(), role: "assistant", content: activeText });
       setMessages(currentHistory);
       setIsTyping(false);
       isProcessingClick.current = false;
       await saveChatToDb(currentHistory, chatTitle);
       return;
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
        let queryResults = [];
        
        while ((match = actionRegex.exec(aiOutput)) !== null) {
          if (match[1]) {
            try {
              const parsed = JSON.parse(match[1]);
              const actions = Array.isArray(parsed) ? parsed : [parsed];
              
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
            } catch (e) {
               console.error("Failed to parse AI action payload", e); 
            }
          }
        }
        
        let assistantConversationalText = cleanText.replace(actionRegex, '').trim();
        
        if (queryResults.length > 0) {
           const systemFeedback = queryResults.join("\n");
           // Only optionally push intermediate processing status if no conversational text
           if (!assistantConversationalText) {
              assistantConversationalText = "Processing data based on your request...";
           }
           currentHistory.push({ id: crypto.randomUUID(), role: "assistant", content: assistantConversationalText });
           currentHistory.push({ id: crypto.randomUUID(), role: "system", content: systemFeedback });
           requiresAnotherPass = true;
           
           // Optimistically update UI so spinner reflects processing state correctly
           setMessages(currentHistory.filter(m => m.role !== 'system'));
        } else {
           // Terminal condition
           requiresAnotherPass = false;
           if (!assistantConversationalText && loopCount >= maximumLoops) {
              assistantConversationalText = "I have executed the requested actions.";
           }
           if (assistantConversationalText) {
              currentHistory.push({ id: crypto.randomUUID(), role: "assistant", content: assistantConversationalText });
           }
        }
      }
      
      // If we exit due to max loops but we still had pending actions
      if (requiresAnotherPass && loopCount >= maximumLoops) {
         currentHistory.push({ id: crypto.randomUUID(), role: "assistant", content: "I've reached my maximum processing limit for this request, but I did execute your commands." });
      }

      const visibleHistory = currentHistory.filter(m => m.role !== 'system');
      setMessages(visibleHistory);
      await saveChatToDb(visibleHistory, chatTitle);

    } catch (err: any) {
      console.error("AI Copilot Error:", err);
      toast.error(`Error connecting to AI Copilot: ${err.message || 'Unknown error'}`);
    } finally {
      setIsTyping(false);
      isProcessingClick.current = false;
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
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary active:bg-primary z-[100] transition-colors"
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
            <Button onClick={startNewChat} className="w-full gap-2 bg-primary hover:bg-[#a66c4a] text-white">
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
                       className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${currentChatId === session.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                       onClick={() => loadChat(session)}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare className={`h-4 w-4 shrink-0 ${currentChatId === session.id ? 'text-primary' : 'text-muted-foreground'}`} />
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
          <div className="bg-primary text-white px-4 py-3 flex items-center shadow-sm shrink-0">
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
                      <>
                        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} className="object-cover" />}
                        <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">{getInitials(profile?.full_name)}</AvatarFallback>
                      </>
                    ) : (
                      <div className="bg-primary h-full w-full flex items-center justify-center">
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </Avatar>

                  <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                    msg.role === 'user' ? 'bg-primary text-white rounded-tr-sm' 
                    : 'bg-muted/50 border border-border/40 text-foreground rounded-tl-sm'
                  }`}>
                    {renderFormattedText(msg.content)}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-2.5 self-start max-w-[85%]">
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <div className="bg-primary h-full w-full flex items-center justify-center rounded-full"><Sparkles className="h-3.5 w-3.5 text-white" /></div>
                  </Avatar>
                  <div className="px-4 py-3 rounded-2xl bg-muted/50 border border-border/40 rounded-tl-sm flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
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
                  className="whitespace-nowrap cursor-pointer hover:bg-primary/10 text-[11px] py-1 px-2.5 border border-border/50 transition-colors"
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
                className="pr-10 py-5 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/40 text-sm"
                disabled={isTyping}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="absolute right-1.5 h-8 w-8 rounded-lg bg-primary hover:bg-[#a66c4a] text-white transition-transform hover:scale-105"
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
