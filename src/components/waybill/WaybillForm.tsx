import { WaybillData, WaybillItem } from "@/types/waybill";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Building2, User, FileText, Truck, Package, Settings, Palette } from "lucide-react";
import { LogoUpload } from "@/components/shared/LogoUpload";

interface WaybillFormProps {
  waybillData: WaybillData;
  setWaybillData: React.Dispatch<React.SetStateAction<WaybillData>>;
}

export const WaybillForm = ({ waybillData, setWaybillData }: WaybillFormProps) => {
  const updateField = <K extends keyof WaybillData>(field: K, value: WaybillData[K]) => {
    setWaybillData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    const newItem: WaybillItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
    };
    updateField('items', [...waybillData.items, newItem]);
  };

  const updateItem = (id: string, field: keyof WaybillItem, value: string | number) => {
    updateField('items', waybillData.items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: string) => {
    updateField('items', waybillData.items.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-6 p-6 overflow-y-auto max-h-[calc(100vh-120px)]">
      {/* Company Branding */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Company Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={waybillData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                placeholder="REDtech Africa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={waybillData.accentColor}
                  onChange={(e) => updateField('accentColor', e.target.value)}
                  className="h-10 w-12 rounded border border-input cursor-pointer"
                />
                <Input
                  value={waybillData.accentColor}
                  onChange={(e) => updateField('accentColor', e.target.value)}
                  placeholder="#C9A66B"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <LogoUpload
            logo={waybillData.companyLogo}
            onLogoChange={(logo) => updateField('companyLogo', logo)}
            onLogoRemove={() => updateField('companyLogo', undefined as any)}
          />
          <div className="space-y-2">
            <Label htmlFor="companyAddress">Address</Label>
            <Input
              id="companyAddress"
              value={waybillData.companyAddress}
              onChange={(e) => updateField('companyAddress', e.target.value)}
              placeholder="Trocadero Square, The Rock Drive"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Phone</Label>
              <Input
                id="companyPhone"
                value={waybillData.companyPhone}
                onChange={(e) => updateField('companyPhone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Email</Label>
              <Input
                id="companyEmail"
                value={waybillData.companyEmail}
                onChange={(e) => updateField('companyEmail', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyWebsite">Website</Label>
            <Input
              id="companyWebsite"
              value={waybillData.companyWebsite}
              onChange={(e) => updateField('companyWebsite', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Waybill Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Waybill Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="waybillNumber">Waybill No.</Label>
              <Input
                id="waybillNumber"
                value={waybillData.waybillNumber}
                onChange={(e) => updateField('waybillNumber', e.target.value)}
                placeholder="25251105"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waybillDate">Date</Label>
              <Input
                id="waybillDate"
                type="date"
                value={waybillData.waybillDate}
                onChange={(e) => updateField('waybillDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Supplier Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplierName">Supplier Name</Label>
            <Input
              id="supplierName"
              value={waybillData.supplierName}
              onChange={(e) => updateField('supplierName', e.target.value)}
              placeholder="REDtech Africa Consulting LTD"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplierEmail">Email</Label>
            <Input
              id="supplierEmail"
              type="email"
              value={waybillData.supplierEmail}
              onChange={(e) => updateField('supplierEmail', e.target.value)}
              placeholder="olu@redtechafrica.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplierPhone">Mobile 1</Label>
              <Input
                id="supplierPhone"
                value={waybillData.supplierPhone}
                onChange={(e) => updateField('supplierPhone', e.target.value)}
                placeholder="0818 428 1100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierPhone2">Mobile 2 (Optional)</Label>
              <Input
                id="supplierPhone2"
                value={waybillData.supplierPhone2 || ""}
                onChange={(e) => updateField('supplierPhone2', e.target.value)}
                placeholder="0818 969 6614"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            Delivery Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deliveredTo">Delivered To</Label>
            <Input
              id="deliveredTo"
              value={waybillData.deliveredTo}
              onChange={(e) => updateField('deliveredTo', e.target.value)}
              placeholder="BOI Receiving Unit"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliveryDepartment">Department (Optional)</Label>
            <Input
              id="deliveryDepartment"
              value={waybillData.deliveryDepartment || ""}
              onChange={(e) => updateField('deliveryDepartment', e.target.value)}
              placeholder="Administration & Procurement Management Services"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliveryOrganization">Organization (Optional)</Label>
            <Input
              id="deliveryOrganization"
              value={waybillData.deliveryOrganization || ""}
              onChange={(e) => updateField('deliveryOrganization', e.target.value)}
              placeholder="Bank of Industry"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">Address</Label>
            <Input
              id="deliveryAddress"
              value={waybillData.deliveryAddress}
              onChange={(e) => updateField('deliveryAddress', e.target.value)}
              placeholder="23 Marina Road, Lagos, Nigeria."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="attentionTo">Attention To (Optional)</Label>
            <Input
              id="attentionTo"
              value={waybillData.attentionTo || ""}
              onChange={(e) => updateField('attentionTo', e.target.value)}
              placeholder="John Taiwo"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryMethod">Delivery Method</Label>
              <Select 
                value={waybillData.deliveryMethod} 
                onValueChange={(value) => updateField('deliveryMethod', value as WaybillData['deliveryMethod'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vehicle">Vehicle</SelectItem>
                  <SelectItem value="Courier">Courier</SelectItem>
                  <SelectItem value="Hand Delivery">Hand Delivery</SelectItem>
                  <SelectItem value="Air Freight">Air Freight</SelectItem>
                  <SelectItem value="Sea Freight">Sea Freight</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {waybillData.deliveryMethod === 'Other' && (
              <div className="space-y-2">
                <Label htmlFor="customDeliveryMethod">Custom Method</Label>
                <Input
                  id="customDeliveryMethod"
                  value={waybillData.customDeliveryMethod || ""}
                  onChange={(e) => updateField('customDeliveryMethod', e.target.value)}
                  placeholder="Specify delivery method"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Items
            </span>
            <Button size="sm" onClick={addItem} variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {waybillData.items.map((item, index) => (
            <div key={item.id} className="p-4 border border-border rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  className="text-destructive hover:text-destructive"
                  disabled={waybillData.items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Item Description</Label>
                <Textarea
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  placeholder="Apple iPad Pro, 2024; 11 inches; (512GB) M4; Chip (Wi-Fi/Cellular)."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          ))}
          {waybillData.items.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No items added yet. Click "Add Item" to start.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Toggles & Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Display Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Remarks Section</Label>
              <p className="text-sm text-muted-foreground">Display remarks lines for additional notes</p>
            </div>
            <Switch 
              checked={waybillData.showRemarks} 
              onCheckedChange={(checked) => updateField('showRemarks', checked)}
            />
          </div>
          {waybillData.showRemarks && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                value={waybillData.remarks || ""}
                onChange={(e) => updateField('remarks', e.target.value)}
                placeholder="Any additional remarks..."
                rows={3}
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Receiver Section</Label>
              <p className="text-sm text-muted-foreground">Display receiver name, signature & date fields</p>
            </div>
            <Switch 
              checked={waybillData.showReceiverSection} 
              onCheckedChange={(checked) => updateField('showReceiverSection', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Website</Label>
              <p className="text-sm text-muted-foreground">Display company website on waybill</p>
            </div>
            <Switch 
              checked={waybillData.showWebsite} 
              onCheckedChange={(checked) => updateField('showWebsite', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Thank You Message</Label>
              <p className="text-sm text-muted-foreground">Display thank you banner at bottom</p>
            </div>
            <Switch 
              checked={waybillData.showThankYouMessage} 
              onCheckedChange={(checked) => updateField('showThankYouMessage', checked)}
            />
          </div>
          {waybillData.showThankYouMessage && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label htmlFor="thankYouMessage">Thank You Message</Label>
              <Input
                id="thankYouMessage"
                value={waybillData.thankYouMessage}
                onChange={(e) => updateField('thankYouMessage', e.target.value)}
                placeholder="Thank you for considering services."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
