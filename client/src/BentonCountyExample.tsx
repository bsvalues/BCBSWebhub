import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import './benton-county-styles.css';

/**
 * Benton County header component
 */
export const BentonCountyHeader: React.FC = () => {
  return (
    <header className="bg-[#27374D] text-white p-4 flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <img 
          src="https://www.co.benton.wa.us/files/o/r/oregontraillogo_202008071648183323.png" 
          alt="Benton County Logo" 
          className="h-12" 
        />
        <div>
          <h1 className="text-lg font-semibold">Benton County, Washington</h1>
          <p className="text-sm opacity-80">Assessor's Office</p>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button variant="outline" className="text-white border-white hover:bg-white/10">Help</Button>
        <Button className="bg-[#51829B] hover:bg-[#3A5F78]">Log In</Button>
      </div>
    </header>
  );
};

/**
 * A spreadsheet-style form field component
 */
interface SpreadsheetFormFieldProps {
  label: string;
  children: React.ReactNode;
}

export const SpreadsheetFormField: React.FC<SpreadsheetFormFieldProps> = ({ label, children }) => {
  return (
    <div className="spreadsheet-field">
      <label className="spreadsheet-label">{label}</label>
      <div className="spreadsheet-input">
        {children}
      </div>
    </div>
  );
};

/**
 * A spreadsheet-inspired data grid component
 */
interface GridTableProps {
  columns: {
    key: string;
    header: string;
    width?: string;
    numeric?: boolean;
  }[];
  data: Record<string, any>[];
  onRowClick?: (row: Record<string, any>) => void;
}

