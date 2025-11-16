import { MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  displayLarge: {
    fontFamily: 'System',
    fontSize: 57,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 64,
  },
  displayMedium: {
    fontFamily: 'System',
    fontSize: 45,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 52,
  },
  displaySmall: {
    fontFamily: 'System',
    fontSize: 36,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 44,
  },
  headlineLarge: {
    fontFamily: 'System',
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 40,
  },
  headlineMedium: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 36,
  },
  headlineSmall: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 32,
  },
  titleLarge: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 28,
  },
  titleMedium: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  titleSmall: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  bodyLarge: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.25,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.4,
    lineHeight: 16,
  },
  labelLarge: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
};

export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    // Primary colors - Orange theme like Shopee Food
    primary: '#FF6B35',
    primaryContainer: '#FFE8E0',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#2B1600',
    
    // Secondary colors
    secondary: '#FF8A65',
    secondaryContainer: '#FFDBCF',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#2B1600',
    
    // Tertiary colors
    tertiary: '#FFB74D',
    tertiaryContainer: '#FFE0B2',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#2B1600',
    
    // Surface colors
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    onSurface: '#1C1B1F',
    onSurfaceVariant: '#49454F',
    
    // Background colors
    background: '#FAFAFA',
    onBackground: '#1C1B1F',
    
    // Error colors
    error: '#FF5252',
    errorContainer: '#FFEBEE',
    onError: '#FFFFFF',
    onErrorContainer: '#2B1600',
    
    // Success colors
    success: '#4CAF50',
    successContainer: '#E8F5E8',
    onSuccess: '#FFFFFF',
    onSuccessContainer: '#1B5E20',
    
    // Warning colors
    warning: '#FF9800',
    warningContainer: '#FFF3E0',
    onWarning: '#FFFFFF',
    onWarningContainer: '#E65100',
    
    // Info colors
    info: '#2196F3',
    infoContainer: '#E3F2FD',
    onInfo: '#FFFFFF',
    onInfoContainer: '#0D47A1',
    
    // Status colors
    pending: '#FF9800',
    delivering: '#2196F3',
    completed: '#4CAF50',
    cancelled: '#F44336',
    
    // Gradient colors
    gradientStart: '#FF6B35',
    gradientEnd: '#FF8A65',
    
    // Shadow colors
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowDark: 'rgba(0, 0, 0, 0.2)',
    
    // Border colors
    border: '#E0E0E0',
    borderLight: '#F0F0F0',
    
    // Text colors
    textPrimary: '#1C1B1F',
    textSecondary: '#49454F',
    textTertiary: '#79747E',
    textDisabled: '#CAC4D0',
  },
  roundness: 12,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const shadows = {
  small: {
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6.27,
    elevation: 4,
  },
  large: {
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10.32,
    elevation: 8,
  },
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 50,
};
