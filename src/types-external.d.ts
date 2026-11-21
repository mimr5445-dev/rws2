/// <reference types="vite/client" />
declare module 'world-atlas/*.json' {
  const value: unknown;
  export default value;
}

declare module 'i18n-iso-countries/langs/*.json' {
  const value: {
    locale: string;
    countries: Record<string, string | string[]>;
  };
  export default value;
}
