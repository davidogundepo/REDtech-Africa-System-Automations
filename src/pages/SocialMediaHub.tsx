import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Megaphone, Calendar, CheckCircle2,
  Clock, Image as ImageIcon, MessageSquare, Heart, Share2, 
  TrendingUp, Instagram, Linkedin, Twitter, Target, Plus, Trash2 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform.toLowerCase()) {
    case "linkedin": return <Linkedin className="h-5 w-5 text-blue-600" />;
    case "instagram": return <Instagram className="h-5 w-5 text-pink-600" />;
    case "twitter": return <Twitter className="h-5 w-5 text-sky-500" />;
    default: return <Megaphone className="h-5 w-5" />;
  }
};

const SocialMediaHub = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({ 
    platform: "linkedin", 
    content: "", 
    status: "draft", 
    scheduled_for: new Date().toISOString().slice(0, 16) 
  });

  const queryClient = useQueryClient();

  // Fetch Posts
  const { data: posts, isLoading } = useQuery({
    queryKey: ['social_posts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('social_posts').select('*').order('scheduled_for', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Mutations
  const addPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const { error } = await supabase.from('social_posts').insert([postData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_posts'] });
      setIsDialogOpen(false);
      setNewPost({ platform: "linkedin", content: "", status: "draft", scheduled_for: new Date().toISOString().slice(0, 16) });
      toast.success("Post saved successfully");
    },
    onError: (error) => toast.error("Failed to save post: " + error.message)
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('social_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_posts'] });
      toast.success("Post deleted");
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.content) return toast.error("Post content is required");
    
    addPostMutation.mutate({
      ...newPost,
      scheduled_for: new Date(newPost.scheduled_for).toISOString(),
      likes: 0,
      comments: 0,
      shares: 0,
      created_by: "System Admin"
    });
  };

  const filteredPosts = posts?.filter(post => 
    activeTab === "all" ? true : post.status.toLowerCase() === activeTab
  ) || [];

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#C9A66B' }}>Social Media Hub</h1>
          <p className="text-muted-foreground mt-2">Content calendar, scheduling, and brand presence analytics</p>
        </div>
        
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
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea 
                  required 
                  value={newPost.content} 
                  onChange={e => setNewPost({...newPost, content: e.target.value})} 
                  placeholder="What do you want to share?"
                  className="min-h-[120px] resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input 
                  type="datetime-local" 
                  required 
                  value={newPost.scheduled_for} 
                  onChange={e => setNewPost({...newPost, scheduled_for: e.target.value})} 
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full bg-[#C9A66B] hover:bg-[#C9A66B]/90 mt-4" disabled={addPostMutation.isPending}>
                  {addPostMutation.isPending ? "Saving..." : "Save Post"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-md transition-all border-[#C9A66B]/20">
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
        
        <Card className="hover:shadow-md transition-all border-[#C9A66B]/20">
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

        <Card className="hover:shadow-md transition-all border-[#C9A66B]/20">
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

        <Card className="hover:shadow-md transition-all border-[#C9A66B]/20">
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

      <Card className="shadow-sm border-[#C9A66B]/20 flex-1">
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
                       <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold capitalize">{post.platform}</span>
                          <span className="text-muted-foreground text-sm flex items-center">
                            <Calendar className="h-4 w-4 mr-1.5" />
                            {format(parseISO(post.scheduled_for || post.created_at), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`
                            ${post.status.toLowerCase() === 'published' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                            ${post.status.toLowerCase() === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                            ${post.status.toLowerCase() === 'draft' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
                          `}
                        >
                          {post.status.toLowerCase() === 'published' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {post.status.toLowerCase() === 'scheduled' && <Clock className="h-3 w-3 mr-1" />}
                          {post.status.toLowerCase() === 'draft' && <Megaphone className="h-3 w-3 mr-1" />}
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </Badge>
                       </div>
                       
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all h-8 w-8 ml-auto"
                          onClick={() => deletePostMutation.mutate(post.id)}
                          title="Delete Post"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
    </div>
  );
};

export default SocialMediaHub;
