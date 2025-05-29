// src/types/styles.ts
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