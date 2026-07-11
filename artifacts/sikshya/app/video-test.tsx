import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ClassroomDoor from '../ClassroomDoor';

export default function VideoTestPage() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Welcome to your new classroom!</Text>
      
      {/* This brings the door we just built into this page! */}
      <ClassroomDoor />
      
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F8FF', // A very calming, light blue color
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333333',
  },
});