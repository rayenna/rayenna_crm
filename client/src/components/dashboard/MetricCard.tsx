import { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  gradient?: string
  iconColor?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

const MetricCard = ({ title, value, icon, gradient, trend }: MetricCardProps) => {
  const defaultGradient = gradient || 'from-primary-500 to-primary-600'

  return (
    <div className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden border-2 border-transparent hover:border-primary-200 animate-slide-up transform hover:-translate-y-2 min-w-0">
      {/* Animated Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${defaultGradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
      
      {/* Animated Decorative Elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary-300/30 to-transparent rounded-bl-full transform group-hover:scale-110 transition-transform duration-500"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-primary-200/30 to-transparent rounded-tr-full transform group-hover:scale-110 transition-transform duration-500"></div>
      
      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      
      <div className="relative p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className={`p-3 sm:p-4 rounded-2xl bg-gradient-to-br ${defaultGradient} shadow-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative overflow-hidden flex-shrink-0`}>
            {/* Icon glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${defaultGradient} opacity-50 blur-xl`}></div>
            <div className="relative text-white text-xl sm:text-2xl lg:text-3xl transform group-hover:scale-110 transition-transform duration-300">
              {icon}
            </div>
          </div>
          {trend && (
            <div className={`flex items-center px-3 py-1.5 rounded-full text-sm font-bold shadow-md ${
              trend.isPositive 
                ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white' 
                : 'bg-gradient-to-r from-red-400 to-rose-500 text-white'
            }`}>
              <span className="mr-1">{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2 min-w-0 flex-1">
          <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent group-hover:from-primary-700 group-hover:via-primary-600 group-hover:to-primary-700 transition-all duration-300 break-words leading-tight">
            <span className="block" title={String(value)}>{value}</span>
          </div>
          <div className="text-xs sm:text-sm font-semibold text-gray-600 group-hover:text-primary-600 transition-colors" title={title}>{title}</div>
        </div>
      </div>
    </div>
  )
}

export default MetricCard
