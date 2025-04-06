import React, { useEffect } from 'react';
import ModernLayout from '@/layouts/modern-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Check, Plus, Settings, BarChart3, Download, FileText } from 'lucide-react';

export default function ModernStyleDemo() {
  // Add global immersive UI effects
  useEffect(() => {
    // Add smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Add subtle background pattern with dynamic style element
    const style = document.createElement('style');
    style.textContent = `
      body::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: 
          radial-gradient(circle at 25px 25px, rgba(0, 100, 255, 0.015) 2%, transparent 0%),
          radial-gradient(circle at 75px 75px, rgba(0, 100, 255, 0.01) 2%, transparent 0%);
        background-size: 100px 100px;
        pointer-events: none;
        z-index: -1;
      }
      
      :focus-visible {
        outline: 2px solid rgba(37, 99, 235, 0.5);
        outline-offset: 2px;
        transition: outline-offset 0.1s ease;
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup function
    return () => {
      document.documentElement.style.scrollBehavior = '';
      document.head.removeChild(style);
    };
  }, []);
  return (
    <ModernLayout>
      {/* UI enhancements added through Tailwind classes instead of inline styles */}
      
      <div className="space-y-8">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200/30 relative">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">Modern Design System</h1>
            <p className="text-slate-500 mt-2 max-w-2xl">
              Benton County's immersive UI component library with smooth transitions and depth effects
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="backdrop-blur-sm bg-white/40 border-slate-200/50 transition-all hover:shadow-md hover:border-blue-200">
              <FileText className="mr-2 h-4 w-4" />
              Documentation
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-300">
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <Card className="transition-all duration-300 hover:shadow-xl hover:translate-y-[-3px] rounded-xl border-slate-200/40 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl shadow-md">
                  <CardHeader className="pb-2 border-b border-slate-100/50">
                    <CardTitle className="flex items-center text-blue-800">
                      <div className="p-2 rounded-full bg-blue-50 mr-3">
                        <BarChart3 className="h-5 w-5 text-blue-500" />
                      </div>
                      Quick Analysis
                    </CardTitle>
                    <CardDescription>Overview of current assessments</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">$4.5M</div>
                    <p className="text-sm text-emerald-600 font-medium flex items-center mt-1">
                      <Check size={14} className="mr-1" /> 12% increase from previous period
                    </p>
                  </CardContent>
                  <CardFooter className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-t border-slate-200/50 rounded-b-xl">
                    <Button variant="ghost" size="sm" className="w-full transition-all hover:bg-blue-100/50 text-blue-700">
                      <BarChart3 className="mr-2 h-4 w-4" /> View Report
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card className="transition-all duration-300 hover:shadow-xl hover:translate-y-[-3px] rounded-xl border-slate-200/40 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl shadow-md">
                  <CardHeader className="pb-2 border-b border-slate-100/50">
                    <CardTitle className="flex items-center text-orange-800">
                      <div className="p-2 rounded-full bg-orange-50 mr-3">
                        <Plus className="h-5 w-5 text-orange-500" />
                      </div>
                      Pending Tasks
                    </CardTitle>
                    <CardDescription>Items awaiting your action</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-amber-600">7 Tasks</div>
                    <p className="text-sm text-amber-600 font-medium flex items-center mt-1">
                      2 high priority items need attention
                    </p>
                  </CardContent>
                  <CardFooter className="bg-gradient-to-r from-orange-50/50 to-amber-50/50 border-t border-slate-200/50 rounded-b-xl">
                    <Button variant="ghost" size="sm" className="w-full transition-all hover:bg-orange-100/50 text-amber-700">
                      <Plus className="mr-2 h-4 w-4" /> Process Queue
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card className="transition-all duration-300 hover:shadow-xl hover:translate-y-[-3px] rounded-xl border-slate-200/40 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl shadow-md">
                  <CardHeader className="pb-2 border-b border-slate-100/50">
                    <CardTitle className="flex items-center text-emerald-800">
                      <div className="p-2 rounded-full bg-emerald-50 mr-3">
                        <Settings className="h-5 w-5 text-emerald-500" />
                      </div>
                      System Status
                    </CardTitle>
                    <CardDescription>All systems operational</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-600">100%</div>
                    <p className="text-sm text-emerald-600 font-medium flex items-center mt-1">
                      <Check size={14} className="mr-1" /> All services running normally
                    </p>
                  </CardContent>
                  <CardFooter className="bg-gradient-to-r from-emerald-50/50 to-green-50/50 border-t border-slate-200/50 rounded-b-xl">
                    <Button variant="ghost" size="sm" className="w-full transition-all hover:bg-emerald-100/50 text-emerald-700">
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
              
              <Card className="rounded-xl overflow-hidden border-slate-200/40 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl shadow-md">
                <CardHeader className="border-b border-slate-100/50 bg-gradient-to-r from-blue-50/30 to-indigo-50/30">
                  <CardTitle className="text-blue-800">Process Timeline</CardTitle>
                  <CardDescription>Current status: Certification in progress</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 pb-8">
                  <div className="flex items-center justify-between max-w-4xl mx-auto px-4 relative">
                    {/* Progress line behind the steps - showing completion */}
                    <div className="absolute top-[22px] left-12 right-12 h-1 bg-gray-200 rounded-full"></div>
                    <div className="absolute top-[22px] left-12 w-[60%] h-1 bg-gradient-to-r from-green-500 to-blue-500 rounded-full 
                                    shadow-[0_0_10px_rgba(0,200,83,0.5)]"></div>
                    
                    {/* Step 1: Completed */}
                    <div className="flex flex-col items-center z-10">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-green-600 
                                      flex items-center justify-center text-white shadow-lg shadow-green-200/50
                                      transition-transform duration-300 hover:scale-110">
                        <Check size={20} className="text-white" />
                      </div>
                      <div className="text-sm font-medium mt-3 text-green-800">Filing</div>
                      <div className="text-xs text-gray-500">Completed</div>
                    </div>
                    
                    {/* Step 2: Completed */}
                    <div className="flex flex-col items-center z-10">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-green-600 
                                      flex items-center justify-center text-white shadow-lg shadow-green-200/50
                                      transition-transform duration-300 hover:scale-110">
                        <Check size={20} className="text-white" />
                      </div>
                      <div className="text-sm font-medium mt-3 text-green-800">Review</div>
                      <div className="text-xs text-gray-500">Completed</div>
                    </div>
                    
                    {/* Step 3: Current */}
                    <div className="flex flex-col items-center z-10">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 
                                      flex items-center justify-center text-white shadow-lg shadow-blue-200/50
                                      animate-pulse transition-transform duration-300 hover:scale-110 relative">
                        <span className="font-bold">3</span>
                        {/* Pulsing ring effect */}
                        <span className="absolute w-full h-full rounded-full bg-blue-400/20 animate-ping"></span>
                      </div>
                      <div className="text-sm font-medium mt-3 text-blue-800">Certification</div>
                      <div className="text-xs text-blue-600">In Progress</div>
                    </div>
                    
                    {/* Step 4: Pending */}
                    <div className="flex flex-col items-center z-10">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-300
                                      flex items-center justify-center text-gray-600 border border-gray-200
                                      transition-transform duration-300 hover:scale-110">
                        <span className="font-bold">4</span>
                      </div>
                      <div className="text-sm font-medium mt-3 text-gray-500">Final Approval</div>
                      <div className="text-xs text-gray-400">Pending</div>
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
              
              <Card className="rounded-xl border-slate-200/40 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl shadow-md overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-slate-200/50">
                  <CardTitle className="flex items-center text-blue-800">
                    <div className="p-2 rounded-full bg-blue-50 mr-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    Property Assessment Impact
                  </CardTitle>
                  <CardDescription>Analysis of tax changes by property</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-50/30 to-indigo-50/30 border-b border-slate-200/70">
                          <th className="text-left p-4 font-medium text-blue-800">Property ID</th>
                          <th className="text-right p-4 font-medium text-blue-800">Value</th>
                          <th className="text-right p-4 font-medium text-blue-800">Prev. Tax</th>
                          <th className="text-right p-4 font-medium text-blue-800">New Tax</th>
                          <th className="text-right p-4 font-medium text-blue-800">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100/50 transition-colors hover:bg-blue-50/20">
                          <td className="p-4 text-blue-900 font-medium">P001</td>
                          <td className="p-4 text-right text-slate-700">$450,000</td>
                          <td className="p-4 text-right text-slate-700">$675.00</td>
                          <td className="p-4 text-right text-slate-700">$671.40</td>
                          <td className="p-4 text-right text-emerald-600 font-medium">-0.53%</td>
                        </tr>
                        <tr className="border-b border-slate-100/50 transition-colors hover:bg-blue-50/20">
                          <td className="p-4 text-blue-900 font-medium">P002</td>
                          <td className="p-4 text-right text-slate-700">$375,000</td>
                          <td className="p-4 text-right text-slate-700">$562.50</td>
                          <td className="p-4 text-right text-slate-700">$559.50</td>
                          <td className="p-4 text-right text-emerald-600 font-medium">-0.53%</td>
                        </tr>
                        <tr className="border-b border-slate-100/50 transition-colors hover:bg-blue-50/20">
                          <td className="p-4 text-blue-900 font-medium">P003</td>
                          <td className="p-4 text-right text-slate-700">$520,000</td>
                          <td className="p-4 text-right text-slate-700">$780.00</td>
                          <td className="p-4 text-right text-slate-700">$775.84</td>
                          <td className="p-4 text-right text-emerald-600 font-medium">-0.53%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
                <CardFooter className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-t border-slate-200/50 flex justify-between py-4">
                  <span className="text-sm text-slate-500 flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                    Showing 3 of 120 properties
                  </span>
                  <Button variant="ghost" size="sm" className="text-blue-700 hover:bg-blue-100/50 transition-colors">
                    View All Properties <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </section>
            
            <section className="mt-8 space-y-3">
              <h2 className="text-2xl font-semibold">Metric Cards</h2>
              <p className="text-slate-500 dark:text-slate-400">
                Analytics-focused metric displays with trend indicators
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <Card className="rounded-xl border-slate-200/40 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px]">
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="p-2 rounded-full bg-emerald-50 mr-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-emerald-500">
                            <path d="M12 4V20M18 10L12 4L6 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span className="text-slate-500 text-sm font-medium">Average Change</span>
                      </div>
                      <div className="text-xs text-slate-400">Last 30 days</div>
                    </div>
                    <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-600">-0.8%</div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                      <div className="text-emerald-600 text-xs font-medium flex items-center">
                        <Check size={14} className="mr-1" /> Below Threshold
                      </div>
                      <span className="text-xs text-slate-400">Target: less than 1.0%</span>
                    </div>
                  </div>
                </Card>
                
                <Card className="rounded-xl border-slate-200/40 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px]">
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="p-2 rounded-full bg-blue-50 mr-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-500">
                            <path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span className="text-slate-500 text-sm font-medium">Max Impact</span>
                      </div>
                      <div className="text-xs text-slate-400">Per Household</div>
                    </div>
                    <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">$14.56</div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                      <div className="text-blue-600 text-xs font-medium flex items-center">
                        <Check size={14} className="mr-1" /> Residential
                      </div>
                      <span className="text-xs text-slate-400">Approved</span>
                    </div>
                  </div>
                </Card>
                
                <Card className="rounded-xl border-slate-200/40 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px]">
                  <div className="absolute top-0 left-0 w-full h-1 bg-violet-500"></div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="p-2 rounded-full bg-violet-50 mr-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-violet-500">
                            <path d="M12 8V16M8 12H16M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span className="text-slate-500 text-sm font-medium">Revenue Change</span>
                      </div>
                      <div className="text-xs text-slate-400">District Total</div>
                    </div>
                    <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-purple-600">+$15,750</div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                      <div className="text-violet-600 text-xs font-medium flex items-center">
                        <Check size={14} className="mr-1" /> From New Construction
                      </div>
                      <span className="text-xs text-slate-400">Not subject to limit</span>
                    </div>
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
              
              <Card className="rounded-xl border-slate-200/40 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl shadow-md overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-slate-200/50">
                  <CardTitle className="flex items-center text-blue-800">
                    <div className="p-2 rounded-full bg-blue-50 mr-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-500">
                        <path d="M9 7H6C5.46957 7 4.96086 7.21071 4.58579 7.58579C4.21071 7.96086 4 8.46957 4 9V18C4 18.5304 4.21071 19.0391 4.58579 19.4142C4.96086 19.7893 5.46957 20 6 20H15C15.5304 20 16.0391 19.7893 16.4142 19.4142C16.7893 19.0391 17 18.5304 17 18V15M9 15H12L20.5 6.5C20.8978 6.10217 21.1213 5.56261 21.1213 5C21.1213 4.43739 20.8978 3.89782 20.5 3.5C20.1022 3.10217 19.5626 2.87868 19 2.87868C18.4374 2.87868 17.8978 3.10217 17.5 3.5L9 12V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 5L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    Rate Calculation Input
                  </CardTitle>
                  <CardDescription>Entry fields with enhanced styling for clarity</CardDescription>
                </CardHeader>
                
                <CardContent className="px-4 sm:px-6 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="spreadsheet-section rounded-lg bg-gradient-to-br from-blue-50/30 to-white p-5 border border-slate-200/50 shadow-sm">
                        <h3 className="text-md font-medium mb-4 text-blue-800 flex items-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-500 mr-2">
                            <path d="M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21M19 21H5M19 21H21M5 21H3M9 7H15M9 11H15M9 15H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          District Information
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-5">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600">Levy Year</label>
                            <div className="flex">
                              <Input 
                                type="number" 
                                defaultValue="2023" 
                                className="rounded-md border-slate-200 bg-white/70 focus:border-blue-400 focus:ring-blue-400/20 transition-all"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600">Previous Rate</label>
                            <div className="flex">
                              <Input 
                                type="text" 
                                defaultValue="1.5000" 
                                className="rounded-md border-slate-200 bg-white/70 focus:border-blue-400 focus:ring-blue-400/20 transition-all"
                              />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Rate per $1,000 assessed value</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="spreadsheet-section rounded-lg bg-gradient-to-br from-indigo-50/30 to-white p-5 border border-slate-200/50 shadow-sm">
                        <h3 className="text-md font-medium mb-4 text-indigo-800 flex items-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-indigo-500 mr-2">
                            <path d="M16 8V16M12 11V16M8 14V16M4 20H20C20.5304 20 21.0391 19.7893 21.4142 19.4142C21.7893 19.0391 22 18.5304 22 18V6C22 5.46957 21.7893 4.96086 21.4142 4.58579C21.0391 4.21071 20.5304 4 20 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V18C2 18.5304 2.21071 19.0391 2.58579 19.4142C2.96086 19.7893 3.46957 20 4 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Calculation Results
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-5">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600">Certified Amount</label>
                            <div className="flex">
                              <Input 
                                type="text"
                                defaultValue="2,500,000.00" 
                                className="rounded-md border-slate-200 bg-white/70 focus:border-indigo-400 focus:ring-indigo-400/20 transition-all"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600">Calculated Rate</label>
                            <div className="flex items-center">
                              <Input 
                                type="text" 
                                value="1.4920" 
                                readOnly 
                                className="rounded-md font-semibold border-0 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 shadow-inner"
                              />
                              <span className="ml-3 text-sm text-slate-600">per $1,000</span>
                            </div>
                            <p className="text-xs flex items-center mt-1 text-emerald-600">
                              <Check size={12} className="mr-1" /> 
                              Below statutory limit
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-t border-slate-200/50 flex justify-end gap-3 py-4">
                  <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-100/50 transition-all">
                    Save as Draft
                  </Button>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-300">
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