import { ViewerBanner } from "@/components/ViewerBanner";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Linkedin, Twitter, Instagram, Facebook, Youtube,
  Plus, Clock, CheckCircle2, Trash2, Upload, Calendar,
  Film, LayoutGrid, BookImage, Newspaper, ImageIcon, Video,
  ChevronLeft, ChevronRight, Eye, Edit3, Tag, Users, Activity,
  Layers, SmartphoneIcon, Monitor, Megaphone, User, AlignLeft,
  X, Check, AlertCircle, RefreshCw, Filter, Search, Download
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { PostPreview } from "@/components/shared/PostPreview";

// ─── Types ────────────────────────────────────────────────────────
interface SocialPost {
  id: string;
  platform: string;
  content: string;
  status: string;
  scheduled_date: string;
  post_type: string;
  image_url?: string;
  created_by?: string;
  created_by_user_id?: string;
  tagged_users?: string[];
  created_at: string;
  updated_at?: string;
}

// ─── Constants ────────────────────────────────────────────────────
const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: Instagram, color: "#E1306C", bg: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" },
  { value: "linkedin",  label: "LinkedIn",  icon: Linkedin,  color: "#0077B5", bg: "bg-[#0077B5]" },
  { value: "twitter",   label: "Twitter / X", icon: Twitter, color: "#1DA1F2", bg: "bg-black" },
  { value: "facebook",  label: "Facebook",  icon: Facebook,  color: "#1877F2", bg: "bg-[#1877F2]" },
  { value: "youtube",   label: "YouTube",   icon: Youtube,   color: "#FF0000", bg: "bg-[#FF0000]" },
];

const POST_TYPES: Record<string, { label: string; icon: React.ReactNode; platforms: string[]; dimensions: string; orientation: string }> = {
  post:      { label: "Post",     icon: <Newspaper className="h-3.5 w-3.5"/>, platforms: ["instagram","linkedin","facebook","twitter"], dimensions: "1:1 square", orientation: "square" },
  portrait:  { label: "Portrait", icon: <SmartphoneIcon className="h-3.5 w-3.5"/>, platforms: ["instagram","facebook"], dimensions: "4:5 portrait", orientation: "portrait" },
  landscape: { label: "Landscape",icon: <Monitor className="h-3.5 w-3.5"/>, platforms: ["twitter","facebook","linkedin"], dimensions: "16:9 landscape", orientation: "landscape" },
  reel:      { label: "Reel",     icon: <Film className="h-3.5 w-3.5"/>, platforms: ["instagram","youtube","tiktok"], dimensions: "9:16 vertical video", orientation: "story" },
  story:     { label: "Story",    icon: <BookImage className="h-3.5 w-3.5"/>, platforms: ["instagram","facebook"], dimensions: "9:16 story", orientation: "story" },
  carousel:  { label: "Carousel", icon: <LayoutGrid className="h-3.5 w-3.5"/>, platforms: ["instagram","linkedin","facebook"], dimensions: "1:1 swipeable", orientation: "square" },
  video:     { label: "Video",    icon: <Video className="h-3.5 w-3.5"/>, platforms: ["youtube","facebook","instagram","twitter"], dimensions: "16:9 video", orientation: "landscape" },
  thread:    { label: "Thread",   icon: <AlignLeft className="h-3.5 w-3.5"/>, platforms: ["twitter"], dimensions: "text only", orientation: "square" },
};

const CHAR_LIMITS: Record<string, number> = { linkedin: 3000, twitter: 280, instagram: 2200, facebook: 63206, youtube: 5000 };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: "Draft",     color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", icon: <Edit3 className="h-3 w-3"/> },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: <Clock className="h-3 w-3"/> },
  approved:  { label: "Approved",  color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", icon: <CheckCircle2 className="h-3 w-3"/> },
  published: { label: "Published", color: "bg-[#bc7e57]/10 text-[#bc7e57]", icon: <CheckCircle2 className="h-3 w-3"/> },
  rejected:  { label: "Rejected",  color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: <AlertCircle className="h-3 w-3"/> },
};

