import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import CreateScreen from "../screens/CreateScreen";
import ColoringScreen from "../screens/ColoringScreen";

export type RootStackParamList = {
  Home: undefined;
  Create: undefined;
  Coloring: { animalName: string; hybridKey: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Create" component={CreateScreen} />
        <Stack.Screen name="Coloring" component={ColoringScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}