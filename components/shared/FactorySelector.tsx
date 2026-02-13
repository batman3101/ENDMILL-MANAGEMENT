'use client'

import { useFactory } from '@/lib/hooks/useFactory'
import { Factory, FACTORY_COLORS } from '@/lib/types/factory'
import { cn } from '@/lib/utils'
import { Building2 } from 'lucide-react'

interface FactorySelectorProps {
  compact?: boolean
  showLabel?: boolean
  className?: string
}

export function FactorySelector({ compact = false, showLabel = true, className }: FactorySelectorProps) {
  const { currentFactory, accessibleFactories, setCurrentFactory, isLoading } = useFactory()

  if (isLoading || !currentFactory) {
    return (
      <div className={cn("animate-pulse bg-gray-200 rounded-lg", compact ? "h-8 w-16" : "h-10 w-32", className)} />
    )
  }

  // 공장이 1개뿐이면 토글 불필요
  if (accessibleFactories.length <= 1) {
    const colors = FACTORY_COLORS[currentFactory.code as keyof typeof FACTORY_COLORS] || FACTORY_COLORS.ALT
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-white",
        colors.bg,
        compact ? "text-xs" : "text-sm",
        className
      )}>
        <Building2 className={compact ? "h-3 w-3" : "h-4 w-4"} />
        {showLabel && <span>{compact ? currentFactory.code : currentFactory.name_ko}</span>}
      </div>
    )
  }

  const handleSwitch = (factory: Factory) => {
    if (factory.id !== currentFactory.id) {
      setCurrentFactory(factory)
    }
  }

  return (
    <div className={cn(
      "flex items-center rounded-lg bg-gray-100 p-1",
      className
    )}>
      {accessibleFactories.map((factory) => {
        const isActive = factory.id === currentFactory.id
        const colors = FACTORY_COLORS[factory.code as keyof typeof FACTORY_COLORS] || FACTORY_COLORS.ALT

        return (
          <button
            key={factory.id}
            onClick={() => handleSwitch(factory)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all duration-200",
              compact ? "text-xs" : "text-sm",
              isActive
                ? `${colors.bg} text-white shadow-sm`
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
            )}
          >
            <Building2 className={compact ? "h-3 w-3" : "h-4 w-4"} />
            {showLabel && (
              <span>{compact ? factory.code : factory.name_ko}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
