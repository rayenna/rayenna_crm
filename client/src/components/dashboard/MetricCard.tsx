import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

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
  to?: string
}

const MetricCard = ({ title, value, icon, gradient, trend, to }: MetricCardProps) => {
  const defaultGradient = gradient || 'from-primary-500 to-primary-600'
  const baseClassName = 'group relative bg-white rounded-2xl shadow-sm hover:shadow-lg overflow-hidden border border-slate-200/80 hover:border-primary-300/60 animate-slide-up min-w-0 transition-all duration-300 motion-reduce:transition-none'
  const cardClassName = to ? `${baseClassName} block no-underline text-inherit cursor-pointer` : baseClassName

  const content = (
    <>
      {/* Subtle premium hover wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/20 via-transparent to-amber-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Decorative glow */}
      <div className="absolute -top-14 -right-12 h-32 w-32 rounded-full bg-primary-100/50 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Shimmer */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-primary-100/30 to-transparent motion-reduce:transition-none" />
      
      <div className="relative p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className={`p-3 sm:p-3.5 rounded-xl bg-gradient-to-br ${defaultGradient} shadow-md group-hover:scale-105 transition-transform duration-300 relative overflow-hidden flex-shrink-0 motion-reduce:transition-none`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${defaultGradient} opacity-20 blur-sm`} />
            <div className="relative text-white text-xl sm:text-2xl lg:text-[1.6rem] group-hover:scale-105 transition-transform duration-300">
              {icon}
            </div>
          </div>
          {trend && (
            <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm border ${
              trend.isPositive 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <span className="mr-1">{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2 min-w-0 flex-1">
          <div className="text-xl sm:text-2xl lg:text-3xl xl:text-[2rem] font-extrabold text-slate-900 group-hover:text-primary-800 transition-colors duration-300 break-words leading-tight">
            <span className="block" title={String(value)}>{value}</span>
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-500 group-hover:text-primary-700 transition-colors duration-200" title={title}>{title}</div>
          {to && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pt-0.5">
              <span>View projects</span>
              <span aria-hidden>→</span>
            </div>
          )}
        </div>
      </div>
    </>
  )

  if (to) {
    return <Link to={to} className={cardClassName}>{content}</Link>
  }
  return <div className={cardClassName}>{content}</div>
}

export default MetricCard
