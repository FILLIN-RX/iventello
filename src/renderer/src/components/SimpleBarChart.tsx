interface Props {
  data: { label: string; value: number; color?: string }[]
  height?: number
}

const defaultColors = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-violet-500', 'bg-cyan-500', 'bg-orange-500'
]

export function SimpleBarChart({ data, height = 180 }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((item, i) => {
          const pct = (item.value / max) * 100
          const color = item.color ?? defaultColors[i % defaultColors.length]
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1 h-full justify-end">
              <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                {item.value > 0 ? item.value.toLocaleString('fr-FR') : ''}
              </span>
              <div
                className={`w-full rounded-t ${color} transition-all duration-500`}
                style={{ height: `${Math.max(pct, 1)}%`, minHeight: item.value > 0 ? '4px' : '0px' }}
                title={`${item.label}: ${item.value}`}
              />
              <span className="text-[9px] text-muted-foreground/60 truncate w-full text-center">{item.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
