import { useLocation } from "wouter";

type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  const [location] = useLocation();
  
  return (
    <header className="bg-white shadow-sm flex-shrink-0 hidden md:block">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <h2 className="text-lg font-medium">{title}</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="material-icons text-neutral-400 text-sm">search</span>
            </span>
            <input type="text" placeholder="Search audits..." className="py-2 pl-10 pr-4 w-64 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          
          <button className="p-2 rounded-full hover:bg-neutral-100 relative">
            <span className="material-icons">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
          </button>
          
          <button className="p-2 rounded-full hover:bg-neutral-100">
            <span className="material-icons">help_outline</span>
          </button>
        </div>
      </div>
    </header>
  );
}
