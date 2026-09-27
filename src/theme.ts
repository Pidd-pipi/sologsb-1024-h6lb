import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false
};

export const theme = extendTheme({
  config,
  fonts: {
    heading: '"Noto Sans SC", "PingFang SC", sans-serif',
    body: '"Noto Sans SC", "PingFang SC", sans-serif'
  },
  colors: {
    stage: {
      50: '#f4f7fb',
      100: '#e5ebf4',
      200: '#c5d2e3',
      300: '#9aafc9',
      400: '#6885aa',
      500: '#48658b',
      600: '#354d6e',
      700: '#293c57',
      800: '#1b293e',
      900: '#111827',
      950: '#090e18'
    },
    amber: {
      300: '#f6c453',
      400: '#e9aa2c',
      500: '#cb8818'
    }
  },
  styles: {
    global: {
      'html, body, #root, #app': {
        minHeight: '100%',
        margin: 0
      },
      body: {
        bg: 'stage.950',
        color: 'whiteAlpha.900',
        backgroundImage:
          'radial-gradient(circle at 15% -10%, rgba(59, 130, 246, .18), transparent 32rem), radial-gradient(circle at 88% 12%, rgba(245, 158, 11, .12), transparent 26rem)'
      },
      '::selection': {
        bg: 'amber.400',
        color: 'stage.950'
      }
    }
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'whiteAlpha'
      }
    },
    FormLabel: {
      baseStyle: {
        color: 'whiteAlpha.700',
        fontSize: 'xs',
        fontWeight: '600'
      }
    }
  }
});
