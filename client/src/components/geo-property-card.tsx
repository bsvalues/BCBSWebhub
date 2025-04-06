import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Audit } from "@shared/schema";
import { MapPin, Calendar, Tag, Clipboard, User, AlertTriangle, ChevronRight } from "lucide-react";
import { formatDate, formatCurrency, cn } from "@/lib/utils";

interface GeoPropertyCardProps {
  audit: Audit;
  onSelect?: (audit: Audit) => void;
  selected?: boolean;
  className?: string;
}

export default function GeoPropertyCard({ 
  audit, 
  onSelect, 
  selected = false,
  className
}: GeoPropertyCardProps) {
  
  // For the property map preview, we would use real map data in a production app
  // Here we're creating a simple representation with coordinates based on the audit ID
  const getPropertyCoordinates = () => {
    // Generate deterministic coordinates based on audit ID for demo purposes
    const idSum = `${audit.id}`.split('').reduce((sum, digit) => sum + parseInt(digit), 0);
    const lat = 46.23 + (idSum % 10) * 0.01;
    const lng = -119.17 - (idSum % 7) * 0.01;
    return { lat, lng };
  };
  
  const coords = getPropertyCoordinates();
  
  // Determine badge color based on status
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'default';
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'needs_info': return 'info';
      default: return 'secondary';
    }
  };
  
  // Priority indicator
  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'normal': return null;
      case 'low': return null;
      default: return null;
    }
  };

  // Get property type and style
  const getPropertyTypeStyle = () => {
    const type = audit.propertyType || 'residential';
    switch(type) {
      case 'commercial': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'residential': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'agricultural': return 'bg-green-50 text-green-700 border-green-200';
      case 'industrial': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card 
      className={cn(
        "property-card cursor-pointer transform transition-all duration-200 hover:-translate-y-1", 
        selected && "ring-2 ring-primary shadow-lg",
        className
      )}
      onClick={() => onSelect && onSelect(audit)}
    >
      <div className="property-map-preview">
        {/* This would be a real map in production */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none overflow-hidden">
          <div className="text-5xl font-mono text-primary/30">{audit.id}</div>
        </div>
        
        <div className="property-badge">
          <Badge variant="outline" className={getPropertyTypeStyle()}>
            {audit.propertyType || 'residential'}
          </Badge>
        </div>
        
        <div className="absolute bottom-2 right-2 coordinate-display">
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </div>
      </div>
      
      <CardHeader className="p-3 pb-1">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium line-clamp-1">
            {audit.title || `Property #${audit.propertyId || audit.id}`}
          </CardTitle>
          <Badge variant={getBadgeVariant(audit.status) as any}>
            {audit.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-0 space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <div>
            <div className="property-detail-label">Property ID</div>
            <div className="property-detail-value flex items-center gap-1">
              <Clipboard className="h-3 w-3 text-muted-foreground" />
              {audit.propertyId || `P-${audit.id}`}
            </div>
          </div>
          
          <div>
            <div className="property-detail-label">Audit #</div>
            <div className="property-detail-value flex items-center gap-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {audit.auditNumber || `A-${audit.id}`}
            </div>
          </div>
          
          <div>
            <div className="property-detail-label">Location</div>
            <div className="property-detail-value flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {audit.address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`}
            </div>
          </div>
          
          <div>
            <div className="property-detail-label">Submitted</div>
            <div className="property-detail-value flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              {formatDate(audit.submittedAt)}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/30">
          <div className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3 w-3" />
            <span>User {audit.submittedById}</span>
          </div>
          
          <div className="flex items-center">
            {getPriorityIndicator(audit.priority)}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}