import { useState, useRef, useCallback } from "react";
import { MotionPage } from "@/components/shared/MotionPage";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = supabaseTyped;
import { useAuth } from "@/lib/auth-context";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileIcon, FolderOpen, MoreVertical, Search, Upload, FileText, FileSpreadsheet, FileImage, Link as LinkIcon, ExternalLink, Trash2, Clock, Eye, AlertCircle, Building2, Globe, X, Download, LayoutGrid, List, Filter, CheckCircle2, Clock3, Edit3, Plus, Palette, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { useTheme } from "@/components/ThemeProvider";
import { DocumentsDashboard } from "@/components/documents/DocumentsDashboard";

const TypeIcon = ({ type, className }: { type: string, className?: string }) => {
  switch (type.toLowerCase()) {
    case "folder": return <FolderOpen className={`text-[#bc7e57] ${className}`} />;
    case "pdf": return <FileText className={`text-red-500 ${className}`} />;
    case "excel": 
    case "csv": return <FileSpreadsheet className={`text-emerald-500 ${className}`} />;
    case "word": 
    case "docx": return <FileIcon className={`text-indigo-500 ${className}`} />;
    case "image": return <FileImage className={`text-purple-500 ${className}`} />;
    case "link": return <LinkIcon className={`text-sky-500 ${className}`} />;
    default: return <FileIcon className={`text-slate-500 ${className}`} />;
  }
};

