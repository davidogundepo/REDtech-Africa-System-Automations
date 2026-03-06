import { ViewerBanner } from "@/components/ViewerBanner";
import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Linkedin, Twitter, Instagram, Facebook, Plus, Clock, CheckCircle2, Megaphone, Trash2, Heart, MessageSquare, Share2, Upload, Download, Calendar, Film, LayoutGrid, BookImage, Newspaper, Zap, ImageIcon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/email";

// Simple CSV parser for browsers
const parseCSV = (text: string) => {
  const result = [];
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  
  for(let i = 1; i < lines.length; i++) {
    if(!lines[i].trim()) continue;
    // Handle quotes in CSV naive regex
    const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const obj: any = {};
    for(let j = 0; j < headers.length; j++) {
      if(currentline[j]) {
        obj[headers[j]] = currentline[j].trim().replace(/^"|"$/g, '');
      }
    }
    result.push(obj);
  }
  return result;
};

const PlatformIcon = ({ platform, size = "h-5 w-5" }: { platform: string; size?: string }) => {
  const { theme } = useTheme();
  const colour = theme === "dark" ? "text-white" : "text-gray-800";
  switch (platform.toLowerCase()) {
    case "linkedin": return <Linkedin className={`${size} ${colour}`} />;
    case "twitter": return <Twitter className={`${size} ${colour}`} />;
    case "instagram": return <Instagram className={`${size} ${colour}`} />;
    case "facebook": return <Facebook className={`${size} ${colour}`} />;
    default: return <Megaphone className={`${size} ${colour}`} />;
  }
};

