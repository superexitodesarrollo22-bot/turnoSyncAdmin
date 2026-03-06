import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

const Stack = createStackNavigator();

interface OnboardingNavigatorProps {
    onComplete: () => void;
}

const OnboardingNavigator = ({ onComplete }: OnboardingNavigatorProps) => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                gestureEnabled: false,
                cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                        cardStyle: {
                            transform: [
                                {
                                    translateX: current.progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [layouts.screen.width, 0],
                                    }),
                                },
                            ],
                        },
                    };
                },
            }}
        >
            <Stack.Screen name="OnboardingMain">
                {(props) => <OnboardingScreen {...props} onComplete={onComplete} />}
            </Stack.Screen>
        </Stack.Navigator>
    );
};

export default OnboardingNavigator;
