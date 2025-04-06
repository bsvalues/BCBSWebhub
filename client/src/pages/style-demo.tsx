import React from 'react';
import { LevyMasterForm } from '../BentonCountyExample';

export default function StyleDemo() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Benton County Styling Examples</h1>
      <p className="mb-6">
        This page demonstrates the spreadsheet-inspired UI elements for the Benton County Assessor's Office. 
        These styles can be used in both the County Audit Hub and LevyMaster applications.
      </p>
      
      <div className="border border-border rounded-lg p-6 bg-card/50">
        <LevyMasterForm />
      </div>
      
      <div className="mt-6 text-sm text-muted-foreground">
        <p>
          View the example-usage.html file for more detailed examples of these components.
          The BENTON_COUNTY_STYLING.md file contains implementation instructions.
        </p>
      </div>
    </div>
  );
}