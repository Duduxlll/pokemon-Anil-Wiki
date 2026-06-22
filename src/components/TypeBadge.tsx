import Image from "next/image";
import { PokemonTypeName } from "@/lib/types";
import { TYPE_COLORS, TYPE_LABELS_PT, typeIconUrl } from "@/lib/typeMeta";

const SIZES = {
  sm: { icon: 26, padding: "pl-1 pr-2.5 py-1", text: "text-[10px]", gap: "gap-1" },
  md: { icon: 36, padding: "pl-1.5 pr-3.5 py-1.5", text: "text-xs", gap: "gap-1.5" },
};

export default function TypeBadge({
  type,
  size = "md",
}: {
  type: PokemonTypeName;
  size?: "sm" | "md";
}) {
  const color = TYPE_COLORS[type];
  const { icon, padding, text, gap } = SIZES[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium text-white shadow-sm ${padding} ${gap}`}
      style={{ backgroundColor: color }}
    >
      <Image
        src={typeIconUrl(type)}
        alt={TYPE_LABELS_PT[type]}
        width={icon}
        height={icon}
        className="rounded-md shadow"
        unoptimized
      />
      <span className={text}>{TYPE_LABELS_PT[type]}</span>
    </span>
  );
}
