export type ApiError =
  | { readonly kind: 'network'; readonly message: string }
  | { readonly kind: 'http'; readonly status: number; readonly message: string }
  | {
      readonly kind: 'validation';
      readonly errors: Readonly<Record<string, readonly string[]>>;
    };

export const formatApiError = (error: ApiError): string => {
  switch (error.kind) {
    case 'network':
      return `Сетевая ошибка: ${error.message}`;
    case 'http':
      return `Ошибка HTTP ${error.status}: ${error.message}`;
    case 'validation':
      return 'Ошибка валидации';
  }
};