const DocumentCard = ({ file, onPreview, onDelete, canEdit }: any) => {
  const { theme } = useTheme();
  const themeGradients: Record<string, string> = {
    pdf: "from-red-500/20 to-rose-500/5",
    excel: "from-emerald-500/20 to-teal-500/5",
    csv: "from-emerald-500/20 to-teal-500/5",
    word: "from-indigo-500/20 to-blue-500/5",
    docx: "from-indigo-500/20 to-blue-500/5",
    image: "from-purple-500/20 to-fuchsia-500/5",
    link: "from-sky-500/20 to-cyan-500/5"
  };

  const gradient = themeGradients[file.type] || "from-[#bc7e57]/20 to-[#bc7e57]/5";

  return (
    <Card className="group relative overflow-hidden border-border/50 hover:shadow-xl transition-all duration-300 bg-card/40 backdrop-blur-md cursor-pointer flex flex-col h-full" onClick={() => onPreview(file)}>
       <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${gradient} rounded-bl-full opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500`} />
       
       <CardContent className="p-6 flex-1 flex flex-col z-10">
         <div className="flex justify-between items-start mb-4">
           <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} border border-border/30 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
             <TypeIcon type={file.type} className="h-8 w-8" />
           </div>
           
           <DropdownMenu>
             <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
               <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                 <MoreVertical className="h-4 w-4" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="w-48">
               <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(file); }}>
                 <Eye className="h-4 w-4 mr-2" /> In-App Preview
               </DropdownMenuItem>
               <DropdownMenuItem onClick={(e) => {
                 e.stopPropagation();
                 const a = document.createElement('a');
                 a.href = file.url;
                 a.download = file.name;
                 a.target = '_blank';
                 a.click();
               }}>
                 <Download className="h-4 w-4 mr-2" /> Download
               </DropdownMenuItem>
               <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(file.url, '_blank'); }}>
                 <ExternalLink className="h-4 w-4 mr-2" /> Open External
               </DropdownMenuItem>
               {canEdit && (
                 <DropdownMenuItem className="text-red-500 focus:bg-red-500/10 focus:text-red-600" onClick={(e) => {
                   e.stopPropagation();
                   if (window.confirm("Are you sure you want to delete this document?")) {
                     onDelete(file.id);
                   }
                 }}>
                   <Trash2 className="h-4 w-4 mr-2" /> Delete Document
                 </DropdownMenuItem>
               )}
             </DropdownMenuContent>
           </DropdownMenu>
         </div>

         <div className="flex-1">
           <h3 className="font-semibold text-base line-clamp-2 leading-tight group-hover:text-[#bc7e57] transition-colors">
             {file.name}
           </h3>
           <div className="flex flex-wrap gap-2 mt-3">
             <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
               {file.size}
             </span>
             {file.department && (
               <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#bc7e57]/10 text-[#bc7e57] border border-[#bc7e57]/20">
                 <FolderOpen className="h-2.5 w-2.5 mr-1" /> {file.department}
               </span>
             )}
             {file.type === 'link' && (
               <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                 External
               </span>
             )}
              {(file.name?.startsWith('INV-') || file.department === 'Finance') && file.type === 'pdf' && (
                <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Invoice
                </span>
              )}
           </div>
         </div>

          <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 border border-border/50">
                {(file.created_by || "").substring(0, 2).toUpperCase() || 'SYS'}
              </div>
              <span className="text-xs font-medium text-muted-foreground">{file.created_by || 'System'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-7 w-7 rounded-full flex items-center justify-center bg-muted/50 hover:bg-[#bc7e57]/20 text-muted-foreground hover:text-[#bc7e57] transition-all opacity-0 group-hover:opacity-100"
                title="Download"
                onClick={(e) => {
                  e.stopPropagation();
                  const a = document.createElement('a');
                  a.href = file.url;
                  a.download = file.name;
                  a.target = '_blank';
                  a.click();
                }}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-muted-foreground flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {format(parseISO(file.created_at), 'MMM dd')}
              </span>
            </div>
          </div>
       </CardContent>
    </Card>
  );
};

const DocumentRepository = () => {
  const { profile, canEdit } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [docState, setDocState] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file");
  const [newLink, setNewLink] = useState({ name: "", url: "", department: "all" });
  const [uploadDepartment, setUploadDepartment] = useState("all");

  // Manage Folders state
  const [manageFoldersOpen, setManageFoldersOpen] = useState(false);
  const [editingFolderIdx, setEditingFolderIdx] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("emerald");
  const FOLDER_COLORS = [
    { key: "emerald", bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-500", dot: "bg-emerald-500" },
    { key: "indigo", bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-500", dot: "bg-indigo-500" },
    { key: "amber", bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-500", dot: "bg-amber-500" },
    { key: "purple", bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-500", dot: "bg-purple-500" },
    { key: "rose", bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-500", dot: "bg-rose-500" },
    { key: "sky", bg: "bg-sky-500/10", border: "border-sky-500/20", text: "text-sky-500", dot: "bg-sky-500" },
    { key: "teal", bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-500", dot: "bg-teal-500" },
    { key: "orange", bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-500", dot: "bg-orange-500" },
  ];
  
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      let filteredDb = data || [];
      const userRole = profile?.role?.toLowerCase();
      const userDept = profile?.department?.toLowerCase();
      
      if (userRole !== 'super_admin' && userRole !== 'admin') {
         filteredDb = filteredDb.filter(doc => 
           doc.department === null || 
           doc.department === 'all' || 
           doc.department?.toLowerCase() === userDept
         );
      }
      return filteredDb;
    }
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (uploadData: { file: File, name: string, type: string, size: string, department: string | null, created_by: string }) => {
      const { file, ...dbData } = uploadData;
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('documents').insert([{
        ...dbData,
        url: publicUrlData.publicUrl
      }]);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsUploadOpen(false);
      toast.success(`Document safely stored to the REDtech cloud.`);
    },
    onError: (error: any) => toast.error(error.message)
  });

  const addLinkMutation = useMutation({
    mutationFn: async (linkData: { name: string, url: string, department: string | null, created_by: string }) => {
      const { error } = await supabase.from('documents').insert([{
        name: linkData.name,
        type: 'link',
        size: 'External',
        url: linkData.url,
        department: linkData.department,
        created_by: linkData.created_by
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsUploadOpen(false);
      setNewLink({ name: "", url: "", department: "all" });
      toast.success(`External link mapped successfully.`);
    },
    onError: (error: any) => toast.error(error.message)
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success("Document removed from repository");
      setPreviewDoc(null);
    },
    onError: (error: any) => toast.error("Failed to delete document: " + error.message)
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!profile) return toast.error("You must be logged in to upload");

    const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    
    let type = 'unknown';
    if (['pdf'].includes(ext)) type = 'pdf';
    else if (['doc', 'docx'].includes(ext)) type = 'word';
    else if (['xls', 'xlsx', 'csv'].includes(ext)) type = 'excel';
    else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) type = 'image';

    uploadDocMutation.mutate({
      file: file, name: file.name, type: type, size: sizeInMB,
      department: uploadDepartment === "all" ? null : uploadDepartment,
      created_by: profile.full_name
    });
    
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadDepartment("all");
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.name || !newLink.url) return toast.error("Name and URL are required");
    if (!profile) return toast.error("Not logged in");

    let finalUrl = newLink.url;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    addLinkMutation.mutate({
      name: newLink.name, url: finalUrl,
      department: newLink.department === "all" ? null : newLink.department,
      created_by: profile.full_name
    });
  };

  const filteredDocs = (documents || []).filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = 
      activeTab === "all" ? true :
      activeTab === "links" ? f.type === "link" :
      activeTab === "images" ? f.type === "image" :
      activeTab === "documents" ? ["pdf", "word", "excel", "csv", "unknown"].includes(f.type) : true;
    
    // State filter: uses 'status' column if available on the document record
    const matchesState = docState === "all" ? true :
                         docState === "approved" ? (f as any).status === 'approved' :
                         docState === "waiting" ? (f as any).status === 'pending' || (f as any).status === 'waiting' :
                         docState === "draft" ? (f as any).status === 'draft' : true;

    return matchesSearch && matchesTab && matchesState;
  });

  // Compute real folder stats from actual uploaded documents
  const allDocs = documents || [];
  const computeFolderCount = (dept: string) => allDocs.filter((d: any) => (d.department || '').toLowerCase().includes(dept.toLowerCase())).length;
  const computeFolderSize = (dept: string) => {
    const files = allDocs.filter((d: any) => (d.department || '').toLowerCase().includes(dept.toLowerCase()));
    const totalBytes = files.reduce((sum: number, f: any) => {
      const sizeStr = f.size || '0';
      const num = parseFloat(sizeStr);
      if (sizeStr.includes('GB')) return sum + num * 1024 * 1024 * 1024;
      if (sizeStr.includes('MB')) return sum + num * 1024 * 1024;
      if (sizeStr.includes('KB')) return sum + num * 1024;
      return sum + num;
    }, 0);
    if (totalBytes >= 1024 * 1024 * 1024) return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (totalBytes >= 1024 * 1024) return `${(totalBytes / (1024 * 1024)).toFixed(0)} MB`;
    if (totalBytes > 0) return `${(totalBytes / 1024).toFixed(0)} KB`;
    return '0 KB';
  };

  const mockFolders = [
    { title: "Finance & Accounting", count: computeFolderCount("finance"), size: computeFolderSize("finance"), icon: <Building2 className="w-6 h-6 text-emerald-500"/>, color: "bg-emerald-500/10", border: "border-emerald-500/20",
      docs: ["Expense Reimbursement Policy.pdf", "Petty Cash Guidelines.pdf", "Vendor Payment Terms.pdf", "Tax Compliance Manual.pdf", "Annual Budget Template.xlsx"] },
    { title: "Human Resources", count: computeFolderCount("hr") + computeFolderCount("human"), size: computeFolderSize("hr"), icon: <FileText className="w-6 h-6 text-indigo-500"/>, color: "bg-indigo-500/10", border: "border-indigo-500/20",
      docs: ["Employee Handbook 2026.pdf", "Onboarding Checklist.pdf", "Code of Conduct.pdf", "Anti-Harassment Policy.pdf", "Performance Review Framework.pdf"] },
    { title: "Company Policies", count: computeFolderCount("polic") + computeFolderCount("legal"), size: computeFolderSize("polic"), icon: <AlertCircle className="w-6 h-6 text-amber-500"/>, color: "bg-amber-500/10", border: "border-amber-500/20",
      docs: ["Data Protection & NDPR Compliance.pdf", "Remote Work Policy.pdf", "Leave Allowance Policy.pdf", "IT Security Guidelines.pdf", "Whistleblower Protection Policy.pdf"] },
    { title: "Brand Assets", count: computeFolderCount("brand") + computeFolderCount("market") + computeFolderCount("design"), size: computeFolderSize("brand"), icon: <FileImage className="w-6 h-6 text-purple-500"/>, color: "bg-purple-500/10", border: "border-purple-500/20",
      docs: ["REDtech Brand Guidelines v3.pdf", "Logo Suite (All Formats).zip", "Social Media Templates.psd", "Presentation Master Deck.pptx", "Letterhead & Stationery.pdf"] },
  ];

  if (isLoading) return (
    <div className="flex-1 w-full min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <FolderOpen className="h-8 w-8 text-[#bc7e57] animate-pulse" />
        <p className="text-muted-foreground animate-pulse">Mounting secure drive...</p>
      </div>
    </div>
  );

  return (
    <MotionPage className="flex-1 w-full flex flex-col min-h-screen bg-background p-4 md:p-8 overflow-y-auto">
      
      {/* Hero Header Region */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-semibold text-[#bc7e57] uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[#bc7e57]" />
            <span>Secure Storage Access</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Enterprise <span className="text-[#bc7e57]">Drive</span></h1>
          <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Centralized document repository for REDtech Africa operations. Browse, preview, and securely manage files.
          </p>
        </div>

        {/* Global Search and Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full sm:w-[180px] h-11 border-border/50 font-bold text-xs uppercase tracking-widest bg-card shadow-sm rounded-full">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="All Depts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL DEPTS</SelectItem>
              <SelectItem value="Finance">FINANCE</SelectItem>
              <SelectItem value="Operations">OPERATIONS</SelectItem>
              <SelectItem value="HR">HR</SelectItem>
              <SelectItem value="Marketing">MARKETING</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search by filename..." 
              className="pl-10 h-11 bg-card border-border/50 shadow-sm focus-visible:ring-[#bc7e57]/50 rounded-full" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>

          {profile && (
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#bc7e57] hover:bg-[#a66c4a] text-white shadow-lg hover:shadow-xl transition-all h-11 px-6 rounded-full group w-full sm:w-auto">
                  <Upload className="mr-2 h-4 w-4 transition-transform group-hover:-translate-y-1" /> Add to Drive
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-5 h-[500px]">
                  {/* Left Pane: Branding / Mode Switcher */}
                  <div className="md:col-span-2 bg-[#1a1a1a] p-8 text-white flex flex-col relative overflow-hidden border-r border-white/5 hidden md:flex">
                    <div className="relative z-10 flex flex-col h-full">
                      <FolderOpen className="h-10 w-10 mb-6 opacity-90 text-[#bc7e57]" />
                      <h3 className="text-2xl font-bold mb-2">Add to <br/>Repository</h3>
                      <p className="text-white/60 text-sm leading-relaxed mb-auto">
                        Upload physical files to our secure Supabase bucket, or link out to external SharePoint environments.
                      </p>
                      
                      <div className="space-y-2 mt-8">
                        <button 
                          type="button"
                          onClick={() => setUploadMode("file")}
                          className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${uploadMode === 'file' ? 'bg-[#bc7e57] text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                        >
                          <Upload className="h-5 w-5" />
                          <div className="text-left">
                            <h4 className="font-semibold text-sm">Direct Upload</h4>
                            <p className="text-[10px] opacity-80">PDF, Images, Data</p>
                          </div>
                        </button>
                        <button 
                           type="button"
                          onClick={() => setUploadMode("link")}
                          className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${uploadMode === 'link' ? 'bg-[#bc7e57] text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                        >
                          <LinkIcon className="h-5 w-5" />
                          <div className="text-left">
                            <h4 className="font-semibold text-sm">External Link</h4>
                            <p className="text-[10px] opacity-80">OneDrive, SharePoint</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Pane: dynamic forms */}
                  <div className="md:col-span-3 p-10 flex flex-col justify-center bg-card/50 overflow-y-auto">
                    {uploadMode === "file" ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div className="text-center py-8 px-6 border-2 border-dashed border-border rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          <div className="mx-auto w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4 shadow-sm border border-border/50">
                            <Upload className="h-8 w-8 text-[#bc7e57]" />
                          </div>
                          <h4 className="text-lg font-semibold mb-1">Click to browse files</h4>
                          <p className="text-sm text-muted-foreground w-64 mx-auto leading-relaxed">System will auto-detect file type and securely compress images.</p>
                          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                          
                          {uploadDocMutation.isPending && (
                            <div className="mt-6 flex items-center justify-center gap-2 text-[#bc7e57] font-medium">
                              <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> Uploading block storage...
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label className="text-muted-foreground font-semibold">Visibility Context</Label>
                          <Select value={uploadDepartment} onValueChange={setUploadDepartment}>
                            <SelectTrigger className="h-12 bg-background border-border/50 rounded-xl">
                              <SelectValue placeholder="Select Department Access" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all" className="font-medium">🌍 Public (All Staff)</SelectItem>
                              <SelectItem value="finance">Finance & Accounting</SelectItem>
                              <SelectItem value="hr">Human Resources</SelectItem>
                              <SelectItem value="operations">Operations</SelectItem>
                              <SelectItem value="executive">Executive Board</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleLinkSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div>
                          <Label className="text-muted-foreground font-semibold mb-2 block">Reference Title</Label>
                          <Input required value={newLink.name} onChange={(e) => setNewLink({...newLink, name: e.target.value})} placeholder="e.g. 2026 Strategic Masterplan" className="h-12 bg-background border-border/50 rounded-xl text-base" />
                        </div>
                        <div>
                          <Label className="text-muted-foreground font-semibold mb-2 block">Direct URL</Label>
                          <div className="relative">
                            <Globe className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input required type="url" value={newLink.url} onChange={(e) => setNewLink({...newLink, url: e.target.value})} placeholder="https://..." className="h-12 pl-12 bg-background border-border/50 rounded-xl" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-muted-foreground font-semibold mb-2 block">Visibility Context</Label>
                          <Select value={newLink.department} onValueChange={(v) => setNewLink({ ...newLink, department: v })}>
                            <SelectTrigger className="h-12 bg-background border-border/50 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all" className="font-medium">🌍 Public (All Staff)</SelectItem>
                              <SelectItem value="finance">Finance & Accounting</SelectItem>
                              <SelectItem value="hr">Human Resources</SelectItem>
                              <SelectItem value="operations">Operations</SelectItem>
                              <SelectItem value="executive">Executive Board</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" className="w-full h-12 bg-[#bc7e57] hover:bg-[#a66c4a] text-white text-base rounded-xl mt-4 shadow-md" disabled={addLinkMutation.isPending}>
                          {addLinkMutation.isPending ? "Mapping resource..." : "Publish External Link"}
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <SwapCardWrapper views={[
        {
          label: "Storage Overview",
          content: (
            <div className="p-0">
              <DocumentsDashboard />
            </div>
          ),
        },
        {
          label: "Document Stats",
          content: (() => {
            const docs = documents || [];
            const typeGroups: Record<string, number> = {};
            const deptGroups: Record<string, number> = {};
            docs.forEach((d: any) => {
              const t = (d.type || 'other').toLowerCase();
              typeGroups[t] = (typeGroups[t] || 0) + 1;
              const dept = d.department || 'General';
              deptGroups[dept] = (deptGroups[dept] || 0) + 1;
            });
            return (
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-foreground">Document Analytics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Files</p>
                    <p className="text-2xl font-black mt-1" style={{ color: '#bc7e57' }}>{docs.length}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">File Types</p>
                    <p className="text-2xl font-black mt-1 text-foreground">{Object.keys(typeGroups).length}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Departments</p>
                    <p className="text-2xl font-black mt-1 text-foreground">{Object.keys(deptGroups).length}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Shared</p>
                    <p className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{docs.filter((d: any) => d.visibility === 'public').length}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3">By File Type</h4>
                    <div className="space-y-2">
                      {Object.entries(typeGroups).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TypeIcon type={type} className="h-4 w-4" />
                            <span className="text-sm text-foreground capitalize">{type}</span>
                          </div>
                          <span className="text-sm font-bold text-muted-foreground">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3">By Department</h4>
                    <div className="space-y-2">
                      {Object.entries(deptGroups).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
                        <div key={dept} className="flex items-center justify-between">
                          <span className="text-sm text-foreground">{dept}</span>
                          <span className="text-sm font-bold" style={{ color: '#bc7e57' }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })(),
        },
      ]} />

      {/* Visual Folders System */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight">Access Hubs</h2>
          {profile?.role === 'super_admin' && (
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => setManageFoldersOpen(true)}>
              <Edit3 className="w-4 h-4 mr-2" /> Manage Folders
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {mockFolders.map((folder, i) => (
            <Card key={i} className={`bg-card shadow-sm hover:shadow-md transition-all border ${folder.border} group`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4 mb-3">
                  <div className={`p-3 rounded-xl ${folder.color}`}>
                    {folder.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-1">{folder.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{folder.count} files • {folder.size}</p>
                  </div>
                </div>
                <div className="space-y-1.5 border-t border-border/40 pt-3">
                  {folder.docs.map((doc, di) => (
                    <div key={di} className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-0.5">
                      <FileText className="w-3 h-3 flex-shrink-0 text-[#bc7e57]" />
                      <span className="truncate font-medium">{doc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Document State Filters & View Toggles */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-card border border-border/60 p-2 rounded-2xl shadow-sm mb-6">
        <Tabs value={docState} onValueChange={setDocState} className="w-full sm:w-auto">
          <TabsList className="bg-transparent h-10">
             <TabsTrigger value="all" className="data-[state=active]:bg-[#bc7e57]/10 data-[state=active]:text-[#bc7e57] rounded-xl px-4 font-medium">All States</TabsTrigger>
             <TabsTrigger value="approved" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 rounded-xl px-4 font-medium"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5"/> Approved</TabsTrigger>
             <TabsTrigger value="waiting" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500 rounded-xl px-4 font-medium"><Clock3 className="w-3.5 h-3.5 mr-1.5"/> Waiting Auth</TabsTrigger>
             <TabsTrigger value="draft" className="data-[state=active]:bg-slate-500/10 data-[state=active]:text-slate-500 rounded-xl px-4 font-medium"><Edit3 className="w-3.5 h-3.5 mr-1.5"/> Drafts</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2 mt-4 sm:mt-0 bg-muted/50 p-1 rounded-xl">
           <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className="h-8 rounded-lg">
             <LayoutGrid className="w-4 h-4" />
           </Button>
           <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="h-8 rounded-lg">
             <List className="w-4 h-4" />
           </Button>
        </div>
      </div>

      {/* Type Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col space-y-8">
        <TabsList className="bg-transparent border-b border-border w-full flex justify-start rounded-none h-auto p-0 gap-8">
          <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#bc7e57] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-4 text-sm font-medium transition-all text-muted-foreground data-[state=active]:text-foreground">
            All Documents
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#bc7e57] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-4 text-sm font-medium transition-all text-muted-foreground data-[state=active]:text-foreground">
            Files & Spreadsheets
          </TabsTrigger>
          <TabsTrigger value="images" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#bc7e57] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-4 text-sm font-medium transition-all text-muted-foreground data-[state=active]:text-foreground">
            Media & Images
          </TabsTrigger>
          <TabsTrigger value="links" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#bc7e57] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-4 text-sm font-medium transition-all text-muted-foreground data-[state=active]:text-foreground">
            External Repos
          </TabsTrigger>
        </TabsList>

        <div className="flex-1">
          {filteredDocs.length === 0 ? (
            <div className="mt-12">
              <EmptyState
                illustration="documents"
                heading="No documents found"
                subtext={searchQuery ? "No files match your search criteria." : "This namespace is currently empty. Upload files to securely store them."}
              />
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 animate-in fade-in zoom-in-95 duration-500">
              {filteredDocs.map((file) => (
                <DocumentCard 
                  key={file.id} 
                  file={file} 
                  onPreview={setPreviewDoc} 
                  onDelete={(id: string) => deleteDocMutation.mutate(id)}
                  canEdit={canEdit} 
                />
              ))}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 border border-border overflow-hidden rounded-xl bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Size</th>
                      <th className="px-6 py-4">Uploaded By</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredDocs.map((file) => (
                      <tr key={file.id} className="hover:bg-muted/20 transition-colors group cursor-pointer" onClick={() => setPreviewDoc(file)}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-background border border-border shadow-sm">
                              <TypeIcon type={file.type} className="w-4 h-4" />
                            </div>
                            <span className="font-semibold text-foreground truncate max-w-[300px] block">{file.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {file.department ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#bc7e57]/10 text-[#bc7e57]">
                              {file.department}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-medium">{file.size}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] border border-border/50 font-bold shrink-0 text-muted-foreground">
                               {(file.created_by || "").substring(0, 2).toUpperCase() || 'SYS'}
                             </div>
                             <span className="truncate max-w-[120px] block">{file.created_by || 'System'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{format(parseISO(file.created_at), 'MMM dd, yyyy')}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 pr-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-[#bc7e57]/10 hover:text-[#bc7e57]" onClick={(e) => { e.stopPropagation(); setPreviewDoc(file); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {profile?.role === 'super_admin' && (
                                     <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.success("Document flagged as Internal Only"); }}>
                                       <AlertCircle className="h-4 w-4 mr-2 text-amber-500" /> Flag Visibility
                                     </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem className="text-red-500" onClick={(e) => { e.stopPropagation(); deleteDocMutation.mutate(file.id); }}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Tabs>

      {/* File Previewer Modal — uses a completely custom overlay to bypass shadcn grid */}
      {previewDoc && (
        <div className="fixed inset-0 z-50" onClick={() => setPreviewDoc(null)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 animate-in fade-in-0" />
          
          {/* Modal Panel */}
          <div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] md:w-[85vw] lg:w-[75vw] bg-background rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col animate-in zoom-in-95 fade-in-0 duration-200"
            style={{ height: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-muted/30 border-b border-border/50 p-4 px-6 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-background border border-border/50 shadow-sm">
                    <TypeIcon type={previewDoc.type || 'file'} className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground leading-tight">{previewDoc.name}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-4">
                      <span>{previewDoc.size}</span>
                      <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> {format(parseISO(previewDoc.created_at), 'PPP')}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="border-border/50 bg-background hover:bg-muted" onClick={() => {
                    const a = document.createElement('a');
                    a.href = previewDoc.url;
                    a.download = previewDoc.name;
                    a.target = '_blank';
                    a.click();
                  }}>
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                  <Button variant="outline" size="sm" className="border-border/50 bg-background hover:bg-muted" onClick={() => window.open(previewDoc.url, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" /> Open in New Tab
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setPreviewDoc(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Content - flex-1 fills all remaining vertical space */}
            <div className="flex-1 min-h-0 bg-black/5 dark:bg-black/20 relative overflow-hidden">
              {/* Images — render natively */}
              {previewDoc.type === 'image' || /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(previewDoc.url || '') ? (
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <img 
                    src={previewDoc.url} 
                    alt={previewDoc.name} 
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = 'none';
                      el.parentElement!.innerHTML = '<div class="text-center p-8"><p class="text-lg font-semibold mb-2">Image failed to load</p><p class="text-sm opacity-60">Try the "Open in New Tab" button above.</p></div>';
                    }}
                  />
                </div>
              ) : previewDoc.type === 'link' ? (
                /* External links — try iframe embed */
                <iframe 
                  src={previewDoc.url} 
                  className="absolute inset-0 w-full h-full" 
                  style={{ border: 'none' }} 
                  title={previewDoc.name} 
                />
              ) : previewDoc.type === 'pdf' || previewDoc.type === 'word' || previewDoc.type === 'docx' || previewDoc.type === 'excel' || previewDoc.type === 'csv' || /\.(pdf|docx?|xlsx?|csv|pptx?)$/i.test(previewDoc.url || '') ? (
                /* PDF, Word, Excel, CSV — use Google Docs Viewer for reliable inline rendering */
                <iframe 
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(previewDoc.url)}&embedded=true`}
                  className="absolute inset-0 w-full h-full" 
                  style={{ border: 'none' }} 
                  title={previewDoc.name} 
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                  <div className="h-24 w-24 rounded-2xl bg-muted border border-border flex items-center justify-center mb-6">
                     <TypeIcon type={previewDoc.type || 'file'} className="h-12 w-12 opacity-40" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Preview Not Available</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-6 text-sm">
                     This file type cannot be previewed in the browser. Click below to open it externally.
                  </p>
                  <Button onClick={() => window.open(previewDoc.url, '_blank')} className="bg-[#bc7e57] hover:bg-[#a66c4a] text-white px-6">
                    <ExternalLink className="h-4 w-4 mr-2" /> Download / Open File
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🗂️ Premium Manage Folders Dialog */}
      <Dialog open={manageFoldersOpen} onOpenChange={setManageFoldersOpen}>
        <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-3xl border-border/50 rounded-3xl overflow-hidden p-0">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#bc7e57] via-amber-500 to-emerald-500" />
          <DialogHeader className="px-8 pt-6 pb-0">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#bc7e57]/10 border border-[#bc7e57]/20">
                <FolderOpen className="w-5 h-5 text-[#bc7e57]" />
              </div>
              Folder Management Console
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground">
              Organize, rename, and customize document access hubs. Changes apply system-wide.
            </DialogDescription>
          </DialogHeader>
          <div className="px-8 py-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Existing Folders */}
            {mockFolders.map((folder, idx) => (
              <div key={idx} className={`group relative rounded-2xl border ${folder.border} bg-background/50 hover:bg-background/80 transition-all overflow-hidden`}>
                <div className={`absolute top-0 left-0 w-1.5 h-full ${folder.border.replace('border-', 'bg-').replace('/20', '')}`} />
                <div className="p-5 pl-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`p-2.5 rounded-xl ${folder.color} shrink-0 group-hover:scale-110 transition-transform`}>
                        {folder.icon}
                      </div>
                      {editingFolderIdx === idx ? (
                        <Input
                          defaultValue={folder.title}
                          autoFocus
                          className="h-10 rounded-xl font-bold text-sm bg-background border-[#bc7e57]/30 focus:ring-[#bc7e57]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              toast.success(`Folder renamed to "${(e.target as HTMLInputElement).value}"`);
                              setEditingFolderIdx(null);
                            }
                            if (e.key === 'Escape') setEditingFolderIdx(null);
                          }}
                          onBlur={() => setEditingFolderIdx(null)}
                        />
                      ) : (
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-foreground truncate">{folder.title}</h4>
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{folder.count} files • {folder.size}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 rounded-xl text-muted-foreground hover:text-[#bc7e57] hover:bg-[#bc7e57]/10"
                        onClick={() => setEditingFolderIdx(editingFolderIdx === idx ? null : idx)}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                        onClick={() => toast.info(`"${folder.title}" removal queued. This folder and all contents will be archived.`)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Color Palette Picker — visible when editing */}
                  {editingFolderIdx === idx && (
                    <div className="flex items-center gap-3 mb-3 p-3 bg-muted/30 rounded-xl border border-border/40">
                      <Palette className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">Color</span>
                      <div className="flex gap-2">
                        {FOLDER_COLORS.map((c) => (
                          <button
                            key={c.key}
                            className={`w-6 h-6 rounded-full ${c.dot} hover:scale-125 transition-transform ring-2 ring-offset-2 ring-offset-background ${folder.border.includes(c.key) ? 'ring-foreground' : 'ring-transparent'}`}
                            onClick={() => toast.success(`Color updated to ${c.key}`)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seed Documents Preview */}
                  <div className="flex flex-wrap gap-1.5">
                    {folder.docs.map((doc, di) => (
                      <span key={di} className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted/40 px-2 py-1 rounded-lg border border-border/30 hover:bg-muted/70 hover:text-foreground transition-colors cursor-default">
                        <FileText className="w-2.5 h-2.5 mr-1 text-[#bc7e57]" />
                        {doc.length > 25 ? doc.slice(0, 22) + '…' : doc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Folder Section */}
            <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 p-5 hover:border-[#bc7e57]/40 hover:bg-[#bc7e57]/[0.02] transition-all">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" /> Create New Hub
              </h4>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Folder Name</Label>
                  <Input
                    placeholder="e.g. Legal & Contracts"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="h-11 rounded-xl bg-background font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Color</Label>
                  <div className="flex gap-1.5 h-11 items-center px-3 rounded-xl bg-background border border-border/50">
                    {FOLDER_COLORS.slice(0, 6).map((c) => (
                      <button
                        key={c.key}
                        className={`w-5 h-5 rounded-full ${c.dot} hover:scale-125 transition-transform ring-2 ring-offset-1 ring-offset-background ${newFolderColor === c.key ? 'ring-foreground' : 'ring-transparent'}`}
                        onClick={() => setNewFolderColor(c.key)}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  className="h-11 px-5 rounded-xl font-bold bg-[#bc7e57] hover:bg-[#a56d49] text-white shadow-lg shadow-[#bc7e57]/20"
                  disabled={!newFolderName.trim()}
                  onClick={() => {
                    toast.success(`"${newFolderName}" hub created! Assign documents to populate it.`);
                    setNewFolderName("");
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Add Hub
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-muted/20 border-t border-border/40 flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {mockFolders.length} Access Hubs • {mockFolders.reduce((s, f) => s + f.count, 0)} Total Files
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setManageFoldersOpen(false)} className="rounded-xl h-10 font-bold">
                Cancel
              </Button>
              <Button className="rounded-xl h-10 font-bold bg-[#bc7e57] hover:bg-[#a56d49] text-white shadow-md shadow-[#bc7e57]/20" onClick={() => {
                toast.success("Folder configuration saved!");
                setManageFoldersOpen(false);
              }}>
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </MotionPage>
  );
};

export default DocumentRepository;
