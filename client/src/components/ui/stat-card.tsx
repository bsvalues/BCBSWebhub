import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
    text: string;
  };
  iconBgColor: string;
}

export function StatCard({ title, value, icon, trend, iconBgColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-neutral-500 text-sm font-medium">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
        </div>
        <div className={`${iconBgColor} bg-opacity-10 p-2 rounded-lg`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className={`mt-2 flex items-center text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
          <span className="material-icons text-sm mr-1">
            {trend.isPositive ? 'arrow_upward' : 'arrow_downward'}
          </span>
          <span>{trend.text}</span>
        </div>
      )}
    </div>
  );
}
