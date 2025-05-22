// src/types/styles.ts
export interface RenditionTheme {
  themes: {
    register: (name: string, styles: string) => void;
    select: (name: string) => void;
    unregister?: (name: string) => void;
    update?: (name: string) => void;
    override: (property: string, value: string | object) => void;
    fontSize: (size: string) => void;
  };
  views?: () => Array<any>;
  next?: () => void;
  prev?: () => void;
  [key: string]: any;
}

export interface StylesOptions {
  initialTextColor?: string;
  initialBackgroundColor?: string;
  initialAccentColor?: string;
  initialFontFamily?: string;
  initialFontSize?: string;
  onStyleChange?: (
    textColor: string, 
    backgroundColor: string, 
    accentColor: string,
    fontFamily: string,
    fontSize: string
  ) => void;
}

export interface FontOption {
  label: string;
  value: string;
}

export interface PresetOption {
  name: string;
  value: string;
  bgColor: string;
  textColor: string;
}