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
  Film, LayoutGrid, BookImage, Newspaper, Video,
  ChevronLeft, ChevronRight, Eye, Edit3, Tag, Users, Activity,
  Layers, SmartphoneIcon, Monitor, Megaphone, User, AlignLeft,
  X, Check, AlertCircle, RefreshCw, Search, TrendingUp, BarChart3, PieChart
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RechartsPie, Pie } from "recharts";
import { XIcon, TikTokIcon } from "@/components/shared/PlatformIcons";
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
  { value: "instagram", label: "Instagram", icon: Instagram,  color: "#E1306C", handle: "@REDtechAfrica" },
  { value: "linkedin",  label: "LinkedIn",  icon: Linkedin,   color: "#0077B5", handle: "REDtech Africa" },
  { value: "x",         label: "X",          icon: XIcon,      color: "#000000", handle: "@REDtech_Africa" },
  { value: "facebook",  label: "Facebook",  icon: Facebook,   color: "#1877F2", handle: "REDtech Africa" },
  { value: "youtube",   label: "YouTube",   icon: Youtube,    color: "#FF0000", handle: "REDtech Africa" },
  { value: "tiktok",    label: "TikTok",    icon: TikTokIcon, color: "#010101", handle: "@redtechafrica" },
];

const POST_TYPES: Record<string, { label: string; icon: React.ReactNode; platforms: string[]; dimensions: string; res: string; orientation: string }> = {
  post:      { label: "Post",     icon: <Newspaper className="h-3.5 w-3.5"/>,    platforms: ["instagram","linkedin","facebook","x"],              dimensions: "1080 × 1080", res: "1:1 Square",          orientation: "square"   },
  portrait:  { label: "Portrait", icon: <SmartphoneIcon className="h-3.5 w-3.5"/>, platforms: ["instagram","facebook"],                          dimensions: "1080 × 1350", res: "4:5 Portrait",        orientation: "portrait" },
  landscape: { label: "Landscape",icon: <Monitor className="h-3.5 w-3.5"/>,       platforms: ["x","facebook","linkedin"],                        dimensions: "1200 × 630",  res: "1.91:1 Landscape",   orientation: "landscape"},
  reel:      { label: "Reel",     icon: <Film className="h-3.5 w-3.5"/>,          platforms: ["instagram","tiktok","facebook"],                  dimensions: "1080 × 1920", res: "9:16 Vertical",      orientation: "story"    },
  short:     { label: "Short",    icon: <SmartphoneIcon className="h-3.5 w-3.5"/>, platforms: ["youtube"],                                       dimensions: "1080 × 1920", res: "9:16 Vertical",      orientation: "story"    },
  story:     { label: "Story",    icon: <BookImage className="h-3.5 w-3.5"/>,     platforms: ["instagram","facebook"],                          dimensions: "1080 × 1920", res: "9:16 Full Screen",   orientation: "story"    },
  carousel:  { label: "Carousel", icon: <LayoutGrid className="h-3.5 w-3.5"/>,   platforms: ["instagram","linkedin","facebook"],                dimensions: "1080 × 1080", res: "1:1 Swipeable",      orientation: "square"   },
  video:     { label: "Video",    icon: <Video className="h-3.5 w-3.5"/>,         platforms: ["youtube","facebook","instagram","x"],              dimensions: "1920 × 1080", res: "16:9 Widescreen",    orientation: "landscape"},
  thread:    { label: "Thread",   icon: <AlignLeft className="h-3.5 w-3.5"/>,    platforms: ["x"],                                             dimensions: "Text only",   res: "280 chars max",      orientation: "square"   },
};