const postTypeConfig: Record<string, { icon: React.ReactNode; colour: string; label: string }> = {
  post:     { icon: <Newspaper className="h-3.5 w-3.5" />,   colour: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", label: "Post" },
  reel:     { icon: <Film className="h-3.5 w-3.5" />,       colour: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", label: "Reel" },
  carousel: { icon: <LayoutGrid className="h-3.5 w-3.5" />, colour: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", label: "Carousel" },
  story:    { icon: <BookImage className="h-3.5 w-3.5" />,  colour: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300", label: "Story" },
};

const INSPIRATION_POSTS = [
  { type: "reel", platform: "instagram", caption: "🚀 Behind-the-scenes: How we make logistics seamless for our clients. Drop a 🔥 if you relate!", likes: 1842, comments: 94, shares: 203, reach: "14.2k" },
  { type: "carousel", platform: "linkedin", caption: "5 ways RAC reduces your delivery costs by 30% 👇 [Swipe through for details]", likes: 523, comments: 61, shares: 88, reach: "8.7k" },
  { type: "story", platform: "instagram", caption: "🎉 We just hit 500 successful deliveries this quarter! Tap to see our team celebrate.", likes: 342, comments: 19, shares: 0, reach: "5.1k" },
  { type: "post", platform: "linkedin", caption: "We believe that operational excellence is not a cost — it's an investment. Here's how we prove it daily.", likes: 287, comments: 43, shares: 52, reach: "6.3k" },
  { type: "reel", platform: "instagram", caption: "Waybill processed in under 60 seconds ⏱️ Our team shows you how. Save this for later!", likes: 2341, comments: 127, shares: 415, reach: "22.8k" },
  { type: "carousel", platform: "instagram", caption: "Client success story: How we helped a client scale from 20 → 200 daily orders. Swipe ➡️", likes: 891, comments: 73, shares: 134, reach: "11.4k" },
  { type: "post", platform: "twitter", caption: "Efficiency is the new currency. At RAC, we don't just move packages — we move businesses forward. 📦", likes: 412, comments: 38, shares: 97, reach: "9.1k" },
  { type: "story", platform: "facebook", caption: "📢 New service launch THIS WEEK! Stay tuned — our followers get early access. Share to spread the word.", likes: 178, comments: 23, shares: 41, reach: "3.8k" },
];


const SocialMediaHub = () => {
  const { profile, canEdit } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newPost, setNewPost] = useState({ 
    platform: "linkedin", 
    content: "", 
    status: "draft", 
    scheduled_date: new Date().toISOString().slice(0, 16),
    post_type: "post",
    image_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [inspirationType, setInspirationTypeFilter] = useState("all");

  const platformLimits: Record<string, number> = {
    linkedin: 3000,
    twitter: 280,
    instagram: 2200,
    facebook: 63206
  };
  const currentLimit = platformLimits[newPost.platform] || 2000;

  const queryClient = useQueryClient();

  // Fetch Posts
  const { data: posts, isLoading } = useQuery({
    queryKey: ['social_posts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('social_posts').select('*').order('scheduled_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Mutations
  const addPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const { error } = await (supabase as any).from('social_posts').insert([postData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_posts'] });
      setIsDialogOpen(false);
      setNewPost({ platform: "linkedin", content: "", status: "draft", scheduled_date: new Date().toISOString().slice(0, 16), post_type: "post", image_url: "" });
      setImageFile(null);
      setImagePreview(null);
      toast.success(`Post saved, ${profile?.full_name?.split(" ")[0]}! 📝`);
    },
    onError: (error) => toast.error("Failed to save post: " + error.message)
  });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImageAndSubmit = async () => {
    if (!newPost.content) return toast.error("Post content is required");
    let image_url = newPost.image_url;
    if (imageFile) {
      setUploadingImage(true);
      const ext = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await (supabase as any).storage.from('post-images').upload(fileName, imageFile);
      if (uploadError) {
        setUploadingImage(false);
        toast.error('Image upload failed: ' + uploadError.message);
        return;
      }
      const { data: urlData } = (supabase as any).storage.from('post-images').getPublicUrl(fileName);
      image_url = urlData.publicUrl;
      setUploadingImage(false);
    }
    addPostMutation.mutate({
      ...newPost,
      image_url: image_url || null,
      scheduled_date: new Date(newPost.scheduled_date).toISOString(),
      created_by: profile?.full_name || 'Unknown',
    });
  };

  const batchAddPostsMutation = useMutation({
    mutationFn: async (postsArray: any[]) => {
      const { error } = await (supabase as any).from('social_posts').insert(postsArray);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_posts'] });
      toast.success("Content calendar imported successfully");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (error) => toast.error("Import failed: " + error.message)
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('social_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_posts'] });
      toast.success("Post deleted");
    }
  });

  const updatePostStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await (supabase as any).from('social_posts').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['social_posts'] });
      toast.success(`Post marked as ${variables.status}`);
    },
    onError: (error) => toast.error("Failed to update status: " + error.message)
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    uploadImageAndSubmit();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast.error("Please upload a valid CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== "string") return;

      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          toast.error("Empty CSV file");
          return;
        }

        // Validate headers roughly
        const validPosts = parsed.filter(p => p.content && p.platform).map(p => ({
          platform: p.platform.toLowerCase(),
          content: p.content,
          status: p.status ? p.status.toLowerCase() : "draft",
          scheduled_date: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
          created_by: profile?.full_name || "CSV Import",
          likes: 0, comments: 0, shares: 0
        }));

        if (validPosts.length === 0) {
          toast.error("CSV must contain 'platform' and 'content' columns");
          return;
        }

        batchAddPostsMutation.mutate(validPosts);
      } catch (err) {
        toast.error("Error parsing CSV. Please check formatting.");
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    if (!posts || posts.length === 0) {
      toast.error("No posts to export");
      return;
    }
    
    // Create template with headers if no data, or export existing data
    const headers = ["Platform", "Content", "Date", "Status"];
    const csvContent = [
      headers.join(","),
      ...posts.map(p => [
        p.platform,
        `"${p.content.replace(/"/g, '""')}"`, // escape quotes in content
        format(parseISO(p.scheduled_date || p.created_at), 'yyyy-MM-dd HH:mm'),
        p.status
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-use;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `REDtech_Content_Calendar_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Calendar exported, ${profile?.full_name?.split(" ")[0]}! Check your downloads 📥`);
  };

  const downloadTemplate = () => {
    const headers = ["Platform", "Content", "Date", "Status"];
    const sampleBody = ["linkedin", "\"Excited to announce our new V2 platform! #Tech #Africa\"", "2026-03-10 10:00", "scheduled"];
    const csvContent = [headers.join(","), sampleBody.join(",")].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-use;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "REDtech_Content_Calendar_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPosts = posts?.filter(post => 
    activeTab === "all" ? true : post.status.toLowerCase() === activeTab
  ) || [];

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#bc7e57' }}>Social Media Hub</h1>
          <p className="text-muted-foreground mt-2">Content calendar, bulk scheduling, and brand presence analytics</p>
        </div>
        
        {canEdit && (
          <div className="flex items-center gap-3">
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="border-[#bc7e57]/50 hover:bg-[#bc7e57]/10 disabled:opacity-50" disabled={batchAddPostsMutation.isPending}>
              <Upload className="h-4 w-4 mr-2" /> 
              {batchAddPostsMutation.isPending ? "Importing..." : "Import CSV"}
            </Button>
            
            <Button variant="outline" onClick={handleExportCSV} className="border-[#bc7e57]/50 hover:bg-[#bc7e57]/10">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1f2937] hover:bg-[#1f2937]/90 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200">
                  <Plus className="h-4 w-4 mr-2" /> Create Post
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Post</DialogTitle>
                  <DialogDescription>Draft or schedule a social media post across platforms.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Platform</Label>
                      <Select value={newPost.platform} onValueChange={(v) => setNewPost({...newPost, platform: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="twitter">Twitter / X</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={newPost.status} onValueChange={(v) => setNewPost({...newPost, status: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending">Pending Approval</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between items-center">
                      <span>Content</span>
                      <span className={`text-xs ${newPost.content.length > currentLimit ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                        {newPost.content.length} / {currentLimit} characters
                      </span>
                    </Label>
                    <Textarea 
                      required 
                      value={newPost.content} 
                      onChange={e => setNewPost({...newPost, content: e.target.value})} 
                      placeholder="What do you want to share?"
                      className={`min-h-[120px] resize-none ${newPost.content.length > currentLimit ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    {newPost.content.length > currentLimit && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <Megaphone className="h-3 w-3" /> Exceeds {newPost.platform} character limit.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Post Type</Label>
                    <Select value={newPost.post_type} onValueChange={(v) => setNewPost({...newPost, post_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="post">📄 Post</SelectItem>
                        <SelectItem value="reel">🎬 Reel</SelectItem>
                        <SelectItem value="carousel">🖼️ Carousel</SelectItem>
                        <SelectItem value="story">📖 Story</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Attach Image (optional)</Label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#bc7e57]/40 rounded-lg p-4 cursor-pointer hover:bg-[#bc7e57]/5 transition-colors">
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="max-h-36 rounded-md object-cover" />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">Click to attach an image</p>
                          <p className="text-xs opacity-60">JPG, PNG, GIF, WebP</p>
                        </div>
                      )}
                    </label>
                    {imagePreview && (
                      <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setImageFile(null); setImagePreview(null); }}>✕ Remove image</button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Date & Time</Label>
                    <Input 
                      type="datetime-local" 
                      required 
                      value={newPost.scheduled_date} 
                      onChange={e => setNewPost({...newPost, scheduled_date: e.target.value})} 
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full bg-[#bc7e57] hover:bg-[#bc7e57]/90 mt-4" disabled={addPostMutation.isPending}>
                      {addPostMutation.isPending ? "Saving..." : "Save Post"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-md transition-all border-[#bc7e57]/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <Linkedin className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">12.4k</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-all border-[#bc7e57]/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-pink-100 text-pink-600 rounded-full">
              <Instagram className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">8.2k</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-[#bc7e57]/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-full">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">45.2%</p>
              <p className="text-sm text-muted-foreground">Engagement Rate</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-[#bc7e57]/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">+1,204</p>
              <p className="text-sm text-muted-foreground">Reach (7 days)</p>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Inspiration Gallery */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Zap className="h-5 w-5" style={{ color: '#bc7e57' }} /> Inspiration Gallery</h2>
            <p className="text-sm text-muted-foreground">High-performing post templates — click to use as a starting point</p>
          </div>
          <div className="flex gap-1">
            {["all", "reel", "carousel", "story", "post"].map(t => (
              <Button key={t} size="sm" variant={inspirationType === t ? "default" : "outline"}
                style={inspirationType === t ? { backgroundColor: '#bc7e57', color: 'white' } : {}}
                className="capitalize text-xs h-7" onClick={() => setInspirationTypeFilter(t)}>{t}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INSPIRATION_POSTS.filter(p => inspirationType === 'all' || p.type === inspirationType).map((p, i) => {
            const tc = postTypeConfig[p.type];
            return (
              <Card key={i} className="group hover:shadow-lg transition-all duration-200 border-border/50 cursor-pointer"
                onClick={() => setNewPost({...newPost, platform: p.platform, content: p.caption, post_type: p.type})}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-muted">
                        <PlatformIcon platform={p.platform} size="h-4 w-4" />
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">{p.platform}</span>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${tc.colour}`}>
                      {tc.icon} {tc.label}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 line-clamp-3 leading-relaxed mb-3">{p.caption}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground border-t pt-2">
                    <span className="flex items-center gap-0.5"><Heart className="h-3 w-3 text-pink-400" /> {p.likes.toLocaleString()}</span>
                    <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3 text-blue-400" /> {p.comments}</span>
                    <span className="flex items-center gap-0.5"><Share2 className="h-3 w-3 text-green-400" /> {p.shares}</span>
                    <span className="ml-auto font-medium" style={{ color: '#bc7e57' }}>{p.reach} reach</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to use this template ↗</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
        Need to bulk import? <Button variant="link" className="p-0 h-auto" style={{ color: '#bc7e57' }} onClick={downloadTemplate}>Download Calendar Template CSV</Button>
      </div>

      <Card className="shadow-sm border-[#bc7e57]/20 flex-1">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Content Pipeline</CardTitle>
              <CardDescription>Manage your scheduled and published posts</CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-[400px]">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="published">Published</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="draft">Drafts</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground">Loading posts...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
               No posts found in this category.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredPosts.map((post) => (
                <div key={post.id} className="p-6 hover:bg-muted/30 transition-colors flex flex-col md:flex-row gap-6 group">
                <div className="flex-shrink-0 flex items-start justify-center pt-1 md:pt-0">
                    <div className="p-3 bg-muted rounded-full border border-border">
                      <PlatformIcon platform={post.platform} />
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                       <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold capitalize">{post.platform}</span>
                          <span className="text-muted-foreground text-sm flex items-center">
                            <Calendar className="h-4 w-4 mr-1.5" />
                            {format(parseISO(post.scheduled_date || post.created_at), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`
                            ${post.status.toLowerCase() === 'published' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                            ${post.status.toLowerCase() === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                            ${post.status.toLowerCase() === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                            ${post.status.toLowerCase() === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                            ${post.status.toLowerCase() === 'draft' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
                          `}
                        >
                          {(post.status.toLowerCase() === 'published' || post.status.toLowerCase() === 'approved') && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {(post.status.toLowerCase() === 'scheduled' || post.status.toLowerCase() === 'pending') && <Clock className="h-3 w-3 mr-1" />}
                          {post.status.toLowerCase() === 'draft' && <Megaphone className="h-3 w-3 mr-1" />}
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">By {post.created_by}</span>
                        {post.post_type && postTypeConfig[post.post_type] && (
                          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${postTypeConfig[post.post_type].colour}`}>
                            {postTypeConfig[post.post_type].icon} {postTypeConfig[post.post_type].label}
                          </span>
                        )}
                       </div>
                       
                       {canEdit && (
                        <div className="flex items-center gap-2 mt-2 md:mt-0 md:ml-auto">
                          {post.status.toLowerCase() === 'pending' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8"
                                onClick={() => updatePostStatusMutation.mutate({ id: post.id, status: 'approved' })}
                                disabled={updatePostStatusMutation.isPending}
                              >
                                Approve
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                onClick={() => updatePostStatusMutation.mutate({ id: post.id, status: 'draft' })}
                                disabled={updatePostStatusMutation.isPending}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all h-8 w-8 ml-auto"
                                title="Delete Post"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this social media post.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deletePostMutation.mutate(post.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                       )}
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded-lg border border-border/50 text-sm flex items-start gap-4 shadow-sm">
                      <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    </div>

                    {post.status.toLowerCase() === 'published' && (
                      <div className="flex items-center gap-6 mt-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Heart className="h-4 w-4 mr-1.5 text-pink-500" />
                          <span className="font-medium text-foreground">{post.likes || 0}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MessageSquare className="h-4 w-4 mr-1.5 text-blue-500" />
                          <span className="font-medium text-foreground">{post.comments || 0}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Share2 className="h-4 w-4 mr-1.5 text-green-500" />
                          <span className="font-medium text-foreground">{post.shares || 0}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics & API Insights — Phase 8 Free API Research */}
      <Card className="border-[#bc7e57]/20 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-[#bc7e57]" /> Analytics & API Insights
          </CardTitle>
          <CardDescription>Free social media read APIs researched for basic analytics integration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <Twitter className="h-5 w-5 text-sky-500" />
                <span className="font-semibold text-sm">X (Twitter)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Free Tier:</strong> API v2 Basic access provides <strong>read-only</strong> tweet lookup, user profiles, and recent search (up to 10k tweets/month). 
                Requires a developer account at developer.twitter.com. Sufficient for tracking REDtech's post engagement.
              </p>
              <Badge variant="secondary" className="text-xs">10k tweets/mo free</Badge>
            </div>
            <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <Linkedin className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-sm">LinkedIn</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Community Management API:</strong> Free read access to organisation posts, comments, and reactions. 
                Requires LinkedIn Developer App + Company Page admin approval. Ideal for tracking REDtech's company page analytics.
              </p>
              <Badge variant="secondary" className="text-xs">Free with approval</Badge>
            </div>
            <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-600" />
                <span className="font-semibold text-sm">Instagram</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Instagram Graph API:</strong> Free for business/creator accounts. Provides media insights (likes, comments, reach, impressions). 
                Requires a Facebook App and Instagram Business account connection.
              </p>
              <Badge variant="secondary" className="text-xs">Free for business</Badge>
            </div>
            <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <Facebook className="h-5 w-5 text-blue-800" />
                <span className="font-semibold text-sm">Facebook</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Graph API v18+:</strong> Free page insights (reach, engagement, post analytics). 
                Requires Facebook App with page_read_engagement permission. Rate-limited to 200 calls/user/hour.
              </p>
              <Badge variant="secondary" className="text-xs">200 calls/hr free</Badge>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-[#bc7e57]/5 border border-[#bc7e57]/20">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Recommendation:</strong> Start with LinkedIn Community Management API and X (Twitter) Basic access — both are free 
              and cover REDtech's primary platforms. Instagram and Facebook APIs require Meta Business Suite but are also free for business accounts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Simple Lucide icons missing from imports
const Target = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const TrendingUp = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;

export default SocialMediaHub;
