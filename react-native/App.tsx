import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CareScreen } from './src/screens/CareScreen';
import { ConsentScreen } from './src/screens/ConsentScreen';
import { EmployerScreen } from './src/screens/EmployerScreen';
import { OverviewScreen } from './src/screens/OverviewScreen';
import { RecordsScreen } from './src/screens/RecordsScreen';
import { StoreProvider } from './src/store';
import { colors } from './src/theme';

export type TabParamList = {
  Overview: undefined;
  Records: undefined;
  Consent: undefined;
  Care: undefined;
  Employer: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const icons: Record<keyof TabParamList, React.ComponentProps<typeof Ionicons>['name']> = {
  Overview: 'pulse',
  Records: 'folder-open',
  Consent: 'shield-checkmark',
  Care: 'calendar',
  Employer: 'business',
};

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.brand,
    background: colors.appBackground,
    card: colors.appBackground,
    border: colors.cardBorder,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <NavigationContainer theme={theme}>
          <StatusBar style="light" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: colors.brand,
              tabBarInactiveTintColor: colors.secondary,
              tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} />,
            })}
          >
            <Tab.Screen name="Overview" component={OverviewScreen} />
            <Tab.Screen name="Records" component={RecordsScreen} />
            <Tab.Screen name="Consent" component={ConsentScreen} />
            <Tab.Screen name="Care" component={CareScreen} />
            <Tab.Screen name="Employer" component={EmployerScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
