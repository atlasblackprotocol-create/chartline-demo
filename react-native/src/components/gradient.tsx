import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { brandGradient } from '../theme';

/** A circle filled with the brand blue to mint gradient, used for the patient avatar. */
export function LinearGradientCircle({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
            {brandGradient.map((c, i) => <Stop key={c} offset={i / (brandGradient.length - 1)} stopColor={c} />)}
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#brand)" />
      </Svg>
      {children}
    </View>
  );
}
