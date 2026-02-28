import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { toast } from "sonner";
import { 
  FolderOpen, FileText, FileSpreadsheet, FileIcon, Search, 
  MoreVertical, Download, Upload, Plus, Clock, FileImage, Trash2 
} from "lucide-react";

const TypeIcon = ({ type, className }: { type: string, className?: string }) => {
  switch (type) {
    case "folder": return <FolderOpen className={`text-[#C9A66B] ${className}`} />;
    case "pdf": return <FileText className={`text-red-500 ${className}`} />;
    case "excel": return <FileSpreadsheet className={`text-green-500 ${className}`} />;
    case "word": 
    case "docx": return <FileIcon className={`text-blue-500 ${className}`} />;
    case "image": return <FileImage className={`text-purple-500 ${className}`} />;
    default: return <FileIcon className={`text-gray-500 ${className}`} />;
  }
};

const DocumentRepository = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPath, setCurrentPath] = useState([{ id: "root", name: "Team Drive" }]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: "", type: "pdf", size: "1.0 MB" });
  
  const queryClient = useQueryClient();

  // Fetch Documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Mutations
  const uploadDocMutation = useMutation({
    mutationFn: async (docData: any) => {
      const { error } = await supabase.from('documents').insert([docData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsUploadOpen(false);
      setNewDoc({ name: "", type: "pdf", size: "1.0 MB" });
      toast.success("Document uploaded successfully");
    },
    onError: (error) => toast.error("Failed to upload: " + error.message)
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

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.name) return toast.error("Name is required");
    
    uploadDocMutation.mutate({
      ...newDoc,
      url: "#",
      created_by: "System Admin"
    });
  };

  const filteredFiles = documents?.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#C9A66B' }}>Document Repository</h1>
          <p className="text-muted-foreground mt-2">Centralized secure storage for all RAC templates and files</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#C9A66B]/50 hover:bg-[#C9A66B]/10">
                <Upload className="h-4 w-4 mr-2" /> Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>Add a new file to the repository.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>File Name</Label>
                  <Input required value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} placeholder="e.g. Q4_Report.pdf" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>File Type</Label>
                    <Select value={newDoc.type} onValueChange={(v) => setNewDoc({...newDoc, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="docx">Word (DOCX)</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="folder">Folder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Simulated Size</Label>
                    <Input value={newDoc.size} onChange={e => setNewDoc({...newDoc, size: e.target.value})} placeholder="e.g. 2.4 MB" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full bg-[#C9A66B] hover:bg-[#C9A66B]/90 mt-4" disabled={uploadDocMutation.isPending}>
                    {uploadDocMutation.isPending ? "Uploading..." : "Upload File"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button className="bg-[#1f2937] hover:bg-[#1f2937]/90 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200">
            <Plus className="h-4 w-4 mr-2" /> New Folder
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-[#C9A66B]/20 flex-1 flex flex-col min-h-[500px]">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2 text-sm">
              {currentPath.map((crumb, index) => (
                <div key={crumb.id} className="flex items-center">
                  <span className={`font-medium cursor-pointer hover:text-[#C9A66B] transition-colors ${index === currentPath.length - 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {crumb.name}
                  </span>
                  {index < currentPath.length - 1 && <span className="mx-2 text-muted-foreground">/</span>}
                </div>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search files..."
                className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-[#C9A66B]/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground">Loading documents...</div>
          ) : (
            <div className="w-full">
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-6 md:col-span-5 pl-2">Name</div>
                <div className="hidden md:block col-span-3">Owner</div>
                <div className="hidden sm:block col-span-3 lg:col-span-2 text-right">Size/Items</div>
                <div className="col-span-5 sm:col-span-3 lg:col-span-2 text-right pr-6">Last Modified</div>
              </div>
              
              <div className="divide-y divide-border/30">
                {filteredFiles.map((file) => (
                  <div key={file.id} 
                       className="grid grid-cols-12 gap-4 p-4 items-center group hover:bg-muted/30 transition-colors cursor-pointer"
                       onClick={() => window.open(file.url, '_blank')}
                  >
                    <div className="col-span-6 md:col-span-5 flex items-center gap-3 pl-2">
                      <TypeIcon type={file.type} className="h-5 w-5" />
                      <span className="font-medium text-sm truncate">{file.name}</span>
                    </div>
                    <div className="hidden md:flex col-span-3 items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#C9A66B]/20 flex items-center justify-center text-[10px] font-bold text-[#C9A66B] shrink-0">
                        {file.created_by?.substring(0,2).toUpperCase() || 'RA'}
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{file.created_by || 'System'}</span>
                    </div>
                    <div className="hidden sm:block col-span-3 lg:col-span-2 text-right text-sm text-muted-foreground">
                      {file.type === 'folder' ? 'Folder' : file.size}
                    </div>
                    <div className="col-span-5 sm:col-span-3 lg:col-span-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground truncate ml-auto pr-4">
                        {format(parseISO(file.created_at), 'MMM dd, yyyy')}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-background/80 md:bg-transparent -mr-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this document.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteDocMutation.mutate(file.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredFiles.length === 0 && (
                <div className="py-16 text-center flex flex-col items-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium">No files found</h3>
                  <p className="text-muted-foreground max-w-sm mt-2">
                    We couldn't find any files matching "{searchQuery}". Try changing your search terms.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
          {documents?.slice(0, 4).map((doc, i) => (
            <Card key={i} className="min-w-[280px] flex-shrink-0 shadow-sm border-[#C9A66B]/10">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-full bg-muted mt-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{doc.created_by} uploaded</p>
                  <p className="text-sm text-[#C9A66B] font-medium truncate w-[200px]" title={doc.name}>{doc.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(doc.created_at), 'MMM dd, HH:mm')}
                  </p>
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
