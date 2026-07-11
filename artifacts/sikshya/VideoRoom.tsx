import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function VideoRoom() {
  return (
    <View style={styles.room}>
      <Text style={styles.text}>The Video Classroom is Ready!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  room: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 20,
  },
});