import React from 'react';
import { DropiMascot, DropiMood } from './DropiMascot';
import { useTetes } from '../state/TetesContext';

export interface MyDropiProps {
  mood?: DropiMood;
  size?: number;
  className?: string;
  onPoke?: () => void;
}

export const MyDropi: React.FC<MyDropiProps> = ({
  mood = 'happy',
  size = 140,
  className = '',
  onPoke,
}) => {
  const {
    data: { profile },
  } = useTetes();

  return (
    <DropiMascot
      mood={mood}
      size={size}
      className={className}
      color={profile.dropiColor}
      accessory={profile.dropiAccessory}
      onPoke={onPoke}
    />
  );
};