const CHAR_LIMITS: Record<string, number> = { linkedin: 3000, x: 280, instagram: 2200, facebook: 63206, youtube: 5000, tiktok: 2200 };

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
const UploadZone = ({ onFiles, previews, onClear }: { onFiles: (f: File[]) => void; previews: string[]; onClear: (i?: number) => void }) => {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (files.length) onFiles(files);
    else toast.error("Please drop image or video files.");
  }, [onFiles]);

  const triggerUpload = () => ref.current?.click();

  const UploadTrigger = ({ compact = false }: { compact?: boolean }) => (
    <div
      className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${dragging ? "border-[#bc7e57] bg-[#bc7e57]/5" : "border-border hover:border-[#bc7e57]/50 hover:bg-muted/30"} ${compact ? "h-full w-full" : "p-8 min-h-[140px]"}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={triggerUpload}
    >
      <input ref={ref} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => { const f = Array.from(e.target.files||[]); if (f.length) onFiles(f); }}/>
      <div className={`${compact ? "h-7 w-7" : "h-10 w-10"} rounded-xl flex items-center justify-center transition-colors ${dragging ? "bg-[#bc7e57]/20" : "bg-muted"}`}>
        {compact ? <Plus className="h-4 w-4 text-[#bc7e57]" /> : <Upload className={`h-5 w-5 ${dragging ? "text-[#bc7e57]" : "text-muted-foreground"}`}/>}
      </div>
      {!compact && (
        <div className="text-center">
          <p className="text-sm font-medium">{dragging ? "Drop media!" : "Drag & drop or click to upload"}</p>
          <p className="text-xs text-muted-foreground mt-1">Select multiple images or 1 video</p>
        </div>
      )}
      {compact && <span className="text-[10px] font-medium text-muted-foreground">Add more</span>}
    </div>
  );

  return (
    <div className="space-y-4">
      {previews.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {previews.map((p, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden border border-border aspect-square bg-muted shadow-sm group">
              {p.match(/\.(mp4|mov|webm|ogg)$/i) || p.startsWith("data:video") ? (
                <video src={p} className="w-full h-full object-cover" autoPlay loop muted playsInline />
              ) : (
                <img src={p} alt="" className="w-full h-full object-cover"/>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs">
                <button 
                  onClick={(e) => { e.preventDefault(); onClear(i); }} 
                  className="h-8 w-8 rounded-full bg-red-500/90 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                >
                  <X className="h-4 w-4 text-white"/>
                </button>
              </div>
            </div>
          ))}
          <div className="aspect-square">
            <UploadTrigger compact />
          </div>
        </div>
      ) : (
        <UploadTrigger />
      )}
    </div>
  );
};

// ─── Media Renderer ───────────────────────────────────────────────
const MediaRenderer = ({ urlStr, className = "" }: { urlStr?: string; className?: string }) => {
  if (!urlStr) return null;
  const urls = urlStr.split(',').map(u => u.trim()).filter(Boolean);
  if (!urls.length) return null;

  const getEmbedUrl = (link: string) => {
    // YouTube
    const ytMatch = link.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}`;
    // TikTok
    const ttMatch = link.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/|embed\/v2\/|video\/)(\d+)/) || link.match(/video\/(\d+)/);
    if (ttMatch) return `https://www.tiktok.com/embed/${ttMatch[1]}`;
    if (link.includes('tiktok.com')) {
      const idMatch = link.match(/tiktok\.com\/(\d+)/);
      if (idMatch) return `https://www.tiktok.com/embed/${idMatch[1]}`;
    }
    // Vimeo
    const vmMatch = link.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}?autoplay=1&muted=1&loop=1`;
    return null;
  };

  const renderSingle = (u: string, classes: string) => {
    const embedUrl = getEmbedUrl(u);
    if (embedUrl) {
      return (
        <iframe 
          src={embedUrl}
          className={classes}
          style={{ border: 0 }}
          allow="autoplay; encrypted-media; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-popups"
          allowFullScreen
        />
      );
    }
    // Smart detection: only direct video file extensions, never URL substrings
    const isVideo = u.match(/\.(mp4|mov|webm|ogg)$/i) || u.startsWith('blob:') && u.includes('video') || u.startsWith('data:video');
    return isVideo ? (
      <video src={u} className={classes} controls autoPlay loop muted playsInline />
    ) : (
      <img src={u} alt="" className={classes} />
    );
  };

  if (urls.length === 1) {
    return renderSingle(urls[0], `${className} object-cover w-full h-full`);
  }

  return (
    <div className={`grid gap-1 ${urls.length === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"} ${className}`}>
      {urls.slice(0, 4).map((p, i) => (
        <div key={i} className={`relative block overflow-hidden ${urls.length === 3 && i === 0 ? "row-span-2 col-span-1" : ""}`}>
          {renderSingle(p, "w-full h-full object-cover absolute inset-0")}
          {i === 3 && urls.length > 4 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">
              +{urls.length - 4}
            </div>
          )}
        </div>
      ))}
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
              <div className="rounded-lg overflow-hidden mb-2 border border-border/30" style={{ height: 120, width: "100%" }}>
                <MediaRenderer urlStr={post.image_url} className="w-full h-full" />
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
              <span className="flex items-center gap-1">
                <User className="h-3 w-3"/>REDtech Africa
              </span>
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

