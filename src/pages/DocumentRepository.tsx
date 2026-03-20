import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { FileIcon, FolderOpen, MoreVertical, Search, Upload, FileText, FileSpreadsheet, FileImage, Link as LinkIcon, ExternalLink, Trash2, Clock, Eye, AlertCircle, Building2, Globe, X, Download } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { useTheme } from "@/components/ThemeProvider";

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
             <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
               {file.size}
             </span>
             {file.department && (
               <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#bc7e57]/10 text-[#bc7e57]">
                 <FolderOpen className="h-2.5 w-2.5 mr-1" /> {file.department}
               </span>
             )}
             {file.type === 'link' && (
               <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                 External
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
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file");
  const [newLink, setNewLink] = useState({ name: "", url: "", department: "all" });
  const [uploadDepartment, setUploadDepartment] = useState("all");
  
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
    return matchesSearch && matchesTab;
  });

  if (isLoading) return (
    <div className="flex-1 w-full min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <FolderOpen className="h-8 w-8 text-[#bc7e57] animate-pulse" />
        <p className="text-muted-foreground animate-pulse">Mounting secure drive...</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-4 md:p-8 overflow-y-auto">
      
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

          {canEdit && (
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

      {/* Tabs Layout */}
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
          ) : (
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

    </div>
  );
};

export default DocumentRepository;