const emptyPost = { platform: "instagram", content: "", status: "draft", scheduled_date: new Date().toISOString().slice(0, 16), post_type: "post", image_url: "", tagged_users: [] as string[] };

// ─── Sub-components ───────────────────────────────────────────────

const PlatformPill = ({ platform, size = "sm" }: { platform: string; size?: "sm" | "xs" }) => {
  const p = PLATFORMS.find(x => x.value === platform);
  if (!p) return null;
  const Icon = p.icon;
  const s = size === "xs" ? "h-3 w-3" : "h-4 w-4";
  const pad = size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium text-white ${pad}`} style={{ backgroundColor: p.color }}>
      <Icon className={s}/>{p.label}
    </span>
  );
};

const PostTypeBadge = ({ type }: { type: string }) => {
  const t = POST_TYPES[type];
  if (!t) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-muted text-muted-foreground border border-border/50">
      {t.icon}{t.label}
    </span>
  );
};

// ─── Platform character limit bar ────────────────────────────────
const CharLimitBar = ({ platform, value }: { platform: string; value: string }) => {
  const limit = CHAR_LIMITS[platform] || 2200;
  const count = value.length;
  const pct = Math.min(100, (count / limit) * 100);
  const col = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${col}`} style={{ width: `${pct}%` }}/>
      </div>
      <span className={pct > 90 ? "text-red-500 font-medium" : ""}>{count}/{limit}</span>
    </div>
  );
};

