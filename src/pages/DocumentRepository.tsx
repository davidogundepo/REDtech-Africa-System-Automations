import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileIcon, FolderOpen, MoreVertical, Search, Upload, FileText, FileSpreadsheet, FileImage, Link as LinkIcon, ExternalLink, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/email";

const TypeIcon = ({ type, className }: { type: string, className?: string }) => {
  switch (type.toLowerCase()) {
    case "folder": return <FolderOpen className={`text-[#bc7e57] ${className}`} />;
    case "pdf": return <FileText className={`text-red-500 ${className}`} />;
    case "excel": 
    case "csv": return <FileSpreadsheet className={`text-green-500 ${className}`} />;
    case "word": 
    case "docx": return <FileIcon className={`text-blue-500 ${className}`} />;
    case "image": return <FileImage className={`text-purple-500 ${className}`} />;
    case "link": return <LinkIcon className={`text-blue-400 ${className}`} />;
    default: return <FileIcon className={`text-gray-500 ${className}`} />;
  }
};

const DocumentRepository = () => {
  const { profile, canEdit } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newLink, setNewLink] = useState({ name: "", url: "", department: "all" });
  const [uploadDepartment, setUploadDepartment] = useState("all");
  
  const queryClient = useQueryClient();

  // Fetch Documents
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

  // Mutations
  const uploadDocMutation = useMutation({
    mutationFn: async (uploadData: { file: File, name: string, type: string, size: string, department: string | null, created_by: string, uploaded_by_id: string }) => {
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
      toast.success("Document uploaded successfully");
    },
    onError: (error) => toast.error(error.message)
  });

  const addLinkMutation = useMutation({
    mutationFn: async (linkData: { name: string, url: string, department: string | null, created_by: string, uploaded_by_id: string }) => {
      const { error } = await supabase.from('documents').insert([{
        name: linkData.name,
        type: 'link',
        size: 'External',
        url: linkData.url,
        department: linkData.department,
        created_by: linkData.created_by,
        uploaded_by_id: linkData.uploaded_by_id
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsLinkOpen(false);
      setNewLink({ name: "", url: "", department: "all" });
      toast.success("OneDrive link added");
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success("Document deleted");
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!profile) { toast.error("You must be logged in to upload"); return; }

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
      created_by: profile.full_name, uploaded_by_id: profile.id
    });
    
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadDepartment("all"); // Reset
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.name || !newLink.url) return toast.error("Name and URL are required");
    if (!profile) return toast.error("Not logged in");

    // Basic URL validation
    let finalUrl = newLink.url;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    addLinkMutation.mutate({
      name: newLink.name, url: finalUrl,
      department: newLink.department === "all" ? null : newLink.department,
      created_by: profile.full_name, uploaded_by_id: profile.id
    });
  };

  const filteredDocs = documents?.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#bc7e57' }}>Document Repository</h1>
          <p className="text-muted-foreground mt-2">Centralized secure storage for templates, files, and OneDrive links</p>
        </div>
        
        {canEdit && (
          <div className="flex items-center gap-3">
            <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-500/50 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <LinkIcon className="h-4 w-4 mr-2" /> Add OneDrive Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add External Link</DialogTitle>
                  <DialogDescription>Link to a SharePoint or OneDrive document.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleLinkSubmit} className="space-y-4 py-4">
                  <div>
                    <Label>Document Name *</Label>
                    <Input required value={newLink.name} onChange={(e) => setNewLink({...newLink, name: e.target.value})} placeholder="e.g., Q3 Marketing Strategy" />
                  </div>
                  <div>
                    <Label>OneDrive / SharePoint URL *</Label>
                    <Input required type="url" value={newLink.url} onChange={(e) => setNewLink({...newLink, url: e.target.value})} placeholder="https://redtechafrica-my.sharepoint.com/..." />
                  </div>
                  <div>
                    <Label>Department Visibility</Label>
                    <Select value={newLink.department} onValueChange={(v) => setNewLink({ ...newLink, department: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="finance">Finance & Accounting</SelectItem>
                        <SelectItem value="hr">Human Resources</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="marketing">Marketing & Growth</SelectItem>
                        <SelectItem value="tech">Technology</SelectItem>
                        <SelectItem value="executive">Executive</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">If specified, only this department and Admins can view it.</p>
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-2" disabled={addLinkMutation.isPending}>
                    {addLinkMutation.isPending ? "Adding..." : "Save Link"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button style={{ backgroundColor: '#bc7e57' }}>
                  <Upload className="h-4 w-4 mr-2" /> Upload File
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>Directly upload a file to Supabase storage.</DialogDescription>
                </DialogHeader>
                <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="p-4 bg-muted/50 rounded-full border-2 border-dashed border-border/60">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium">Click to select a file</h4>
                    <p className="text-sm text-muted-foreground w-64">Upload PDFs, images, or Office documents.</p>
                  </div>
                  <div className="w-full max-w-xs text-left mt-4 space-y-2">
                    <Label>Department Access</Label>
                    <Select value={uploadDepartment} onValueChange={setUploadDepartment}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="finance">Finance & Accounting</SelectItem>
                        <SelectItem value="hr">Human Resources</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="marketing">Marketing & Growth</SelectItem>
                        <SelectItem value="tech">Technology</SelectItem>
                        <SelectItem value="executive">Executive</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Omit to share with all staff.</p>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <Button onClick={() => fileInputRef.current?.click()} className="bg-[#bc7e57] hover:bg-[#bc7e57]/90 mt-2" disabled={uploadDocMutation.isPending}>
                    {uploadDocMutation.isPending ? "Uploading..." : "Browse Files"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Card className="shadow-sm border-[#bc7e57]/20 flex-1 flex flex-col min-h-[500px]">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-foreground">
              <FolderOpen className="h-4 w-4 text-[#bc7e57]" /> Team Drive
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search files..." className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-[#bc7e57]/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground">Loading documents...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">No files found</h3>
              <p className="text-muted-foreground mt-2">Upload a file or link a OneDrive document to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Size/Type</TableHead>
                  <TableHead className="text-right">Added On</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((file) => (
                  <TableRow key={file.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.open(file.url, '_blank')}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <TypeIcon type={file.type} className="h-5 w-5 shrink-0" />
                        <div>
                          <span className="font-medium flex items-center">{file.name}</span>
                          {file.department && (
                            <span className="text-xs text-muted-foreground capitalize flex items-center mt-1">
                              <FolderOpen className="w-3 h-3 mr-1"/>{file.department} Only
                            </span>
                          )}
                        </div>
                        {file.type === 'link' && <ExternalLink className="h-3 w-3 text-muted-foreground ml-1" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-[#bc7e57]/20 flex items-center justify-center text-[10px] font-bold text-[#bc7e57] shrink-0">
                          {file.created_by?.substring(0,2).toUpperCase() || 'RA'}
                        </div>
                        <span className="text-sm text-muted-foreground">{file.created_by || 'System'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{file.size}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{format(parseISO(file.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(file.url, '_blank')}>
                              <ExternalLink className="h-4 w-4 mr-2" /> Open
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600" onClick={(e) => {
                              e.preventDefault();
                              if (window.confirm("Are you sure you want to delete this document?")) {
                                deleteDocMutation.mutate(file.id);
                              }
                            }}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
          {documents?.slice(0, 4).map((doc, i) => (
            <Card key={i} className="min-w-[280px] flex-shrink-0 shadow-sm border-[#bc7e57]/10">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-full bg-muted mt-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{doc.created_by} {doc.type === 'link' ? 'linked' : 'uploaded'}</p>
                  <p className="text-xs text-[#bc7e57] font-medium truncate w-[200px]" title={doc.name}>{doc.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(parseISO(doc.created_at), 'MMM d, h:mm a')}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DocumentRepository;