// ─── Weekly Calendar ─────────────────────────────────────────────
const WeeklyCalendar = ({
  posts, canEdit, openStudio, setPreviewPost
}: {
  posts: SocialPost[];
  canEdit: boolean;
  openStudio: (p?: SocialPost) => void;
  setPreviewPost: (p: SocialPost | null) => void;
}) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const postsForDay = (day: Date) =>
    posts.filter((p: SocialPost) => {
      if (!p.scheduled_date) return false;
      const pd = new Date(p.scheduled_date);
      return pd.getFullYear() === day.getFullYear() && pd.getMonth() === day.getMonth() && pd.getDate() === day.getDate();
    });

  const postsForSlot = (day: Date, hour: number) =>
    postsForDay(day).filter((p: SocialPost) => new Date(p.scheduled_date).getHours() === hour);

  const weekLabel = `${format(weekDays[0], 'd MMM')} – ${format(weekDays[6], 'd MMM yyyy')}`;

  return (
    <Card className="border-border/50">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="h-8 w-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center transition-colors">
            <ChevronLeft className="h-4 w-4"/>
          </button>
          <h3 className="text-sm font-bold min-w-40 text-center">{weekLabel}</h3>
          <button onClick={() => setWeekOffset(w => w + 1)} className="h-8 w-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center transition-colors">
            <ChevronRight className="h-4 w-4"/>
          </button>
          <button onClick={() => setWeekOffset(0)} className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-muted transition-colors">Today</button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 items-center">
            {PLATFORMS.map(p => (
              <div key={p.value} className="flex items-center gap-1 text-[9px]">
                <div className="h-2 w-2 rounded-full" style={{ background: p.color }}/>
                <span className="text-muted-foreground hidden md:inline">{p.label}</span>
              </div>
            ))}
          </div>
          {canEdit && (
            <Button size="sm" className="gap-1.5 text-xs text-white" style={{ backgroundColor: "#bc7e57" }} onClick={() => openStudio()}>
              <Plus className="h-3.5 w-3.5"/> Add Post
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 840 }}>
          {/* Day headers */}
          <div className="grid border-b border-border/20" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            <div className="border-r border-border/20 h-12"/>
            {weekDays.map((day, i) => {
              const isTodayD = isSameDay(day, new Date());
              const dp = postsForDay(day);
              return (
                <div key={i} className={`border-r border-border/20 p-2 text-center ${isTodayD ? 'bg-[#bc7e57]/5' : ''}`}>
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">{format(day, 'EEE')}</p>
                  <div className={`mx-auto mt-0.5 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isTodayD ? 'bg-[#bc7e57] text-white' : 'text-foreground'
                  }`}>{format(day, 'd')}</div>
                  {dp.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-1">
                      {dp.slice(0, 5).map((p: SocialPost) => {
                        const plt = PLATFORMS.find(x => x.value === p.platform);
                        return <div key={p.id} className="h-1.5 w-1.5 rounded-full" style={{ background: plt?.color || '#bc7e57' }}/>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time slot rows */}
          <div className="overflow-y-auto" style={{ maxHeight: 540 }}>
            {hours.map(hour => (
              <div key={hour} className="grid border-b border-border/10" style={{ gridTemplateColumns: '60px repeat(7, 1fr)', minHeight: 64 }}>
                <div className="border-r border-border/20 px-2 pt-1.5 text-[9px] text-muted-foreground font-medium">
                  {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                </div>
                {weekDays.map((day, di) => {
                  const slotPosts = postsForSlot(day, hour);
                  const isTodayD = isSameDay(day, new Date());
                  return (
                    <div key={di} className={`border-r border-border/10 p-1 space-y-0.5 ${
                      isTodayD ? 'bg-[#bc7e57]/[0.03]' : 'hover:bg-muted/20'
                    } transition-colors`}>
                      {slotPosts.map((p: SocialPost) => {
                        const plt = PLATFORMS.find(x => x.value === p.platform);
                        const PIcon = plt?.icon || Megaphone;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setPreviewPost(p)}
                            className="w-full text-left rounded-md px-1.5 py-1 text-white text-[9px] leading-tight hover:opacity-90 transition-opacity flex items-start gap-1 shadow-sm"
                            style={{ background: plt?.color || '#bc7e57' }}
                          >
                            <PIcon className="h-2.5 w-2.5 flex-shrink-0 mt-0.5"/>
                            <span className="truncate">{p.content?.slice(0, 28) || 'No caption'}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

// ─── Analytics Tab ────────────────────────────────────────────────
const AnalyticsTab = ({
  posts, total, published, approved, drafts
}: {
  posts: SocialPost[]; total: number; published: number; approved: number; drafts: number;
}) => {
  const platformCounts = PLATFORMS.map(p => ({
    name: p.label,
    value: posts.filter((x: SocialPost) => x.platform === p.value).length,
    color: p.color,
  }));
  const statusCounts = Object.entries(STATUS_CONFIG).map(([k, v]) => ({
    name: v.label,
    value: posts.filter((x: SocialPost) => x.status === k).length,
    color: k==='published'?'#bc7e57':k==='approved'?'#22c55e':k==='scheduled'?'#3b82f6':k==='draft'?'#8b5cf6':'#ef4444',
  }));
  const weeklyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (5 - i) * 7);
    const wStart = new Date(d); wStart.setDate(d.getDate() - d.getDay());
    const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
    const cnt = posts.filter((p: SocialPost) => {
      if (!p.created_at) return false;
      const pd = new Date(p.created_at);
      return pd >= wStart && pd <= wEnd;
    }).length;
    return { week: format(d, 'MMM d'), posts: cnt };
  });

  const topPlatform = [...platformCounts].sort((a,b) => b.value - a.value)[0];
  const engagePct = total > 0 ? Math.round((published / total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Content',   val: String(total),              sub: 'across all platforms',            color: '#bc7e57', icon: Layers },
          { label: 'Published',       val: String(published),          sub: `${engagePct}% publish rate`,       color: '#22c55e', icon: CheckCircle2 },
          { label: 'Top Platform',    val: topPlatform?.name || '—',    sub: `${topPlatform?.value||0} posts`,   color: topPlatform?.color||'#bc7e57', icon: TrendingUp },
          { label: 'Awaiting Action', val: String(approved + drafts),  sub: `${approved} to publish, ${drafts} drafts`, color: '#f59e0b', icon: AlertCircle },
        ].map(({ label, val, sub, color, icon: Icon }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: color+'22' }}>
                  <Icon className="h-4 w-4" style={{ color }}/>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
              </div>
              <p className="text-2xl font-black">{val}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Content Volume — Last 6 Weeks</CardTitle>
            <CardDescription className="text-xs">Posts created per week across all platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#bc7e57" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#bc7e57" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" tick={{ fontSize: 9 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Area type="monotone" dataKey="posts" stroke="#bc7e57" strokeWidth={2.5} fill="url(#calGrad)" dot={{ r: 3, fill: '#bc7e57' }}/>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">By Platform</CardTitle>
            <CardDescription className="text-xs">Posts per channel</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={platformCounts} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={60}/>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="value" radius={[0,4,4,0]}>
                  {platformCounts.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status donut rings */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">Content Pipeline — Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 flex-wrap">
            {statusCounts.map(s => (
              <div key={s.name} className="flex items-center gap-2.5">
                <div className="relative h-14 w-14 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30"/>
                    <circle cx="18" cy="18" r="14" fill="none" stroke={s.color} strokeWidth="4"
                      strokeDasharray={`${total > 0 ? (s.value/total)*87.96 : 0} 87.96`}
                      strokeLinecap="round"/>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black">{s.value}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">{total > 0 ? Math.round((s.value/total)*100) : 0}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover text-popover-foreground border border-border p-3 rounded-lg shadow-xl text-xs z-[100]">
        <p className="font-bold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="flex items-center gap-2 mt-1.5 label text-[11px] font-medium">
            <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
            <span className="opacity-80">{entry.name || 'Posts'} :</span>
            <span className="font-bold tabular-nums">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
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
      if (editingPost.image_url) {
        setImagePreviews(editingPost.image_url.split(',').filter(Boolean));
      } else {
        setImagePreviews([]);
      }
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["social_posts"] });
      await queryClient.refetchQueries({ queryKey: ["social_posts"] });
      setIsStudioOpen(false);
      setEditingPost(null);
      setForm({ ...emptyPost });
      setImageFiles([]);
      setImagePreviews([]);
      toast.success(editingPost ? "Post updated!" : "Post saved to Hub! 🚀");
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
    
    // We only upload 'new' files (File objects). Strings in imagePreviews are already uploaded.
    if (imageFiles.length > 0) {
      setUploading(true);
      const newUrls: string[] = [];
      for (const file of imageFiles) {
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: upErr } = await (supabase as any).storage.from("post-images").upload(fileName, file);
        if (upErr) { toast.error("Upload failed: " + upErr.message); continue; }
        const { data: urlData } = (supabase as any).storage.from("post-images").getPublicUrl(fileName);
        if (urlData?.publicUrl) newUrls.push(urlData.publicUrl);
      }
      setUploading(false);
      // Filter out local blob URLs from previews, keep real URLs
      const existingUrls = imagePreviews.filter(u => !u.startsWith("blob:"));
      image_url = [...existingUrls, ...newUrls].join(',');
    } else {
      // Just save the filtered real URLs if no new files
      image_url = imagePreviews.filter(u => !u.startsWith("blob:")).join(',');
    }
    saveMutation.mutate({
      platform:      form.platform,
      content:       form.content,
      status:        form.status,
      scheduled_date: form.scheduled_date,
      post_type:     form.post_type,
      image_url,
      created_by:    "REDtech Africa",
      created_by_user_id: profile?.id,
      tagged_users:  form.tagged_users,
      created_at:    editingPost ? undefined : new Date().toISOString(),
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
      setImageFiles([]);
      setImagePreviews([]);
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
            <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="h-4 w-4"/> Analytics</TabsTrigger>
            <TabsTrigger value="activity" className="gap-2"><Activity className="h-4 w-4"/> Activity</TabsTrigger>
          </TabsList>

          {/* ── POSTS TAB ── */}
          <TabsContent value="posts" className="space-y-5">
            {/* Quick Platform Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              <Button 
                variant={filterPlatform === "all" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setFilterPlatform("all")}
                className={`h-9 px-4 rounded-full text-xs font-semibold shrink-0 transition-all ${filterPlatform === "all" ? "bg-[#bc7e57] hover:bg-[#bc7e57]/90 shadow-md translate-y-[-1px]" : "border-border/60 hover:border-[#bc7e57]/40"}`}
              >
                All Platforms
              </Button>
              {PLATFORMS.map(p => {
                const Icon = p.icon;
                const active = filterPlatform === p.value;
                return (
                  <Button
                    key={p.value}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterPlatform(p.value)}
                    className={`h-9 px-4 rounded-full text-xs font-semibold shrink-0 gap-2 transition-all ${active ? "shadow-md translate-y-[-1px]" : "border-border/60 hover:border-[#bc7e57]/40"}`}
                    style={active ? { backgroundColor: p.color, border: "none" } : {}}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {p.label}
                  </Button>
                );
              })}
            </div>

            {/* Sub-Filters */}
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
            <WeeklyCalendar
              posts={posts}
              canEdit={canEdit}
              openStudio={openStudio}
              setPreviewPost={setPreviewPost}
            />
          </TabsContent>

          {/* ── ANALYTICS TAB ── */}
          <TabsContent value="analytics" className="space-y-5">
            {(() => {
              // Build chart data from real posts
              const platformCounts = PLATFORMS.map(p => ({
                name: p.label,
                value: posts.filter((x: SocialPost) => x.platform === p.value).length,
                color: p.color,
              }));
              const statusCounts = Object.entries(STATUS_CONFIG).map(([k, v]) => ({
                name: v.label,
                value: posts.filter((x: SocialPost) => x.status === k).length,
                color: k === 'published' ? '#bc7e57' : k === 'approved' ? '#22c55e' : k === 'scheduled' ? '#3b82f6' : k === 'draft' ? '#8b5cf6' : '#ef4444',
              }));
              // Posts per last 6 weeks
              const weeklyData = Array.from({ length: 6 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (5 - i) * 7);
                const wStart = new Date(d); wStart.setDate(d.getDate() - d.getDay());
                const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
                const cnt = posts.filter((p: SocialPost) => {
                  if (!p.created_at) return false;
                  const pd = new Date(p.created_at);
                  return pd >= wStart && pd <= wEnd;
                }).length;
                return { week: format(d, 'MMM d'), posts: cnt };
              });

              const topPlatform = [...platformCounts].sort((a,b) => b.value - a.value)[0];
              const engagePct = total > 0 ? Math.round((published / total) * 100) : 0;

              return (
                <>
                  {/* KPI row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Content', val: total, sub: 'across all platforms', color: '#bc7e57', icon: Layers },
                      { label: 'Published', val: published, sub: `${engagePct}% publish rate`, color: '#22c55e', icon: CheckCircle2 },
                      { label: 'Top Platform', val: topPlatform?.name || '—', sub: `${topPlatform?.value || 0} posts`, color: topPlatform?.color || '#bc7e57', icon: TrendingUp },
                      { label: 'Awaiting Action', val: approved + drafts, sub: `${approved} to publish, ${drafts} drafts`, color: '#f59e0b', icon: AlertCircle },
                    ].map(({ label, val, sub, color, icon: Icon }) => (
                      <Card key={label} className="border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
                              <Icon className="h-4 w-4" style={{ color }}/>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                          </div>
                          <p className="text-2xl font-black">{val}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Posts per week trend */}
                    <Card className="md:col-span-2 border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold">Content Volume — Last 6 Weeks</CardTitle>
                        <CardDescription className="text-xs">Posts created per week across all platforms</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={weeklyData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                            <defs>
                              <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#bc7e57" stopOpacity={0.35}/>
                                <stop offset="95%" stopColor="#bc7e57" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="week" tick={{ fontSize: 9 }} axisLine={false} tickLine={false}/>
                            <YAxis tick={{ fontSize: 9 }} allowDecimals={false} axisLine={false} tickLine={false}/>
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Area type="monotone" dataKey="posts" stroke="#bc7e57" strokeWidth={2.5} fill="url(#aGrad)" dot={{ r: 3, fill: '#bc7e57' }}/>
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Posts by platform */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold">By Platform</CardTitle>
                        <CardDescription className="text-xs">Distribution across channels</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={platformCounts} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                            <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false}/>
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={60}/>
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Bar dataKey="value" radius={[0,4,4,0]}>
                              {platformCounts.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Status breakdown */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold">Content Pipeline — Status Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6 flex-wrap">
                        {statusCounts.map(s => (
                          <div key={s.name} className="flex items-center gap-2.5">
                            <div className="relative h-14 w-14 flex-shrink-0">
                              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30"/>
                                <circle cx="18" cy="18" r="14" fill="none" stroke={s.color} strokeWidth="4"
                                  strokeDasharray={`${total > 0 ? (s.value/total)*87.96 : 0} 87.96`}/>
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] font-black">{s.value}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold">{s.name}</p>
                              <p className="text-[10px] text-muted-foreground">{total > 0 ? Math.round((s.value/total)*100) : 0}% of total</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
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
        <DialogContent className="max-w-6xl w-full p-0 overflow-hidden md:h-[90vh] flex flex-col md:flex-row shadow-2xl">
          <div className="flex flex-col md:flex-row flex-1 h-full min-h-0 overflow-hidden">
            {/* ── Left panel: form ── */}
            <div className="flex-1 flex flex-col overflow-y-auto border-r border-border/40 bg-card z-10">
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
                  <Label className="text-xs">Media (Images / Video)</Label>
                  <UploadZone
                    onFiles={fs => {
                      setImageFiles(prev => [...prev, ...fs]);
                      setImagePreviews(prev => [...prev, ...fs.map(f => URL.createObjectURL(f))]);
                    }}
                    previews={imagePreviews}
                    onClear={(i) => {
                      if (i === undefined) { setImageFiles([]); setImagePreviews([]); }
                      else {
                        setImagePreviews(p => p.filter((_, idx) => idx !== i));
                        // It's tricky to map the exact file to remove if there's a mix of old URLs and new files,
                        // but since imageFiles only tracks NEW files appended at the end, we can estimate:
                        const existingCount = imagePreviews.filter(u => !u.startsWith('blob:')).length;
                        if (i >= existingCount) setImageFiles(fs => fs.filter((_, idx) => idx !== (i - existingCount)));
                      }
                    }}
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
              <div className="w-full md:w-[380px] lg:w-[420px] flex-shrink-0 flex flex-col bg-muted/30 overflow-y-auto z-0 border-t md:border-t-0 border-border/40">
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
                      imageUrl={imagePreviews.join(',')}
                      authorName="REDtech Africa"
                      scheduledDate={form.scheduled_date}
                    />
                  </div>
                </div>
                {/* Format specs — premium panel */}
                {(() => {
                  const pt = POST_TYPES[form.post_type];
                  const limit = CHAR_LIMITS[form.platform] || 2200;
                  const used = form.content.length;
                  const pct = Math.min(100, Math.round((used / limit) * 100));
                  const barColor = pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#22c55e";
                  const plt = PLATFORMS.find(p => p.value === form.platform);
                  return (
                    <div className="px-4 py-4 border-t border-border/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold tracking-wide">Format Specs</p>
                        {plt && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: plt.color }}>{plt.label}</span>}
                      </div>
                      {/* Dimension card */}
                      <div className="rounded-xl border border-border/60 overflow-hidden">
                        <div className="flex items-center gap-3 p-2.5" style={{ background: (plt?.color || "#bc7e57") + "18" }}>
                          <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, background: (plt?.color || "#bc7e57") + "30" }}>
                            {pt?.icon && React.cloneElement(pt.icon as React.ReactElement, { className: "h-4 w-4", style: { color: plt?.color || "#bc7e57" } })}
                          </div>
                          <div>
                            <p className="text-xs font-bold">{pt?.label || "Post"}</p>
                            <p className="text-[10px] text-muted-foreground">{pt?.res || "Standard"}</p>
                            <p className="text-[9px] font-mono text-muted-foreground">{pt?.dimensions || ""}</p>
                          </div>
                        </div>
                      </div>
                      {/* Character bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground font-medium">Caption length</span>
                          <span className="font-bold" style={{ color: barColor }}>{used} / {limit.toLocaleString()}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: barColor }}/>
                        </div>
                        <p className="text-[9px] text-muted-foreground">{pct < 50 ? "✅ Plenty of space" : pct < 90 ? "⚠️ Getting long" : "🔴 Near limit"}</p>
                      </div>
                      {form.tagged_users?.length ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="font-medium">Tagged:</span>
                          <span>{form.tagged_users.length} teammate{form.tagged_users.length>1?"s":""}</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Preview Modal ── */}
      {previewPost && (
        <Dialog open={!!previewPost} onOpenChange={open => !open && setPreviewPost(null)}>
          <DialogContent className="max-w-2xl w-full p-0 overflow-hidden">
            <div className="flex">
              {/* Preview */}
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/30 min-h-[500px]">
                <PostPreview
                  platform={previewPost.platform}
                  postType={previewPost.post_type}
                  caption={previewPost.content}
                  imageUrl={previewPost.image_url}
                  authorName="REDtech Africa"
                />
              </div>
              {/* Meta panel */}
              <div className="w-56 flex-shrink-0 border-l border-border/40 p-5 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-bold mb-2">Platform & Format</p>
                  <PlatformPill platform={previewPost.platform} size="sm"/>
                  <div className="mt-1.5"><PostTypeBadge type={previewPost.post_type}/></div>
                </div>
                <div>
                  <p className="text-xs font-bold mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${(STATUS_CONFIG[previewPost.status]||STATUS_CONFIG.draft).color}`}>
                    {(STATUS_CONFIG[previewPost.status]||STATUS_CONFIG.draft).label}
                  </span>
                </div>
                {previewPost.scheduled_date && (
                  <div>
                    <p className="text-xs font-bold mb-1">Scheduled</p>
                    <p className="text-[11px] text-muted-foreground">{format(parseISO(previewPost.scheduled_date), "EEE d MMM yyyy")}</p>
                    <p className="text-[11px] font-semibold">{format(parseISO(previewPost.scheduled_date), "HH:mm")}</p>
                  </div>
                )}
                {previewPost.created_by && (
                  <div>
                    <p className="text-xs font-bold mb-1">Created by</p>
                    <p className="text-[11px] text-muted-foreground">{previewPost.created_by}</p>
                  </div>
                )}
                {(previewPost.tagged_users||[]).length > 0 && (
                  <div>
                    <p className="text-xs font-bold mb-1">Tagged</p>
                    <div className="flex flex-wrap gap-1">{(previewPost.tagged_users||[]).map(n=><span key={n} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#bc7e57]/15 text-[#bc7e57] font-medium">{n}</span>)}</div>
                  </div>
                )}
                <div className="mt-auto">
                  <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={() => { setPreviewPost(null); openStudio(previewPost); }}>
                    <Edit3 className="h-3.5 w-3.5"/> Edit Post
                  </Button>
                </div>
              </div>
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