// ─── Drag-and-drop upload zone ────────────────────────────────────
const UploadZone = ({ onFile, preview, onClear }: { onFile: (f: File) => void; preview: string | null; onClear: () => void }) => {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) onFile(file);
    else toast.error("Please drop an image or video file.");
  }, [onFile]);

  if (preview) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-border" style={{ aspectRatio: "16/9", maxHeight: 200 }}>
        <img src={preview} alt="" className="w-full h-full object-cover"/>
        <button onClick={onClear} className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
          <X className="h-3.5 w-3.5 text-white"/>
        </button>
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] px-2 py-1 rounded">Media attached ✓</div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all p-6 ${dragging ? "border-[#bc7e57] bg-[#bc7e57]/5" : "border-border hover:border-[#bc7e57]/50 hover:bg-muted/30"}`}
      style={{ minHeight: 120 }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}/>
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${dragging ? "bg-[#bc7e57]/20" : "bg-muted"}`}>
        <Upload className={`h-5 w-5 ${dragging ? "text-[#bc7e57]" : "text-muted-foreground"}`}/>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{dragging ? "Drop it!" : "Drag & drop or click to upload"}</p>
        <p className="text-xs text-muted-foreground">JPG, PNG, MP4, MOV (max 50MB)</p>
      </div>
    </div>
  );
};

// ─── Content Calendar ─────────────────────────────────────────────
const ContentCalendar = ({ posts }: { posts: SocialPost[] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startOffset = startOfMonth(currentMonth).getDay();

  const getPostsForDay = (day: Date) =>
    posts.filter(p => p.scheduled_date && isSameDay(parseISO(p.scheduled_date), day));

  return (
    <Card className="border-[#bc7e57]/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" style={{ color: "#bc7e57" }}/> Content Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronLeft className="h-4 w-4"/></Button>
            <span className="text-sm font-semibold w-28 text-center">{format(currentMonth, "MMMM yyyy")}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><ChevronRight className="h-4 w-4"/></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        <div className="grid grid-cols-7 text-center px-4">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-[10px] font-semibold text-muted-foreground py-2">{d}</div>
          ))}
          {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`}/>)}
          {days.map(day => {
            const dayPosts = getPostsForDay(day);
            const today = isToday(day);
            return (
              <div key={day.toISOString()} className={`min-h-[68px] border border-border/20 p-1 transition-colors hover:bg-muted/30 ${!isSameMonth(day, currentMonth) ? "opacity-30" : ""}`}>
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium mb-1 ${today ? "bg-[#bc7e57] text-white" : "text-foreground"}`}>
                  {format(day, "d")}
                </span>
                <div className="space-y-0.5">
                  {dayPosts.slice(0, 3).map(p => {
                    const plt = PLATFORMS.find(x => x.value === p.platform);
                    return (
                      <div key={p.id} className="flex items-center gap-0.5 rounded px-1 py-0.5 text-white text-[8px] truncate" style={{ backgroundColor: plt?.color || "#bc7e57" }}>
                        {plt && <plt.icon className="h-2 w-2 flex-shrink-0"/>}
                        <span className="truncate">{p.content?.slice(0, 15) || "(No caption)"}</span>
                      </div>
                    );
                  })}
                  {dayPosts.length > 3 && <div className="text-[8px] text-muted-foreground pl-1">+{dayPosts.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Post Card ───────────────────────────────────────────────────
const PostCard = ({ post, onPreview, onEdit, onDelete, onStatusChange, isAdmin }: {
  post: SocialPost; onPreview: () => void; onEdit: () => void; onDelete: () => void;
  onStatusChange: (id: string, status: string) => void; isAdmin: boolean;
}) => {
  const plt = PLATFORMS.find(p => p.value === post.platform);
  const status = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
  const postType = POST_TYPES[post.post_type];
  const Icon = plt?.icon || Megaphone;

  return (
    <Card className="hover:shadow-md transition-all border-border/50 hover:border-[#bc7e57]/30 group overflow-hidden">
      {/* Platform colour strip */}
      <div className="h-1 w-full" style={{ backgroundColor: plt?.color || "#bc7e57" }}/>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Platform icon */}
          <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (plt?.color || "#bc7e57") + "22" }}>
            <Icon className="h-5 w-5" style={{ color: plt?.color || "#bc7e57" }}/>
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <PlatformPill platform={post.platform} size="xs"/>
              {postType && <PostTypeBadge type={post.post_type}/>}
              <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${status.color}`}>
                {status.icon}{status.label}
              </span>
            </div>

            {/* Caption preview */}
            <p className="text-sm text-foreground line-clamp-2 leading-relaxed mb-2">
              {post.content || <span className="text-muted-foreground italic">No caption</span>}
            </p>

            {/* Thumbnail if image */}
            {post.image_url && (
              <div className="rounded-lg overflow-hidden mb-2 border border-border/30" style={{ height: 80, width: "100%" }}>
                <img src={post.image_url} alt="" className="w-full h-full object-cover"/>
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {post.scheduled_date && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3"/>
                  {format(parseISO(post.scheduled_date), "d MMM, HH:mm")}
                </span>
              )}
              {post.created_by && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3"/>{post.created_by.split(" ")[0]}
                </span>
              )}
              {(post.tagged_users || []).length > 0 && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3"/>{(post.tagged_users || []).length} tagged
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs hover:text-[#bc7e57]" onClick={onPreview}>
            <Eye className="h-3.5 w-3.5"/> Preview
          </Button>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs hover:text-[#bc7e57]" onClick={onEdit}>
            <Edit3 className="h-3.5 w-3.5"/> Edit
          </Button>
          {isAdmin && post.status === "draft" && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-green-600 hover:text-green-700" onClick={() => onStatusChange(post.id, "approved")}>
              <Check className="h-3.5 w-3.5"/> Approve
            </Button>
          )}
          {isAdmin && post.status === "approved" && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-blue-600 hover:text-blue-700" onClick={() => onStatusChange(post.id, "published")}>
              <CheckCircle2 className="h-3.5 w-3.5"/> Publish
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-red-500" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5"/>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────
const SocialMediaHub = () => {
  const { profile, canEdit, isAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState("posts");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<SocialPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SocialPost | null>(null);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  // Form
  const [form, setForm] = useState({ ...emptyPost });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showPreviewPanel, setShowPreviewPanel] = useState(true);

  // Load editing post into form
  useEffect(() => {
    if (editingPost) {
      setForm({
        platform: editingPost.platform,
        content: editingPost.content,
        status: editingPost.status,
        scheduled_date: editingPost.scheduled_date?.slice(0, 16) || new Date().toISOString().slice(0, 16),
        post_type: editingPost.post_type,
        image_url: editingPost.image_url || "",
        tagged_users: editingPost.tagged_users || [],
      });
      if (editingPost.image_url) setImagePreview(editingPost.image_url);
      setIsStudioOpen(true);
    }
  }, [editingPost]);

  // Fetch posts
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["social_posts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("social_posts").select("*").order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all profiles for tagging
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_for_tag"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("profiles").select("id, full_name").eq("is_active", true);
      return data || [];
    },
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingPost) {
        const { error } = await (supabase as any).from("social_posts").update(payload).eq("id", editingPost.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("social_posts").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_posts"] });
      setIsStudioOpen(false);
      setEditingPost(null);
      setForm({ ...emptyPost });
      setImageFile(null);
      setImagePreview(null);
      toast.success(editingPost ? "Post updated!" : `Post saved, ${profile?.full_name?.split(" ")[0]}! 📝`);
    },
    onError: (e: any) => toast.error("Failed to save: " + e.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("social_posts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social_posts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("social_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_posts"] });
      setDeleteTarget(null);
      toast.success("Post deleted.");
    },
  });

  const handleSave = async () => {
    if (!form.content.trim()) return toast.error("Caption / content is required.");
    let image_url = form.image_url;
    if (imageFile) {
      setUploading(true);
      const ext = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: upErr } = await (supabase as any).storage.from("post-images").upload(fileName, imageFile);
      setUploading(false);
      if (upErr) { toast.error("Upload failed: " + upErr.message); return; }
      const { data: urlData } = (supabase as any).storage.from("post-images").getPublicUrl(fileName);
      image_url = urlData?.publicUrl || "";
    }
    saveMutation.mutate({
      platform:      form.platform,
      content:       form.content,
      status:        form.status,
      scheduled_date: form.scheduled_date,
      post_type:     form.post_type,
      image_url,
      created_by:    profile?.full_name || "Unknown",
      created_by_user_id: profile?.id,
      tagged_users:  form.tagged_users,
      updated_at:    new Date().toISOString(),
    });
  };

  // Filtered posts
  const filtered = posts.filter((p: SocialPost) => {
    if (filterPlatform !== "all" && p.platform !== filterPlatform) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterType !== "all" && p.post_type !== filterType) return false;
    if (searchQuery && !p.content?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Stats
  const total = posts.length;
  const scheduled = posts.filter((p: SocialPost) => p.status === "scheduled").length;
  const approved = posts.filter((p: SocialPost) => p.status === "approved").length;
  const published = posts.filter((p: SocialPost) => p.status === "published").length;
  const drafts    = posts.filter((p: SocialPost) => p.status === "draft").length;

  const openStudio = (post?: SocialPost) => {
    setEditingPost(post || null);
    if (!post) {
      setForm({ ...emptyPost });
      setImageFile(null);
      setImagePreview(null);
    }
    setIsStudioOpen(true);
  };

  const allowedTypes = Object.entries(POST_TYPES)
    .filter(([, v]) => v.platforms.includes(form.platform))
    .map(([k]) => k);

  // Team activity (recent 10 unique creators)
  const activityFeed = [...posts]
    .sort((a: SocialPost, b: SocialPost) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 15);

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background overflow-y-auto">
      <ViewerBanner/>

      {/* ── Header ── */}
      <div className="border-b border-border/40 bg-background/95 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#bc7e57" }}>Social Media Hub</h1>
            <p className="text-sm text-muted-foreground">Plan · Create · Schedule · Collaborate</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Platform filter chips */}
            {PLATFORMS.map(p => (
              <button
                key={p.value}
                onClick={() => setFilterPlatform(curr => curr === p.value ? "all" : p.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterPlatform === p.value ? "text-white border-transparent" : "border-border text-muted-foreground hover:border-[#bc7e57]/50"}`}
                style={filterPlatform === p.value ? { backgroundColor: p.color, borderColor: p.color } : {}}
              >
                <p.icon className="h-3.5 w-3.5"/>{p.label}
              </button>
            ))}
            {canEdit && (
              <Button onClick={() => openStudio()} className="gap-2 ml-2 text-white" style={{ backgroundColor: "#bc7e57" }}>
                <Plus className="h-4 w-4"/> Create Post
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 w-full space-y-6">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Posts", value: total, icon: Layers, color: "#bc7e57" },
            { label: "Drafts", value: drafts, icon: Edit3, color: "#8b5cf6" },
            { label: "Scheduled", value: scheduled, icon: Clock, color: "#3b82f6" },
            { label: "Approved", value: approved, icon: CheckCircle2, color: "#10b981" },
            { label: "Published", value: published, icon: Activity, color: "#bc7e57" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border/50 hover:shadow-sm transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + "22" }}>
                  <Icon className="h-4 w-4" style={{ color }}/>
                </div>
                <div>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Main Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="posts" className="gap-2"><Layers className="h-4 w-4"/> All Posts</TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2"><Calendar className="h-4 w-4"/> Calendar</TabsTrigger>
            <TabsTrigger value="activity" className="gap-2"><Activity className="h-4 w-4"/> Team Activity</TabsTrigger>
          </TabsList>

          {/* ── POSTS TAB ── */}
          <TabsContent value="posts" className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
                <Input className="pl-8 h-8 text-xs" placeholder="Search captions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Status"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Post type"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(POST_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {(filterPlatform !== "all" || filterStatus !== "all" || filterType !== "all" || searchQuery) && (
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => { setFilterPlatform("all"); setFilterStatus("all"); setFilterType("all"); setSearchQuery(""); }}>
                  <X className="h-3.5 w-3.5"/> Clear
                </Button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{filtered.length} post{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 rounded-xl bg-muted/50 animate-pulse"/>)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                illustration="social"
                heading="No posts yet"
                subtext="Start creating content for your social channels. Click 'Create Post' to open the Content Studio."
                ctaText="Open Content Studio"
                onCta={() => openStudio()}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((post: SocialPost) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    isAdmin={isAdmin || isSuperAdmin}
                    onPreview={() => setPreviewPost(post)}
                    onEdit={() => openStudio(post)}
                    onDelete={() => setDeleteTarget(post)}
                    onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── CALENDAR TAB ── */}
          <TabsContent value="calendar">
            <ContentCalendar posts={posts}/>
          </TabsContent>

          {/* ── TEAM ACTIVITY TAB ── */}
          <TabsContent value="activity" className="space-y-4">
            <Card className="border-[#bc7e57]/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" style={{ color: "#bc7e57" }}/> Team Activity Feed
                </CardTitle>
                <CardDescription>Track who created, updated, or tagged what — in real time.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {activityFeed.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">No activity yet. Start creating posts!</div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {activityFeed.map((post: SocialPost) => {
                      const plt = PLATFORMS.find(p => p.value === post.platform);
                      const PIcon = plt?.icon || Megaphone;
                      const initials = (post.created_by || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <div key={post.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-[#bc7e57]/15 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ color: "#bc7e57" }}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-semibold">{post.created_by || "Team member"}</span>
                              <span className="text-muted-foreground"> created a </span>
                              <span className="font-medium">{POST_TYPES[post.post_type]?.label || post.post_type}</span>
                              <span className="text-muted-foreground"> for </span>
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <PlatformPill platform={post.platform} size="xs"/>
                              <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${(STATUS_CONFIG[post.status] || STATUS_CONFIG.draft).color}`}>
                                {(STATUS_CONFIG[post.status] || STATUS_CONFIG.draft).label}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{post.content?.slice(0, 80) || "(No caption)"}</p>
                            {(post.tagged_users || []).length > 0 && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Tag className="h-3 w-3"/> Tagged: {(post.tagged_users || []).join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex-shrink-0">
                            {post.created_at ? format(parseISO(post.created_at), "d MMM, HH:mm") : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══════════════════════════════════════════════════════════
           CONTENT STUDIO DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={isStudioOpen} onOpenChange={open => { if (!open) { setIsStudioOpen(false); setEditingPost(null); } }}>
        <DialogContent className="max-w-5xl w-full h-[92vh] p-0 overflow-hidden" style={{ maxHeight: "92vh" }}>
          <div className="flex h-full">

            {/* ── Left panel: form ── */}
            <div className="flex-1 flex flex-col overflow-y-auto border-r border-border/40" style={{ minWidth: 0 }}>
              {/* Studio header */}
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between bg-muted/20">
                <div>
                  <h2 className="font-semibold text-base">{editingPost ? "Edit Post" : "✨ Content Studio"}</h2>
                  <p className="text-xs text-muted-foreground">Create, preview, and schedule your content</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPreviewPanel(v => !v)}>
                  <Eye className="h-4 w-4"/>
                </Button>
              </div>

              <div className="p-5 space-y-5 flex-1">
                {/* Platform + Post Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Platform *</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {PLATFORMS.map(p => {
                        const Icon = p.icon;
                        const active = form.platform === p.value;
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, platform: p.value, post_type: Object.entries(POST_TYPES).find(([, v]) => v.platforms.includes(p.value))?.[0] || "post" }))}
                            className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all text-[10px] font-medium ${active ? "text-white border-transparent" : "border-border hover:border-[#bc7e57]/40 text-muted-foreground bg-background"}`}
                            style={active ? { backgroundColor: p.color, borderColor: p.color } : {}}
                          >
                            <Icon className="h-4 w-4"/>
                            <span>{p.label.split("/")[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Post Format *</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {allowedTypes.map(k => {
                        const t = POST_TYPES[k];
                        const active = form.post_type === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, post_type: k }))}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${active ? "border-[#bc7e57] bg-[#bc7e57]/10 text-[#bc7e57]" : "border-border hover:border-[#bc7e57]/40 text-muted-foreground"}`}
                          >
                            {t.icon}{t.label}
                          </button>
                        );
                      })}
                    </div>
                    {allowedTypes.includes(form.post_type) && (
                      <p className="text-[9px] text-muted-foreground mt-1">
                        Optimal: <strong>{POST_TYPES[form.post_type]?.dimensions}</strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Caption */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Caption / Content *</Label>
                  <Textarea
                    rows={5}
                    placeholder={`Write your ${form.platform} ${POST_TYPES[form.post_type]?.label.toLowerCase()} caption here...\n\nTip: Use emojis, hashtags, and a clear CTA for best engagement 🚀`}
                    value={form.content}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    className="resize-none text-sm"
                  />
                  <CharLimitBar platform={form.platform} value={form.content}/>
                </div>

                {/* Media */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Media (Image / Video)</Label>
                  <UploadZone
                    onFile={f => { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }}
                    preview={imagePreview}
                    onClear={() => { setImageFile(null); setImagePreview(null); setForm(f => ({ ...f, image_url: "" })); }}
                  />
                </div>

                {/* Scheduling */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Schedule Date & Time</Label>
                    <Input
                      type="datetime-local"
                      className="h-9 text-xs"
                      value={form.scheduled_date}
                      onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Tag teammates */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Tag className="h-3 w-3"/> Tag Teammates</Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(form.tagged_users || []).map(name => (
                      <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#bc7e57]/15 text-[#bc7e57] text-xs font-medium">
                        {name}
                        <button onClick={() => setForm(f => ({ ...f, tagged_users: (f.tagged_users || []).filter(n => n !== name) }))} className="ml-0.5 hover:text-red-500 transition-colors">
                          <X className="h-2.5 w-2.5"/>
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Select value="" onValueChange={name => { if (name && !(form.tagged_users || []).includes(name)) setForm(f => ({ ...f, tagged_users: [...(f.tagged_users || []), name] })); }}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Add teammate..."/></SelectTrigger>
                      <SelectContent>
                        {profiles.filter((p: any) => !(form.tagged_users || []).includes(p.full_name)).map((p: any) => (
                          <SelectItem key={p.id} value={p.full_name} className="text-xs">{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Created by (read-only) */}
                {editingPost && (
                  <div className="text-[10px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                    <span className="font-medium">Last edited by:</span> {editingPost.created_by} · {editingPost.updated_at ? format(parseISO(editingPost.updated_at), "d MMM yyyy, HH:mm") : "Unknown"}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border/40 flex gap-2 bg-muted/20">
                <Button variant="outline" className="flex-1" onClick={() => { setIsStudioOpen(false); setEditingPost(null); }}>Cancel</Button>
                <Button
                  className="flex-1 gap-2 text-white"
                  style={{ backgroundColor: "#bc7e57" }}
                  onClick={handleSave}
                  disabled={saveMutation.isPending || uploading}
                >
                  {(saveMutation.isPending || uploading) ? <><RefreshCw className="h-3.5 w-3.5 animate-spin"/> Saving...</> : <><Check className="h-3.5 w-3.5"/> {editingPost ? "Update Post" : "Save to Hub"}</>}
                </Button>
              </div>
            </div>

            {/* ── Right panel: live preview ── */}
            {showPreviewPanel && (
              <div className="w-80 flex-shrink-0 flex flex-col bg-muted/20 overflow-y-auto">
                <div className="px-4 py-4 border-b border-border/40">
                  <p className="font-semibold text-sm">Live Preview</p>
                  <p className="text-[10px] text-muted-foreground">Updates as you type</p>
                </div>
                <div className="flex-1 flex items-start justify-center p-4 overflow-y-auto">
                  <div className="py-4 w-full flex justify-center">
                    <PostPreview
                      platform={form.platform}
                      postType={form.post_type}
                      caption={form.content}
                      imageUrl={imagePreview}
                      authorName={profile?.full_name || "Team Member"}
                      scheduledDate={form.scheduled_date}
                    />
                  </div>
                </div>
                {/* Format info */}
                <div className="px-4 py-3 border-t border-border/40 space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Format specs</p>
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    <p>📐 {POST_TYPES[form.post_type]?.dimensions || "Standard"}</p>
                    <p>📝 Char limit: {CHAR_LIMITS[form.platform] || 2200}</p>
                    <p>🔡 Used: {form.content.length} chars</p>
                    {form.tagged_users?.length ? <p>🏷️ Tagged: {form.tagged_users?.length} teammate(s)</p> : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Preview Modal ── */}
      {previewPost && (
        <Dialog open={!!previewPost} onOpenChange={open => !open && setPreviewPost(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4"/> Post Preview
                <PlatformPill platform={previewPost.platform} size="xs"/>
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 flex justify-center">
              <PostPreview
                platform={previewPost.platform}
                postType={previewPost.post_type}
                caption={previewPost.content}
                imageUrl={previewPost.image_url}
                authorName={previewPost.created_by || profile?.full_name || "Team Member"}
              />
            </div>
            <div className="text-xs text-muted-foreground text-center">
              Scheduled: {previewPost.scheduled_date ? format(parseISO(previewPost.scheduled_date), "EEEE d MMMM yyyy, HH:mm") : "Not scheduled"}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the post from the hub.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SocialMediaHub;
