import React from 'react';
import ModernLayout from '@/layouts/modern-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Check, Plus, Settings, BarChart3, Download, FileText } from 'lucide-react';

export default function ModernStyleDemo() {
  return (
    <ModernLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Modern Design System</h1>
            <p className="text-muted-foreground mt-1">
              Benton County's modern UI component library with depth-enhanced UI
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Documentation
            </Button>
            <Button size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download Assets
            </Button>
          </div>
        </div>

        <Tabs defaultValue="components" className="w-full">
          <TabsList className="w-full max-w-md bg-blue-950/10 mx-auto flex justify-center mb-6">
            <TabsTrigger value="components" className="flex-1">UI Components</TabsTrigger>
            <TabsTrigger value="data" className="flex-1">Data Components</TabsTrigger>
            <TabsTrigger value="forms" className="flex-1">Form Elements</TabsTrigger>
          </TabsList>
          
          <TabsContent value="components" className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Card Components</h2>
              <p className="text-slate-500 dark:text-slate-400">
                Modern cards with depth effects for displaying content groups
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card className="transition-all duration-300 hover:shadow-lg border-slate-200/70 bg-white/60 backdrop-blur-md">
                  <CardHeader className="pb-2">
                    <CardTitle>Quick Analysis</CardTitle>
                    <CardDescription>Overview of current assessments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-800">$4.5M</div>
                    <p className="text-sm text-emerald-600 font-medium flex items-center mt-1">
                      <Check size={14} className="mr-1" /> 12% increase from previous period
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full">
                      <BarChart3 className="mr-2 h-4 w-4" /> View Report
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card className="transition-all duration-300 hover:shadow-lg border-slate-200/70 bg-white/60 backdrop-blur-md">
                  <CardHeader className="pb-2">
                    <CardTitle>Pending Tasks</CardTitle>
                    <CardDescription>Items awaiting your action</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-800">7 Tasks</div>
                    <p className="text-sm text-amber-600 font-medium flex items-center mt-1">
                      2 high priority items need attention
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="mr-2 h-4 w-4" /> Process Queue
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card className="transition-all duration-300 hover:shadow-lg border-slate-200/70 bg-white/60 backdrop-blur-md">
                  <CardHeader className="pb-2">
                    <CardTitle>System Status</CardTitle>
                    <CardDescription>All systems operational</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-800">100%</div>
                    <p className="text-sm text-emerald-600 font-medium flex items-center mt-1">
                      <Check size={14} className="mr-1" /> All services running normally
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full">
                      <Settings className="mr-2 h-4 w-4" /> System Settings
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </section>
            
            <section className="mt-8 space-y-3">
              <h2 className="text-2xl font-semibold">Status Indicators</h2>
              <p className="text-slate-500 dark:text-slate-400">
                Visual process tracking with progress indicators
              </p>
              
              <Card className="border-slate-200/70 bg-white/60 backdrop-blur-md">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between max-w-lg mx-auto">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                        <Check size={16} />
                      </div>
                      <div className="text-sm font-medium mt-2">Filing</div>
                    </div>
                    <div className="w-full max-w-[80px] h-1 bg-green-500"></div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                        <Check size={16} />
                      </div>
                      <div className="text-sm font-medium mt-2">Review</div>
                    </div>
                    <div className="w-full max-w-[80px] h-1 bg-green-500"></div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        <span className="font-bold">3</span>
                      </div>
                      <div className="text-sm font-medium mt-2">Certification</div>
                    </div>
                    <div className="w-full max-w-[80px] h-1 bg-gray-200"></div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                        <span className="font-bold">4</span>
                      </div>
                      <div className="text-sm font-medium mt-2">Final Approval</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>
          
          <TabsContent value="data" className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Data Grid</h2>
              <p className="text-slate-500 dark:text-slate-400">
                Spreadsheet-inspired data grid for tabular information
              </p>
              
              <Card className="border-slate-200/70 bg-white/60 backdrop-blur-md overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200/70">
                  <CardTitle>Property Assessment Impact</CardTitle>
                  <CardDescription>Analysis of tax changes by property</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left p-3 font-medium text-gray-600">Property ID</th>
                          <th className="text-right p-3 font-medium text-gray-600">Value</th>
                          <th className="text-right p-3 font-medium text-gray-600">Prev. Tax</th>
                          <th className="text-right p-3 font-medium text-gray-600">New Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 text-gray-800">P001</td>
                          <td className="p-3 text-right text-gray-800">$450,000</td>
                          <td className="p-3 text-right text-gray-800">$675.00</td>
                          <td className="p-3 text-right text-gray-800">$671.40</td>
                        </tr>
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 text-gray-800">P002</td>
                          <td className="p-3 text-right text-gray-800">$375,000</td>
                          <td className="p-3 text-right text-gray-800">$562.50</td>
                          <td className="p-3 text-right text-gray-800">$559.50</td>
                        </tr>
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 text-gray-800">P003</td>
                          <td className="p-3 text-right text-gray-800">$520,000</td>
                          <td className="p-3 text-right text-gray-800">$780.00</td>
                          <td className="p-3 text-right text-gray-800">$775.84</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
                <CardFooter className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-slate-200/70 flex justify-between">
                  <span className="text-sm text-slate-500">Showing 3 of 120 properties</span>
                  <Button variant="ghost" size="sm">View All</Button>
                </CardFooter>
              </Card>
            </section>
            
            <section className="mt-8 space-y-3">
              <h2 className="text-2xl font-semibold">Metric Cards</h2>
              <p className="text-slate-500 dark:text-slate-400">
                Analytics-focused metric displays with trend indicators
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card className="border-slate-200/70 bg-white/60 backdrop-blur-md p-4">
                  <div className="text-gray-500 text-sm font-medium">Average Change</div>
                  <div className="text-2xl font-bold mt-1">-0.8%</div>
                  <div className="text-emerald-600 text-xs font-medium mt-1 flex items-center">
                    <Check size={12} className="mr-1" /> Below Threshold
                  </div>
                </Card>
                
                <Card className="border-slate-200/70 bg-white/60 backdrop-blur-md p-4">
                  <div className="text-gray-500 text-sm font-medium">Max Impact</div>
                  <div className="text-2xl font-bold mt-1">$14.56</div>
                  <div className="text-emerald-600 text-xs font-medium mt-1 flex items-center">
                    <Check size={12} className="mr-1" /> Residential
                  </div>
                </Card>
                
                <Card className="border-slate-200/70 bg-white/60 backdrop-blur-md p-4">
                  <div className="text-gray-500 text-sm font-medium">Revenue Change</div>
                  <div className="text-2xl font-bold mt-1">+$15,750</div>
                  <div className="text-emerald-600 text-xs font-medium mt-1 flex items-center">
                    <Check size={12} className="mr-1" /> From New Construction
                  </div>
                </Card>
              </div>
            </section>
          </TabsContent>
          
          <TabsContent value="forms" className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Spreadsheet-Inspired Forms</h2>
              <p className="text-slate-500 dark:text-slate-400">
                Form fields with spreadsheet styling for familiarity
              </p>
              
              <Card className="border-slate-200/70 bg-white/60 backdrop-blur-md">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200/70">
                  <CardTitle>Rate Calculation Input</CardTitle>
                  <CardDescription>Entry fields with spreadsheet styling</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="spreadsheet-section">
                        <h3 className="text-md font-medium mb-3">District Information</h3>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex">
                            <div className="w-1/3 p-2 border-r border-y border-l rounded-l-md bg-gray-50 text-sm font-medium text-gray-600 flex items-center">
                              Levy Year
                            </div>
                            <Input type="number" defaultValue="2023" className="rounded-l-none border-l-0" />
                          </div>
                          
                          <div className="flex">
                            <div className="w-1/3 p-2 border-r border-y border-l rounded-l-md bg-gray-50 text-sm font-medium text-gray-600 flex items-center">
                              Previous Rate
                            </div>
                            <Input type="text" defaultValue="1.5000" className="rounded-l-none border-l-0" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="spreadsheet-section">
                        <h3 className="text-md font-medium mb-3">Calculation Results</h3>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex">
                            <div className="w-1/3 p-2 border-r border-y border-l rounded-l-md bg-gray-50 text-sm font-medium text-gray-600 flex items-center">
                              Certified Amount
                            </div>
                            <Input type="text" defaultValue="2,500,000.00" className="rounded-l-none border-l-0" />
                          </div>
                          
                          <div className="flex">
                            <div className="w-1/3 p-2 border-r border-y border-l rounded-l-md bg-gray-50 text-sm font-medium text-gray-600 flex items-center">
                              Calculated Rate
                            </div>
                            <div className="flex items-center flex-1">
                              <Input 
                                type="text" 
                                value="1.4920" 
                                readOnly 
                                className="rounded-l-none border-l-0 bg-blue-50 text-blue-800 font-medium"
                              />
                              <span className="ml-2 text-sm text-muted-foreground">per $1,000</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-slate-200/70 flex justify-end">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Submit for Review <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </section>
            
            <section className="mt-8">
              <Button size="lg" variant="default" onClick={() => window.location.href = '/style-demo'}>
                View Original Style Demo
              </Button>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </ModernLayout>
  );
}