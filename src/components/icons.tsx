import type { SVGProps } from "react";

export function PokeballIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...props}>
      <circle cx="12" cy="12" r="10" fill="#fff" stroke="#0b1437" strokeWidth="1.4" />
      <path d="M2.2 12a9.8 9.8 0 0 1 19.6 0Z" fill="#ef4444" stroke="#0b1437" strokeWidth="1.4" />
      <line x1="2.2" y1="12" x2="8.2" y2="12" stroke="#0b1437" strokeWidth="1.4" />
      <line x1="15.8" y1="12" x2="21.8" y2="12" stroke="#0b1437" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="3.2" fill="#fff" stroke="#0b1437" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="1.3" fill="#0b1437" />
    </svg>
  );
}

export function DropIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...props}>
      <path
        d="M12 2.5c4 5 6.5 8.2 6.5 11.4A6.5 6.5 0 0 1 5.5 13.9C5.5 10.7 8 7.5 12 2.5Z"
        fill="#38bdf8"
        stroke="#0b1437"
        strokeWidth="1.2"
      />
      <path d="M9.2 13.6a2.8 2.8 0 0 0 2.3 3" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function StarIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...props}>
      <path
        d="M12 2.6l2.74 5.56 6.14.9-4.44 4.33 1.05 6.11L12 17.9l-5.49 2.6 1.05-6.11L3.12 9.96l6.14-.9L12 2.6Z"
        fill="#fbbf24"
        stroke="#0b1437"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MapIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...props}>
      <path
        d="M12 2.5c-3.3 0-6 2.6-6 5.9 0 4.2 6 12.1 6 12.1s6-7.9 6-12.1c0-3.3-2.7-5.9-6-5.9Z"
        fill="#34d399"
        stroke="#0b1437"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="8.4" r="2.3" fill="#fff" stroke="#0b1437" strokeWidth="1.2" />
    </svg>
  );
}

export function TeamIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...props}>
      <circle cx="8.5" cy="12" r="6.4" fill="#fff" stroke="#0b1437" strokeWidth="1.3" />
      <path d="M2.3 12a6.2 6.2 0 0 1 12.4 0Z" fill="#a855f7" stroke="#0b1437" strokeWidth="1.3" />
      <line x1="2.3" y1="12" x2="5.6" y2="12" stroke="#0b1437" strokeWidth="1.3" />
      <line x1="11.4" y1="12" x2="14.7" y2="12" stroke="#0b1437" strokeWidth="1.3" />
      <circle cx="8.5" cy="12" r="2.1" fill="#fff" stroke="#0b1437" strokeWidth="1.3" />
      <circle cx="17.5" cy="9" r="4.6" fill="#fff" stroke="#0b1437" strokeWidth="1.2" opacity="0.92" />
      <path d="M13 9a4.5 4.5 0 0 1 9 0Z" fill="#ef4444" stroke="#0b1437" strokeWidth="1.2" opacity="0.92" />
      <circle cx="17.5" cy="9" r="1.5" fill="#fff" stroke="#0b1437" strokeWidth="1.2" opacity="0.92" />
    </svg>
  );
}
