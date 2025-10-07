/**
 * 개발 전용 로거
 * 프로덕션 환경에서는 자동으로 비활성화됩니다.
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  warn: (...args: any[]) => {
    // 경고는 프로덕션에서도 출력
    console.warn(...args);
  },

  error: (...args: any[]) => {
    // 에러는 프로덕션에서도 출력
    console.error(...args);
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

// 브라우저 환경용 로거
export const clientLogger = {
  log: (...args: any[]) => {
    if (typeof window !== 'undefined' && isDevelopment) {
      console.log(...args);
    }
  },

  error: (...args: any[]) => {
    if (typeof window !== 'undefined') {
      console.error(...args);
    }
  },
};
