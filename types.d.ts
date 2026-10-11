declare module 'express' {
  const express: any;
  export default express;
}

declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(options?: any);
    models: any;
  }

  export const ThinkingLevel: any;
}
