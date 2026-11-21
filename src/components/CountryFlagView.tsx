import React, { useMemo, useState } from 'react';
import { Shield, User } from 'lucide-react';
import { CountryFlagAsset } from '../countries/countryTypes';
import { sanitizeAssetUrl, sanitizeSvg } from '../packs/packSchema';

interface CountryFlagViewProps {
  flag?: CountryFlagAsset;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CountryFlagView({ flag, alt, size = 'md' }: CountryFlagViewProps) {
  const [imgError, setImgError] = useState(false);

  const dims =
    size === 'sm'
      ? 'w-7 h-5 rounded'
      : size === 'lg'
        ? 'w-16 h-11 rounded-md'
        : 'w-11 h-7 rounded';

  const safeSrc = useMemo(() => {
    if (!flag) return null;
    if (flag.mode === 'svg' && flag.svg) {
      const safe = sanitizeSvg(flag.svg);
      return safe ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(safe)}` : null;
    }
    if (flag.mode === 'image' && flag.imageUrl) {
      return sanitizeAssetUrl(flag.imageUrl);
    }
    return null;
  }, [flag]);

  if (flag?.mode === 'emoji' && flag.emoji) {
    return (
      <span
        aria-label={alt}
        className={`${dims} inline-flex items-center justify-center bg-slate-800 border border-slate-700 text-lg leading-none shrink-0 select-none`}
      >
        {flag.emoji}
      </span>
    );
  }

  if (safeSrc && !imgError) {
    return (
      <img
        src={safeSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${dims} object-cover border border-slate-700 bg-slate-900 shrink-0`}
      />
    );
  }

  return (
    <span
      aria-label={alt}
      className={`${dims} inline-flex items-center justify-center bg-slate-800 border border-slate-700 text-slate-400 shrink-0`}
    >
      {flag?.emoji ? <span className="text-base leading-none">{flag.emoji}</span> : <Shield className="w-4 h-4" />}
    </span>
  );
}

interface LeaderPortraitViewProps {
  name: string;
  portraitSvg?: string;
  portraitUrl?: string;
}

export function LeaderPortraitView({ name, portraitSvg, portraitUrl }: LeaderPortraitViewProps) {
  const [err, setErr] = useState(false);
  const src = useMemo(() => {
    if (portraitSvg) {
      const safe = sanitizeSvg(portraitSvg);
      if (safe) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(safe)}`;
    }
    if (portraitUrl) {
      return sanitizeAssetUrl(portraitUrl);
    }
    return null;
  }, [portraitSvg, portraitUrl]);

  if (src && !err) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setErr(true)}
        className="w-11 h-11 rounded-md object-cover border border-slate-700 bg-slate-900 shrink-0"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="w-11 h-11 rounded-md border border-slate-700 bg-slate-800/90 flex items-center justify-center text-sky-300 shrink-0"
    >
      <User className="w-5 h-5" />
    </div>
  );
}
