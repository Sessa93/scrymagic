import Image from "next/image";

interface ManaSymbolProps {
  symbol: string;
  svgUri?: string | null;
  label?: string;
  className?: string;
}

export default function ManaSymbol({
  symbol,
  svgUri,
  label,
  className,
}: ManaSymbolProps) {
  const baseClassName = className ?? "mx-0.5 inline-block h-5 w-5 align-middle";

  if (svgUri) {
    return (
      <Image
        src={svgUri}
        alt={label ?? symbol}
        title={label ?? symbol}
        width={20}
        height={20}
        unoptimized
        className={baseClassName}
      />
    );
  }

  return (
    <span
      aria-label={label ?? symbol}
      title={label ?? symbol}
      className={`${baseClassName} inline-flex items-center justify-center rounded-full bg-surface px-1 text-[10px] font-semibold text-foreground ring-1 ring-inset ring-card-border`}
    >
      {symbol.replace(/[{}]/g, "")}
    </span>
  );
}
