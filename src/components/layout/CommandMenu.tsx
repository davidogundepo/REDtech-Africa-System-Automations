import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useAuth } from "@/lib/auth-context";
import { 
  FileText, Truck, Users, CheckSquare, CalendarDays, 
  LayoutDashboard, BarChart3, FolderOpen, TrendingUp, Megaphone,
  UserCog, Shield, Clock, Search, LogOut, Settings, User
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();
  const { profile, signOut, isSuperAdmin, isAdmin } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Core Apps">
          <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/clients"))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Client Directory CRM</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/tasks"))}>
            <CheckSquare className="mr-2 h-4 w-4" />
            <span>Task Tracker</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/attendance"))}>
            <Clock className="mr-2 h-4 w-4" />
            <span>Attendance & Timesheets</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/leave"))}>
            <CalendarDays className="mr-2 h-4 w-4" />
            <span>Leave Management</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/invoice"))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Invoice Generator</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/waybill"))}>
            <Truck className="mr-2 h-4 w-4" />
            <span>Waybill Generator</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Business Operations">
          <CommandItem onSelect={() => runCommand(() => navigate("/documents"))}>
            <FolderOpen className="mr-2 h-4 w-4" />
            <span>Document Repository</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/finance-dashboard"))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Finance Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/ops-dashboard"))}>
            <TrendingUp className="mr-2 h-4 w-4" />
            <span>Operations Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/social"))}>
            <Megaphone className="mr-2 h-4 w-4" />
            <span>Social Media Hub</span>
          </CommandItem>
        </CommandGroup>

        {(isAdmin || isSuperAdmin) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Administration">
              <CommandItem onSelect={() => runCommand(() => navigate("/utilisation"))}>
                <UserCog className="mr-2 h-4 w-4" />
                <span>Staff Utilisation</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/users"))}>
                <Shield className="mr-2 h-4 w-4" />
                <span>User Management</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => navigate("/profile"))}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
            <CommandShortcut>⇧⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Toggle Theme</span>
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(async () => {
            await signOut();
            navigate("/auth");
          })}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log Out</span>
            <CommandShortcut>⌘Q</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
