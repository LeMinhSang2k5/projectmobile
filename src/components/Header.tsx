import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type Props = {
  avatarUrl?: string | null;
  onAvatarPress?: () => void;
};

export default function Header({ avatarUrl, onAvatarPress }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.7}>
        <MaterialIcons name="menu" size={28} color={colors.primaryFixed} />
      </TouchableOpacity>

      <Text style={styles.title}>ELITE FIT</Text>

      <TouchableOpacity
        style={styles.avatarContainer}
        activeOpacity={0.8}
        onPress={onAvatarPress}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <MaterialIcons name="person" size={18} color={colors.primaryFixed} />
          </View>
        )}
        {/* Green dot indicator */}
        <View style={styles.onlineDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(18, 20, 20, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(68, 73, 52, 0.3)',
    zIndex: 50,
  },
  title: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 24,
    color: colors.primaryFixed,
    letterSpacing: -1,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'visible',
    borderWidth: 2,
    borderColor: colors.primaryFixed,
    position: 'relative',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(198,243,51,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ade80',
    borderWidth: 2,
    borderColor: 'rgba(18,20,20,1)',
  },
});
