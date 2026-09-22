declare module "google-translate-api-browser" {
  export type LangKey = string;

  export type TranslationResult = {
    text: string;
    pronunciation?: string | null;
    from?: {
      language?: { didYouMean?: boolean; iso?: string };
      text?: {
        pronunciation?: string | null;
        autoCorrected?: boolean;
        value?: string;
        didYouMean?: string | null;
      };
    };
    raw?: unknown;
  };

  export type TranslateOptions = {
    from?: LangKey;
    to?: LangKey;
    hl?: LangKey;
    tld?: string;
    rpcids?: string;
    corsUrl?: string;
    raw?: boolean;
  };

  export function translate(
    text: string,
    options?: Partial<TranslateOptions>
  ): Promise<TranslationResult>;

  export function generateRequestUrl(
    text: string,
    options?: Partial<TranslateOptions>
  ): string;

  export function normaliseResponse(body: unknown, raw?: boolean): TranslationResult;

  export default translate;
}
