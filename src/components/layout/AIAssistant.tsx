import React, { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Send, Bot, AlertCircle, Clock, Plus, ChevronLeft, MessageSquare, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { GoogleGenAI } from "@google/genai";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
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

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

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
      { id: Date.now().toString(), role: "assistant", content: `Hello! I am REDtech AI Assistance, your omnipresent internal ERP Copilot.\n\nHere is what I can do for you:\n\n📍 **Navigation:** Take you anywhere in the system instantly.\n📊 **Data Intelligence:** Query any module (Attendance, Tasks, Profiles, Finance, etc.).\n📝 **System Actions:** Create, log, or update live records ("Create a task", "Log my leave", "Mark invoice #123 as Paid").\n🧠 **Analysis:** Answer general operational questions using live data.\n\nHow can I supercharge your workflow today?` }
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

  // Auto-save logic
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

  // Listen to open toggle
  useEffect(() => {
    const handleOpen = (e: any) => {
      setIsOpen(true);
      if (e.detail?.prompt) {
        setInput(e.detail.prompt);
      }
    };
    window.addEventListener("rac-open-ai-assistant", handleOpen);
    return () => window.removeEventListener("rac-open-ai-assistant", handleOpen);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, view]);

  // Generic Execution & Retrieval Switch
  const executeDatabaseAction = async (actionObj: any) => {
    // SECURITY: Limit what non-admins can mutate
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
        // Automatically inject user linkage if missing on common tables
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
    
    const systemPrompt = `You are REDtech AI Assistance, an elite Fortune 500 internal ERP Agent.
Current User: ${profile?.full_name || 'User'}
Role: ${profile?.role || 'user'} (${roleText})
Department: ${profile?.department || 'no department'}
Current Page URL: ${location.pathname}

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

Style & Formatting: Highly professional, warm, concise. ALWAYS use bullet points and clear line breaks when listing multiple items or explaining steps (the frontend supports whitespace-pre-wrap).
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
    
    // Auto-generate a title if it's the first user message
    const chatTitle = currentChatId ? undefined : messageText.substring(0, 30) + "...";

    try {
      let finalAssistantReply = "";
      let requiresAnotherPass = true;
      let maximumLoops = 3; // Prevent infinite ReAct loops
      let loopCount = 0;

      while (requiresAnotherPass && loopCount < maximumLoops) {
        loopCount++;
        
        // 1. Call Gemini
        let aiOutput = await invokeAgentLoop(currentHistory);
        requiresAnotherPass = false; // Assume final unless a query needs fetching
        
        // 2. Parse Actions
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
                // UI Routing Actions
                if (actionObj.action === 'navigate') {
                  if (actionObj.path && actionObj.path.startsWith('/')) {
                    navigate(actionObj.path);
                    toast.success(`Navigating to ${actionObj.path}...`);
                  }
                } 
                // Database Read/Write ReAct Actions
                else if (['query_database', 'insert_database', 'update_database'].includes(actionObj.action)) {
                  const dbResult = await executeDatabaseAction(actionObj);
                  queryResults.push(`[RESULT FOR '${actionObj.action}' ON '${actionObj.target}']: ${dbResult}`);
                }
              }
              
              // If we executed a database query, we must feed it back to the AI.
              if (queryResults.length > 0) {
                 const systemFeedback = queryResults.join("\n");
                 // We suppress the AI's intermediate thought to the user by not adding it to visible 'currentHistory' directly as assistant block, 
                 // but we append the system feedback for the next loop.
                 currentHistory.push({ id: Date.now().toString(), role: "assistant", content: cleanText.replace(actionRegex, '').trim() || "(Thinking... fetching data)" });
                 currentHistory.push({ id: Date.now().toString(), role: "system", content: systemFeedback });
                 requiresAnotherPass = true; // Loop again!
              }
              
            } catch (e) {
               console.error("Failed to parse AI action payload", e); 
            }
          }
        }
        
        if (!requiresAnotherPass) {
          // It's the final output
          finalAssistantReply = cleanText.replace(actionRegex, '').trim();
          currentHistory.push({ id: Date.now().toString(), role: "assistant", content: finalAssistantReply });
        }
      }

      // 3. Finalize
      // Remove any explicit SYSTEM messages from the visible UI so the user doesn't see raw JSON database returns
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
    "Navigate to Attendance 📍",
    "List my tasks 📋",
    "Any active users right now? 👥"
  ];
  
  const ADMIN_SUGGESTIONS = [
    "Navigate to Staff Utilisation 📊",
    "Who is at risk of burnout? 🚨",
    "Show me users in Finance 💰"
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="w-[400px] sm:w-[500px] sm:max-w-xl p-0 flex border-l border-border/50 shadow-2xl z-[100] h-full overflow-hidden">
        
        {/* VIEW: CHAT HISTORY SIDEBAR */}
        {view === 'history' && (
           <div className="w-full h-full flex flex-col bg-background">
              <div className="p-4 border-b border-border/40 flex items-center gap-3">
                 <Button variant="ghost" size="icon" onClick={() => setView('chat')} className="h-8 w-8 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></Button>
                 <h2 className="font-semibold text-sm">Chat History</h2>
              </div>
              <div className="p-4">
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
           <div className="w-full h-full flex flex-col relative bg-muted/5">
              {/* Header */}
              <div className="bg-[#bc7e57] text-white p-4 flex items-center shadow-md relative z-10 shrink-0">
                 <div className="h-10 w-10 flex items-center justify-center bg-white/20 rounded-xl mr-3 border border-white/20">
                   <Sparkles className="h-6 w-6 text-white" />
                 </div>
                 <div className="flex-1">
                   <SheetTitle className="text-white font-bold text-lg leading-tight">REDtech AI Assistance</SheetTitle>
                   <p className="text-white/80 text-xs flex items-center gap-1"><Bot className="w-3 h-3" /> Powered by Gemini 2.5</p>
                 </div>
                 <div className="flex shrink-0 gap-1">
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 hover:text-white" onClick={startNewChat} title="New Chat">
                      <Plus className="h-4 w-4" />
                   </Button>
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 hover:text-white" onClick={() => setView('history')} title="View Chat History">
                      <Clock className="h-4 w-4" />
                   </Button>
                 </div>
              </div>

              {/* Chat Area */}
              <ScrollArea className="flex-1 p-4 relative" ref={scrollRef}>
                <div className="flex flex-col gap-5 pb-4">
                  {messages.filter(m => m.role !== 'system').map((msg) => (
                    <div key={msg.id} className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                      
                      {/* Avatar */}
                      <Avatar className="h-8 w-8 shrink-0 border border-border/50 shadow-sm mt-1">
                        {msg.role === 'user' ? (
                          <AvatarFallback className="bg-[#bc7e57]/10 text-[#bc7e57] text-[10px] font-bold">{(profile?.full_name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                        ) : (
                          <div className="bg-[#bc7e57] h-full w-full flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </Avatar>

                      {/* Bubble */}
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                        msg.role === 'user' ? 'bg-[#bc7e57] text-white rounded-tr-none' 
                        : 'bg-card border border-border/60 text-foreground rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex gap-3 self-start max-w-[85%]">
                       <Avatar className="h-8 w-8 shrink-0 mt-1">
                         <div className="bg-[#bc7e57] h-full w-full flex items-center justify-center rounded-full"><Bot className="h-4 w-4 text-white" /></div>
                       </Avatar>
                       <div className="px-4 py-4 rounded-2xl bg-card border border-border/60 rounded-tl-none flex items-center gap-1.5 shadow-sm">
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
                <div className="bg-background pt-3 pb-2 px-4 flex gap-2 overflow-x-auto no-scrollbar shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                  {([...SUGGESTIONS, ...(isSuperAdmin ? ADMIN_SUGGESTIONS : [])]).map((s, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="whitespace-nowrap cursor-pointer hover:bg-[#bc7e57]/10 text-xs py-1.5 px-3 border border-border/60 transition-colors"
                      onClick={() => handleSend(undefined, s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 bg-background border-t border-border/40 shrink-0">
                <form onSubmit={(e) => handleSend(e)} className="relative flex items-center">
                  <Input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask AI Assistance or instruct it to do a task..."
                    className="pr-12 py-6 rounded-xl border-border/60 bg-muted/40 focus-visible:ring-[#bc7e57]/40 shadow-inner"
                    disabled={isTyping}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="absolute right-2 h-9 w-9 rounded-lg bg-[#bc7e57] hover:bg-[#a66c4a] text-white transition-transform hover:scale-105"
                    disabled={isTyping || !input.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <div className="mt-2 text-center">
                   <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest flex items-center justify-center opacity-60">
                      <Sparkles className="w-3 h-3 mr-1" /> Dynamic System Intelligence
                   </span>
                </div>
              </div>
           </div>
        )}

      </SheetContent>
    </Sheet>
  );
};
