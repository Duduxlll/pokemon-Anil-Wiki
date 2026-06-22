import Image from "next/image";

const DEFAULT_TINT =
  "linear-gradient(180deg, rgba(7,11,31,0.30) 0%, rgba(7,11,31,0.45) 55%, rgba(5,6,15,0.82) 100%)";

export default function PageBackground({
  src,
  objectPosition = "center",
  tint,
  fit = "cover",
}: {
  src: string;
  objectPosition?: string;
  tint?: string;
  fit?: "cover" | "contain";
}) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Preenche as sobras com a própria imagem borrada (sem buracos vazios) */}
      {fit === "contain" && (
        <Image
          src={src}
          alt=""
          fill
          sizes="100vw"
          aria-hidden
          className="scale-125 object-cover opacity-70 blur-2xl"
          unoptimized
        />
      )}
      {/* Imagem principal: inteira (contain) ou cobrindo (cover) */}
      <Image
        src={src}
        alt=""
        fill
        priority
        sizes="100vw"
        className={fit === "contain" ? "object-contain" : "object-cover"}
        style={{ objectPosition }}
        unoptimized
      />
      <div className="absolute inset-0" style={{ background: tint ?? DEFAULT_TINT }} />
    </div>
  );
}
