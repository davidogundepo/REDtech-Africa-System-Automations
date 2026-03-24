import { useState, useMemo } from "react";
import { WaybillGenerator } from "@/components/waybill/WaybillGenerator";
import { useAuth } from "@/lib/auth-context";
import { ViewerRestricted } from "@/components/ViewerRestricted";
import { MotionPage } from "@/components/shared/MotionPage";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, FileText, Eye, Grid3X3, List } from "lucide-react";
import { format } from "date-fns";
import { EmptyState } from "@/components/shared/EmptyState";

const Waybill = () => {
  const { isViewer } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch past waybills from documents table
  const { data: pastWaybills } = useQuery({
    queryKey: ["past-waybills"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("transactions")
        .select("*")
        .eq("category", "Waybill / Delivery")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  if (isViewer) {
    return (
      <MotionPage className="flex-1 min-h-screen bg-background p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: '#bc7e57' }}>Waybill Generator</h1>
          <p className="text-muted-foreground mt-2">Create professional delivery waybills with tracking</p>
        </div>
        <ViewerRestricted action="create, edit, or download waybills" />
      </MotionPage>
    );
  }

  return (
    <MotionPage className="flex-1 min-h-screen bg-background">
      <SwapCardWrapper views={[
        {
          label: "Generator",
          content: <WaybillGenerator />
        },
        {
          label: "Past Waybills",
          content: (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#bc7e57]" /> Past Waybills
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pastWaybills?.length || 0} waybill{(pastWaybills?.length || 0) !== 1 ? 's' : ''} generated
                  </p>
                </div>
                <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-card shadow-sm text-[#bc7e57]' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-card shadow-sm text-[#bc7e57]' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {!pastWaybills || pastWaybills.length === 0 ? (
                <EmptyState
                  illustration="documents"
                  heading="No waybills generated yet"
                  subtext="Generate your first waybill using the Generator view."
                />
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastWaybills.map((wb: any) => (
                    <Card key={wb.id} className="border-border/50 hover:shadow-md transition-all group overflow-hidden rounded-2xl">
                      <div className="h-1.5 w-full bg-gradient-to-r from-[#bc7e57] to-[#eab308]" />
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="h-10 w-10 rounded-xl bg-[#bc7e57]/10 flex items-center justify-center">
                            <Truck className="h-5 w-5 text-[#bc7e57]" />
                          </div>
                          <Badge variant="outline" className="text-[10px]">Delivery</Badge>
                        </div>
                        <p className="text-sm font-semibold text-foreground line-clamp-2 mb-2">{wb.description}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {wb.date ? format(new Date(wb.date), "MMM d, yyyy") : "No date"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {pastWaybills.map((wb: any) => (
                    <div key={wb.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all">
                      <div className="h-9 w-9 rounded-lg bg-[#bc7e57]/10 flex items-center justify-center shrink-0">
                        <Truck className="h-4 w-4 text-[#bc7e57]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{wb.description}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {wb.date ? format(new Date(wb.date), "MMM d, yyyy") : "No date"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">Delivery</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }
      ]} className="min-h-screen" />
    </MotionPage>
  );
};

export default Waybill;