export const GridTable: React.FC<GridTableProps> = ({ columns, data, onRowClick }) => {
  return (
    <div className="grid-table-container">
      <div className="grid-table">
        <div className="grid-header">
          {columns.map((col) => (
            <div 
              key={col.key} 
              className={`grid-cell ${col.numeric ? 'text-right' : ''}`}
              style={{ width: col.width }}
            >
              {col.header}
            </div>
          ))}
        </div>
        <div className="grid-body">
          {data.map((row, rowIndex) => (
            <div 
              key={rowIndex} 
              className={`grid-row ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((col) => (
                <div 
                  key={`${rowIndex}-${col.key}`} 
                  className={`grid-cell ${col.numeric ? 'text-right' : ''}`}
                  style={{ width: col.width }}
                >
                  {row[col.key]}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Analytics style stat card component
 */
interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, trend }) => {
  return (
    <div className="stat-card">
      <h3 className="stat-card-title">{title}</h3>
      <p className="stat-card-value">{value}</p>
      {trend && (
        <div className={`stat-card-trend ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend.positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Example of a status timeline component
 */
interface StatusStep {
  label: string;
  status: 'completed' | 'current' | 'pending';
}

interface StatusTimelineProps {
  steps: StatusStep[];
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ steps }) => {
  return (
    <div className="status-timeline">
      {steps.map((step, index) => (
        <div 
          key={index} 
          className={`status-step ${step.status}`}
        >
          <div className="status-step-marker"></div>
          <div className="status-step-connector">
            {index < steps.length - 1 && <div className="status-step-line"></div>}
          </div>
          <div className="status-step-label">{step.label}</div>
        </div>
      ))}
    </div>
  );
};

/**
 * Example usage of the components in a LevyMaster form
 */
export const LevyMasterForm: React.FC = () => {
  // Sample data for demonstration
  const districts = [
    { id: 1, name: 'District 1 - Richland Schools' },
    { id: 2, name: 'District 2 - Kennewick Schools' },
    { id: 3, name: 'District 3 - Pasco Schools' }
  ];
  
  const propertyData = [
    { id: 'P001', address: '123 Main St', value: '$450,000', type: 'Residential', zone: 'R-1' },
    { id: 'P002', address: '456 Oak Ave', value: '$375,000', type: 'Residential', zone: 'R-1' },
    { id: 'P003', address: '789 Pine Rd', value: '$520,000', type: 'Residential', zone: 'R-2' }
  ];
  
  const statusSteps = [
    { label: 'Filing', status: 'completed' as const },
    { label: 'Review', status: 'completed' as const },
    { label: 'Certification', status: 'current' as const },
    { label: 'Final Approval', status: 'pending' as const }
  ];

  return (
    <div className="levy-master-form">
      <h2 className="text-xl font-semibold mb-4">Levy Rate Calculation</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="spreadsheet-section">
            <h3 className="text-md font-medium mb-3">District Information</h3>
            <div className="grid grid-cols-1 gap-3">
              <SpreadsheetFormField label="Levy Year">
                <Input type="number" defaultValue="2023" className="spreadsheet-number-input" />
              </SpreadsheetFormField>
              
              <SpreadsheetFormField label="District">
                <Select defaultValue="1">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {districts.map(district => (
                        <SelectItem key={district.id} value={district.id.toString()}>
                          {district.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </SpreadsheetFormField>
              
              <SpreadsheetFormField label="Levy Type">
                <Select defaultValue="maintenance">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select levy type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance & Operations</SelectItem>
                    <SelectItem value="bond">Bond</SelectItem>
                    <SelectItem value="capital">Capital Projects</SelectItem>
                  </SelectContent>
                </Select>
              </SpreadsheetFormField>
              
              <SpreadsheetFormField label="Previous Rate">
                <Input 
                  type="text" 
                  defaultValue="1.5000" 
                  className="spreadsheet-number-input" 
                />
              </SpreadsheetFormField>
            </div>
          </div>
          
          <div className="spreadsheet-section mt-4">
            <h3 className="text-md font-medium mb-3">Levy Amounts</h3>
            <div className="grid grid-cols-1 gap-3">
              <SpreadsheetFormField label="Certified Amount">
                <Input 
                  type="text" 
                  defaultValue="2,500,000.00" 
                  className="spreadsheet-number-input" 
                />
              </SpreadsheetFormField>
              
              <SpreadsheetFormField label="Assessed Value">
                <Input 
                  type="text" 
                  defaultValue="1,675,450,000.00" 
                  className="spreadsheet-number-input" 
                />
              </SpreadsheetFormField>
              
              <SpreadsheetFormField label="New Construction">
                <Input 
                  type="text" 
                  defaultValue="45,750,000.00" 
                  className="spreadsheet-number-input" 
                />
              </SpreadsheetFormField>
              
              <SpreadsheetFormField label="Calculated Rate">
                <div className="flex items-center">
                  <Input 
                    type="text" 
                    value="1.4920" 
                    readOnly 
                    className="spreadsheet-calculated-input" 
                  />
                  <span className="ml-2 text-sm text-muted-foreground">per $1,000</span>
                </div>
              </SpreadsheetFormField>
            </div>
          </div>
        </div>
        
        <div>
          <div className="spreadsheet-section">
            <h3 className="text-md font-medium mb-3">Status</h3>
            <StatusTimeline steps={statusSteps} />
          </div>
          
          <div className="spreadsheet-section mt-4">
            <h3 className="text-md font-medium mb-3">Property Impact Analysis</h3>
            <GridTable 
              columns={[
                { key: 'id', header: 'Property ID', width: '20%' },
                { key: 'value', header: 'Value', width: '30%', numeric: true },
                { key: 'prevTax', header: 'Prev. Tax', width: '25%', numeric: true },
                { key: 'newTax', header: 'New Tax', width: '25%', numeric: true }
              ]}
              data={[
                { id: 'P001', value: '$450,000', prevTax: '$675.00', newTax: '$671.40' },
                { id: 'P002', value: '$375,000', prevTax: '$562.50', newTax: '$559.50' },
                { id: 'P003', value: '$520,000', prevTax: '$780.00', newTax: '$775.84' }
              ]}
            />
          </div>
          
          <div className="flex flex-wrap gap-4 mt-4">
            <StatCard 
              title="Average Change" 
              value="-0.8%" 
              trend={{ value: "Below Threshold", positive: true }}
            />
            <StatCard 
              title="Max Impact" 
              value="$14.56" 
              trend={{ value: "Residential", positive: true }}
            />
            <StatCard 
              title="Revenue Change" 
              value="+$15,750" 
              trend={{ value: "From New Construction", positive: true }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-4 pt-4 border-t">
        <div className="flex items-center">
          <Checkbox id="verify" />
          <label htmlFor="verify" className="ml-2 text-sm">
            I verify these calculations are accurate
          </label>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">Save Draft</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Submit for Review <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};