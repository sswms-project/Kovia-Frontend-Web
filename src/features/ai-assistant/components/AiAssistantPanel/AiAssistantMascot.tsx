import { cn } from '@/lib/utils'

interface AiAssistantMascotProps {
  readonly size?: 'sm' | 'md' | 'lg'
}

export function AiAssistantMascot({ size = 'md' }: AiAssistantMascotProps) {
  const dimensions = { sm: 'size-7', md: 'size-9', lg: 'size-15' }[size]
  const face = { sm: 'h-3.5 w-4.5 gap-1', md: 'h-4.5 w-5.5 gap-1', lg: 'h-7.5 w-10 gap-2' }[size]
  const eye = { sm: 'size-0.5', md: 'size-1', lg: 'size-1.5' }[size]
  const sensor = size === 'lg' ? 'size-2' : 'size-1'
  const antenna = size === 'lg' ? '-top-2 h-2.5' : '-top-1 h-1.5'
  const antennaLight = size === 'lg' ? '-top-3 size-2' : '-top-1.5 size-1'
  const cornerLight = size === 'lg' ? 'bottom-1.5 left-1.5 size-1' : 'bottom-0.5 left-1 h-1 w-1'
  const rightCornerLight =
    size === 'lg' ? 'right-1.5 bottom-1.5 size-1' : 'right-1 bottom-0.5 h-1 w-1'

  return (
    <span
      className={cn(
        dimensions,
        'border-primary/35 bg-primary-container relative flex shrink-0 items-center justify-center rounded-[0.75rem] border shadow-[inset_-5px_-5px_0_color-mix(in_oklab,var(--primary)_32%,transparent),0_10px_18px_color-mix(in_oklab,var(--primary)_24%,transparent)]'
      )}
      style={{ transform: 'perspective(140px) rotateX(7deg) rotateY(-9deg)' }}
      aria-hidden="true"
    >
      <span className="bg-primary/65 absolute top-2 -right-1 bottom-2 w-1 rounded-r-sm" />
      <span className="bg-primary/45 absolute right-2 -bottom-1 left-2 h-1 rounded-b-sm" />
      <span className={cn('bg-primary absolute w-px', antenna)} />
      <span
        className={cn(
          'bg-tertiary absolute rounded-full shadow-[0_0_8px_var(--tertiary)]',
          antennaLight
        )}
      />
      <span
        className={cn(
          'border-tertiary-foreground/15 bg-tertiary text-tertiary-foreground relative flex items-center justify-center rounded-[0.35rem] border shadow-[inset_-3px_-3px_0_color-mix(in_oklab,var(--on-tertiary-container)_32%,transparent)]',
          face
        )}
      >
        <span className={cn('rounded-full bg-current', eye)} />
        <span className={cn('rounded-full bg-current', eye)} />
        <span className="bg-tertiary-foreground/80 absolute bottom-1 h-px w-1/3 rounded-full" />
      </span>
      <span className={cn('bg-primary/70 absolute rounded-[2px]', cornerLight)} />
      <span className={cn('bg-primary/70 absolute rounded-[2px]', rightCornerLight)} />
      {size === 'lg' ? (
        <>
          <span className={cn('bg-primary absolute top-2 left-1.5 rounded-full', sensor)} />
          <span className={cn('bg-primary absolute right-1.5 bottom-3 rounded-full', sensor)} />
        </>
      ) : null}
    </span>
  )
}
