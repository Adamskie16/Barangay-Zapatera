/// <reference types="vite/client" />

declare module '*.css';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.gif';
declare module 'react-dom/client';

declare const process: {
  env: Record<string, string | undefined>;
};

