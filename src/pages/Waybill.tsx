import { WaybillGenerator } from "@/components/waybill/WaybillGenerator";
import { useAuth } from "@/lib/auth-context";
import { ViewerRestricted } from "@/components/ViewerRestricted";

const Waybill = () => {
  const { isViewer } = useAuth();

  if (isViewer) {
    return (
      <div className="flex-1 min-h-screen bg-background p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: '#bc7e57' }}>Waybill Generator</h1>
          <p className="text-muted-foreground mt-2">Create professional delivery waybills with tracking</p>
        </div>
        <ViewerRestricted action="create, edit, or download waybills" />
      </div>
    );
  }

  return <WaybillGenerator />;
};

export default Waybill;
